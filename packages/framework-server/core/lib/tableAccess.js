// Table access: the one place that knows which API endpoints each action on a
// table needs. The Permissions page's "Grant table access" and the data-model
// builder's new-table migration both use it, so every table is wired the same.
const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");
const { SENSITIVE_TABLES } = require("../config/sensitiveData");

// The generic routes of baseRoute.js, by action. `key` names the endpoint row:
// read:invoices:table, create:invoices:bulk, …
const TABLE_ACTIONS = {
  read: [
    { key: "list", method: "GET", path: "" },
    { key: "table", method: "GET", path: "/table" },
    { key: "filters", method: "GET", path: "/filters" },
    { key: "query", method: "POST", path: "/query" },
    { key: "by_id", method: "GET", path: "/:id" },
  ],
  create: [
    { key: "one", method: "POST", path: "" },
    { key: "bulk", method: "POST", path: "/bulk" },
  ],
  update: [{ key: "by_id", method: "PUT", path: "/:id" }],
  delete: [
    { key: "by_id", method: "DELETE", path: "/:id" },
    { key: "many", method: "DELETE", path: "" },
  ],
};
const ACTIONS = Object.keys(TABLE_ACTIONS);
const CUSTOM_ACTION = /^[a-z][a-z0-9_]{0,40}$/;

// The framework's own tables are never granted from here, whatever their
// is_system flag says: access to them is managed on their own screens.
const FRAMEWORK_TABLE = /^(admin|admin_.*|metadata_.*|framework_.*|tables_metadata|system_resources|system_settings|ui_settings|access_table_grants)$/;

const isGrantableTable = (table) => utils.isIdentifier(table) && !SENSITIVE_TABLES.has(table) && !FRAMEWORK_TABLE.test(table);

// The endpoint rows an action on a table needs.
function endpointsFor(table, action) {
  return (TABLE_ACTIONS[action] ?? []).map((endpoint) => ({
    resource: `${action}:${table}:${endpoint.key}`,
    method: endpoint.method,
    path: `/api/${table}${endpoint.path}`,
  }));
}

// "export, approve" or ["export"] → ["export", "approve"]; rejects bad names.
function parseCustomActions(value) {
  const names = [...new Set(utils.uniqueIds(Array.isArray(value) ? value : String(value ?? "").split(",")).map((name) => name.toLowerCase()))];
  const invalid = names.filter((name) => !CUSTOM_ACTION.test(name));
  if (invalid.length) {
    throw new AppError("ERR_VALIDATION_FAILED", "Custom actions use lower-case letters, digits and _, starting with a letter", {
      errors: { custom_actions: `Not allowed: ${invalid.join(", ")}` },
    });
  }
  return names.filter((name) => !ACTIONS.includes(name));
}

// What a grant would create, given what already exists. `select(table, columns,
// where)` reads through the caller's connection (a transaction when granting).
async function planTableAccess({ tables, actions, customActions }, select) {
  const chosenActions = ACTIONS.filter((action) => actions.includes(action));
  const permissions = [];
  const endpoints = [];
  for (const table of tables) {
    for (const action of chosenActions) {
      permissions.push({ table, action, permission: `${action}:${table}`, endpoints: endpointsFor(table, action) });
      endpoints.push(...endpointsFor(table, action));
    }
    for (const action of customActions) {
      permissions.push({ table, action, permission: `${action}:${table}`, endpoints: [], custom: true });
    }
  }
  if (!permissions.length) return { tables: [], totals: { newPermissions: 0, newEndpoints: 0, newLinks: 0, unchanged: 0 } };

  const permissionNames = permissions.map((row) => row.permission);
  const existingPermissions = new Set((await select("admin_permissions", ["permission_name"], ["permission_name", permissionNames]))
    .map((row) => row.permission_name));
  const existingEndpoints = endpoints.length
    ? await select("admin_resources", ["resource", "resource_path", "http_method"], ["resource_path", [...new Set(endpoints.map((e) => e.path))]])
    : [];
  const endpointAt = new Map(existingEndpoints.map((row) => [`${row.http_method} ${row.resource_path}`, row.resource]));
  const takenNames = new Map(existingEndpoints.map((row) => [row.resource, `${row.http_method} ${row.resource_path}`]));
  const existingLinks = new Set((await select("admin_permission_resources", ["permission", "resource"], ["permission", permissionNames]))
    .map((row) => `${row.permission} ${row.resource}`));

  const totals = { newPermissions: 0, newEndpoints: 0, newLinks: 0, unchanged: 0 };
  const rows = permissions.map((row) => {
    const isNew = !existingPermissions.has(row.permission);
    const links = row.endpoints.map((endpoint) => {
      const existing = endpointAt.get(`${endpoint.method} ${endpoint.path}`);
      if (!existing && takenNames.has(endpoint.resource)) {
        throw new AppError("ERR_CONFLICT", `The endpoint name ${endpoint.resource} is already used for ${takenNames.get(endpoint.resource)}`);
      }
      const resource = existing ?? endpoint.resource;
      return { ...endpoint, resource, createEndpoint: !existing, createLink: !existingLinks.has(`${row.permission} ${resource}`) };
    });
    const missing = links.filter((link) => link.createLink).length;
    totals.newPermissions += isNew ? 1 : 0;
    totals.newEndpoints += links.filter((link) => link.createEndpoint).length;
    totals.newLinks += missing;
    const status = isNew ? "new" : missing ? "repair" : "unchanged";
    if (status === "unchanged") totals.unchanged += 1;
    return { ...row, status, endpointCount: row.endpoints.length, missingLinks: missing, links };
  });

  const byTable = tables.map((table) => ({ table, permissions: rows.filter((row) => row.table === table) }));
  return { tables: byTable, totals };
}

// Inserts what the plan says is missing, inside the caller's transaction.
async function applyTableAccess(plan, { labels, run }) {
  const permissions = plan.tables.flatMap((entry) => entry.permissions);
  const newPermissions = permissions.filter((row) => row.status === "new").map((row) => ({
    permission_name: row.permission,
    description: `${utils.humanize(row.action)} ${labels[row.table] ?? row.table}`,
  }));
  // Each (table, action) is planned once, so every endpoint row appears once.
  const newEndpoints = permissions.flatMap((row) => row.links).filter((link) => link.createEndpoint)
    .map((link) => ({
      resource: link.resource,
      resource_type: "API_ENDPOINT",
      resource_path: link.path,
      http_method: link.method,
      description: `${link.method} ${link.path}`,
      is_public: 0,
      display_order: 0,
      category: "Data API",
      show_in_nav: 0,
    }));
  const newLinks = permissions.flatMap((row) => row.links.filter((link) => link.createLink)
    .map((link) => ({ permission: row.permission, resource: link.resource, resource_type: "API_ENDPOINT" })));

  if (newPermissions.length) await run((builder) => builder.bulkInsert("admin_permissions", newPermissions));
  if (newEndpoints.length) await run((builder) => builder.bulkInsert("admin_resources", newEndpoints));
  if (newLinks.length) await run((builder) => builder.bulkInsert("admin_permission_resources", newLinks));
  return { permissions: newPermissions.length, endpoints: newEndpoints.length, links: newLinks.length };
}

module.exports = {
  ACTIONS,
  TABLE_ACTIONS,
  applyTableAccess,
  endpointsFor,
  isGrantableTable,
  parseCustomActions,
  planTableAccess,
};
