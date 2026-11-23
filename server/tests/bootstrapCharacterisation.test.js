// Safety net for the metadata upgrade (phase 0): what sign-in loads today.
// Phase 1 replaces the request (a profile key instead of a table list) but
// must keep returning the same stores, columns and filters.

jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const BaseService = require("../core/lib/baseService");

const SCHEMAS = {
  tables_metadata: ["id", "table_name", "column_name", "col_real_name", "type", "options", "extra_options",
    "backend_visible", "frontend_visible", "editable", "validator", "icon", "rank", "createdAt", "updatedAt",
    "group_name", "disabled"],
  admin_resources: ["id", "resource", "resource_type", "resource_path", "http_method", "description", "icon",
    "is_public", "display_order", "createdAt", "updatedAt", "category", "show_in_nav"],
  admin_permissions: ["id", "permission_name", "description", "alias", "createdAt", "updatedAt"],
  ui_settings: ["id", "setting_key", "setting_value", "description", "is_active", "version", "updated_by",
    "createdAt", "updatedAt"],
};

// The request FrameworkProvider.jsx sends after sign-in.
const STARTUP_REQUEST = {
  tables: [
    { table: "tables_metadata", storeName: "tables_metadata", fields: ["*"] },
    { table: "admin_resources", storeName: "admin_resources", fields: ["*"] },
    { table: "admin_permissions", storeName: "permissions", fields: ["*"] },
    {
      table: "ui_settings",
      storeName: "ui_settings",
      fields: ["id", "setting_key", "setting_value", "description", "is_active", "version"],
      filters: [
        { column: "setting_key", operator: "=", value: "layout.sider" },
        { column: "is_active", operator: "=", value: 1 },
      ],
    },
  ],
};

beforeEach(() => {
  db.query.mockReset();
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes("information_schema.tables")) return [[{ count: SCHEMAS[params[0]] ? 1 : 0 }]];
    const described = sql.match(/^DESCRIBE `(\w+)`/);
    if (described) {
      return [SCHEMAS[described[1]].map((Field) => ({ Field, Key: Field === "id" ? "PRI" : "" }))];
    }
    return [[{ id: 1 }]];
  });
});

const selects = () => db.query.mock.calls.filter(([sql]) => sql.startsWith("SELECT `"));

describe("authenticated startup data", () => {
  test("loads four stores, each with its columns, filters and row limit", async () => {
    const service = new BaseService({ roles: [{ role_id: "User" }], permissions: [] });
    const result = await service.bootstrap(STARTUP_REQUEST);

    expect(Object.keys(result)).toEqual(["tables_metadata", "admin_resources", "permissions", "ui_settings"]);
    expect(selects().map(([sql, params]) => [sql, params])).toEqual([
      [`SELECT ${SCHEMAS.tables_metadata.map((c) => `\`${c}\``).join(", ")} FROM \`tables_metadata\` LIMIT 1000`, []],
      [`SELECT ${SCHEMAS.admin_resources.map((c) => `\`${c}\``).join(", ")} FROM \`admin_resources\` LIMIT 1000`, []],
      [`SELECT ${SCHEMAS.admin_permissions.map((c) => `\`${c}\``).join(", ")} FROM \`admin_permissions\` LIMIT 1000`, []],
      [
        "SELECT `id`, `setting_key`, `setting_value`, `description`, `is_active`, `version` FROM `ui_settings` WHERE `setting_key` = ? AND `is_active` = ? LIMIT 1000",
        ["layout.sider", 1],
      ],
    ]);
  });

  test("the core stores need no permission, other tables need read:<table>", async () => {
    const service = new BaseService({ roles: [{ role_id: "User" }], permissions: [] });
    await expect(service.bootstrap({ tables: [{ table: "admin_roles" }] }))
      .rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
  });
});
