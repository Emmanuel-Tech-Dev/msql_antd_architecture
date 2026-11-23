// Safety net for the metadata upgrade (phase 0): what the generic
// /api/:resources routes accept and refuse for the admin tables today.
// Later phases must keep these passing. Since phase 3, writes to a described
// table (an enabled metadata_tables row) are also checked against its
// metadata; the last group shows that change.

jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const validateTable = require("../core/middleware/validateTable");
const adminTablesMetadata = require("./fixtures/adminTablesMetadata.v2.json");
const BaseService = require("../core/lib/baseService");

const column = (Field, Key = "") => ({ Field, Key });
const SCHEMAS = {
  admin: [
    column("id", "PRI"), column("custom_id"), column("name"), column("email"),
    column("phone_no"), column("oauth_provider"), column("oauth_id"), column("avatar"),
    column("status"), column("last_login"), column("last_logout"),
    column("forced_password_change"), column("profile_picture"),
    column("createdAt"), column("updatedAt"),
  ],
  admin_roles: [
    column("id", "PRI"), column("role_name"), column("description"),
    column("is_system_role"), column("createdAt"), column("updatedAt"),
  ],
  admin_permissions: [
    column("id", "PRI"), column("permission_name"), column("description"),
    column("alias"), column("createdAt"), column("updatedAt"),
  ],
  admin_resources: [
    column("id", "PRI"), column("resource"), column("resource_type"),
    column("resource_path"), column("http_method"), column("description"),
    column("icon"), column("is_public"), column("display_order"),
    column("createdAt"), column("updatedAt"), column("category"), column("show_in_nav"),
  ],
  // A table holding a sensitive column, to show it never becomes writable.
  staff_accounts: [column("id", "PRI"), column("name"), column("password"), column("api_key")],
};

function mockDatabase({ describedTables = [] } = {}) {
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes("FROM `metadata_tables`")) {
      return [describedTables.includes(params[0]) ? [{ table_name: params[0] }] : []];
    }
    if (sql.includes("FROM `tables_metadata`")) {
      return [adminTablesMetadata.filter((field) => field.table_name === params[0])];
    }
    if (sql.includes("information_schema.tables")) {
      return [[{ count: SCHEMAS[params[0]] ? 1 : 0 }]];
    }
    const described = sql.match(/^DESCRIBE `(\w+)`/);
    if (described) return [SCHEMAS[described[1]]];
    if (sql.startsWith("INSERT") || sql.startsWith("UPDATE")) {
      return [{ insertId: 7, affectedRows: 1 }];
    }
    return [[]];
  });
}

async function resolve(table, id) {
  const req = { params: { resources: table, ...(id ? { id } : {}) }, query: {}, headers: {} };
  let failure;
  await validateTable(req, {}, (error) => { failure = error; });
  if (failure) throw failure;
  return req;
}

const writes = () => db.query.mock.calls.filter(([sql]) => /^(INSERT|UPDATE)/.test(sql));

beforeEach(() => {
  db.query.mockReset();
  mockDatabase();
});

describe("generic table access", () => {
  test.each(Object.keys(SCHEMAS).filter((table) => table.startsWith("admin")))(
    "%s is available, with every non-sensitive column and its primary key",
    async (table) => {
      const req = await resolve(table);
      expect(req.validatedResource.primaryKey).toBe("id");
      expect(req.validatedResource.fields).toEqual(SCHEMAS[table].map((entry) => entry.Field));
    },
  );

  test("sensitive columns are never readable or writable", async () => {
    const req = await resolve("staff_accounts");
    expect(req.validatedResource.fields).toEqual(["id", "name"]);
    await expect(new BaseService(req).create({ name: "Kofi", password: "x" }))
      .rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
  });

  test.each(["admin_credentials", "ui_settings", "token_blacklist", "system_settings", "framework_bootstrap_profiles"])(
    "%s is refused by the generic routes",
    async (table) => {
      await expect(resolve(table)).rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
    },
  );

  test("an unknown table is not found, and a malformed name is refused", async () => {
    await expect(resolve("no_such_table")).rejects.toMatchObject({ errorCode: "ERR_NOT_FOUND" });
    await expect(resolve("admin; DROP TABLE admin")).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
  });
});

describe("generic writes", () => {
  test("a create writes exactly the posted columns", async () => {
    const req = await resolve("admin_roles");
    await new BaseService(req).create({ role_name: "Auditor", description: "Reads reports" });

    const [[sql, params]] = writes();
    expect(sql).toBe("INSERT INTO `admin_roles` (`role_name`, `description`) VALUES (?, ?)");
    expect(params).toEqual(["Auditor", "Reads reports"]);
  });

  test("a column the table does not have is refused", async () => {
    const req = await resolve("admin_permissions");
    await expect(new BaseService(req).create({ permission_name: "read:x", owner: "me" }))
      .rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
    expect(writes()).toHaveLength(0);
  });

  test("an empty record or an array is refused", async () => {
    const req = await resolve("admin_roles");
    await expect(new BaseService(req).create({})).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
    await expect(new BaseService(req).create([{ role_name: "A" }])).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
  });

  test("an update never changes the primary key, and needs another field", async () => {
    const req = await resolve("admin_resources", "12");
    await new BaseService(req).updateRecord({ id: 99, icon: "TeamOutlined" });

    const [[sql, params]] = writes();
    expect(sql).toBe("UPDATE `admin_resources` SET `icon` = ? WHERE `id` = ?");
    expect(params).toEqual(["TeamOutlined", "12"]);

    await expect(new BaseService(req).updateRecord({ id: 99 }))
      .rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
  });

  test("bulk creates take 1 to 500 records, each checked like a single create", async () => {
    const req = await resolve("admin_permissions");
    const service = new BaseService(req);
    await expect(service.bulkCreate([])).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
    await expect(service.bulkCreate(Array.from({ length: 501 }, () => ({ permission_name: "p" }))))
      .rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
    await expect(service.bulkCreate([{ permission_name: "a" }, { nope: 1 }]))
      .rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
  });
});

describe("since phase 3: described tables are checked against their metadata", () => {
  test("an empty required name, a wrong type and an unlisted option are refused, field by field", async () => {
    mockDatabase({ describedTables: ["admin_resources"] });
    const req = await resolve("admin_resources");

    await expect(new BaseService(req).create({ resource: "", display_order: "first", http_method: "FETCH" }))
      .rejects.toMatchObject({
        errorCode: "ERR_VALIDATION_FAILED",
        metadata: {
          errors: {
            resource: "Resource Name is required",
            resource_path: "Path is required",
            resource_type: "Type is required",
            display_order: "Sidebar Order must be a number",
            http_method: "HTTP Method must be one of the listed options",
          },
        },
      });
    expect(writes()).toHaveLength(0);
  });

  test("a table that is not described still accepts any value for its columns", async () => {
    const req = await resolve("admin_resources");
    await new BaseService(req).create({ resource: "", display_order: "first", http_method: "FETCH" });

    const [[sql, params]] = writes();
    expect(sql).toBe("INSERT INTO `admin_resources` (`resource`, `display_order`, `http_method`) VALUES (?, ?, ?)");
    expect(params).toEqual(["", "first", "FETCH"]);
  });
});
