const { applyTableAccess, endpointsFor, isGrantableTable, parseCustomActions, planTableAccess } = require("../core/lib/tableAccess");

// An in-memory stand-in for the three access tables.
function fakeDatabase({ permissions = [], resources = [], links = [] } = {}) {
  const data = { admin_permissions: permissions, admin_resources: resources, admin_permission_resources: links };
  const select = async (table, columns, [column, values]) =>
    data[table].filter((row) => values.includes(row[column])).map((row) => Object.fromEntries(columns.map((c) => [c, row[c]])));
  return { data, select };
}

describe("table access", () => {
  test("each action has the generic routes' endpoints, named like the seed", () => {
    expect(endpointsFor("invoices", "read").map((e) => `${e.resource} ${e.method} ${e.path}`)).toEqual([
      "read:invoices:list GET /api/invoices",
      "read:invoices:table GET /api/invoices/table",
      "read:invoices:filters GET /api/invoices/filters",
      "read:invoices:query POST /api/invoices/query",
      "read:invoices:by_id GET /api/invoices/:id",
    ]);
    expect(endpointsFor("invoices", "create").map((e) => e.resource)).toEqual(["create:invoices:one", "create:invoices:bulk"]);
    expect(endpointsFor("invoices", "update")).toEqual([{ resource: "update:invoices:by_id", method: "PUT", path: "/api/invoices/:id" }]);
    expect(endpointsFor("invoices", "delete").map((e) => `${e.method} ${e.path}`)).toEqual(["DELETE /api/invoices/:id", "DELETE /api/invoices"]);
  });

  test("the framework's own and sensitive tables are never grantable", () => {
    expect(["invoices", "volunteer"].every(isGrantableTable)).toBe(true);
    expect(["admin", "admin_user_roles", "admin_role_permissions", "metadata_lookups", "tables_metadata", "admin_credentials", "token_blacklist", "framework_bootstrap_profiles", "1bad"].some(isGrantableTable)).toBe(false);
  });

  test("custom actions: comma-separated, lower case, built-in names dropped", () => {
    expect(parseCustomActions("export, approve, export, read")).toEqual(["export", "approve"]);
    expect(parseCustomActions("")).toEqual([]);
    expect(() => parseCustomActions("Export Now")).toThrow("Custom actions use lower-case letters");
  });

  test("a plan marks new, missing-endpoint and unchanged permissions", async () => {
    const db = fakeDatabase({
      permissions: [{ permission_name: "read:invoices" }, { permission_name: "create:invoices" }],
      resources: [
        ...endpointsFor("invoices", "read").map((e) => ({ resource: e.resource, resource_path: e.path, http_method: e.method })),
        { resource: "Create invoice", resource_path: "/api/invoices", http_method: "POST" },
      ],
      links: [
        ...endpointsFor("invoices", "read").map((e) => ({ permission: "read:invoices", resource: e.resource })),
        { permission: "create:invoices", resource: "Create invoice" },
      ],
    });
    const plan = await planTableAccess({ tables: ["invoices"], actions: ["read", "create", "update"], customActions: ["export"] }, db.select);
    const rows = Object.fromEntries(plan.tables[0].permissions.map((row) => [row.permission, row]));

    expect(rows["read:invoices"].status).toBe("unchanged");
    expect(rows["create:invoices"]).toMatchObject({ status: "repair", missingLinks: 1 });
    // The existing POST /api/invoices row is reused under its own name.
    expect(rows["create:invoices"].links.find((l) => l.method === "POST" && l.path === "/api/invoices")).toMatchObject({ resource: "Create invoice", createEndpoint: false, createLink: false });
    expect(rows["update:invoices"]).toMatchObject({ status: "new", endpointCount: 1 });
    expect(rows["export:invoices"]).toMatchObject({ status: "new", custom: true, endpointCount: 0 });
    expect(plan.totals).toEqual({ newPermissions: 2, newEndpoints: 2, newLinks: 2, unchanged: 1 });
  });

  test("applying inserts only what is missing, and a second plan finds nothing to do", async () => {
    const db = fakeDatabase();
    const grant = { tables: ["volunteer"], actions: ["read", "delete"], customActions: ["approve"] };
    const plan = await planTableAccess(grant, db.select);
    const run = async (build) => {
      const inserted = [];
      build({ bulkInsert: (table, rows) => inserted.push([table, rows]) });
      for (const [table, rows] of inserted) db.data[table].push(...rows);
    };
    const created = await applyTableAccess(plan, { labels: { volunteer: "Volunteers" }, run });

    expect(created).toEqual({ permissions: 3, endpoints: 7, links: 7 });
    expect(db.data.admin_permissions.map((row) => [row.permission_name, row.description])).toEqual([
      ["read:volunteer", "Read Volunteers"], ["delete:volunteer", "Delete Volunteers"], ["approve:volunteer", "Approve Volunteers"],
    ]);
    const again = await planTableAccess(grant, db.select);
    expect(again.totals).toEqual({ newPermissions: 0, newEndpoints: 0, newLinks: 0, unchanged: 3 });
  });

  test("an endpoint name already used for another path is a conflict, not a silent mislink", async () => {
    const db = fakeDatabase({ resources: [{ resource: "update:volunteer:by_id", resource_path: "/api/other/:id", http_method: "PUT" }] });
    // The taken name is only seen when its row is read; the plan reads by path.
    db.data.admin_resources[0].resource_path = "/api/volunteer/:id";
    db.data.admin_resources[0].http_method = "PATCH";
    await expect(planTableAccess({ tables: ["volunteer"], actions: ["update"], customActions: [] }, db.select))
      .rejects.toThrow("The endpoint name update:volunteer:by_id is already used for PATCH /api/volunteer/:id");
  });
});
