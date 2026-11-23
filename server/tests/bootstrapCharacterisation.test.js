// Safety net for the metadata upgrade (phase 0): what sign-in loads.
// Since phase 1 the browser names a profile and the server reads the
// bootstrap registry, but the stores, columns and filters are the same as the
// table list the browser used to send. Row limits are the registry's
// max_rows: never lower than the old 1000, except the single appearance row.

jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const { loadBootstrapProfile } = require("../core/lib/bootstrapService");

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

// The registry rows after migrations 001 and 019.
const REGISTRY = [
  { dataset_key: "tables_metadata", source_name: "tables_metadata", columns_json: SCHEMAS.tables_metadata, max_rows: 2000 },
  { dataset_key: "admin_resources", source_name: "admin_resources", columns_json: SCHEMAS.admin_resources, max_rows: 1000 },
  { dataset_key: "permissions", source_name: "admin_permissions", columns_json: SCHEMAS.admin_permissions, max_rows: 1000 },
  {
    dataset_key: "ui_settings",
    source_name: "ui_settings",
    columns_json: ["id", "setting_key", "setting_value", "description", "is_active", "version"],
    base_filters_json: [{ column: "setting_key", value: "layout.sider" }, { column: "is_active", value: 1 }],
    max_rows: 10,
    failure_mode: "OPTIONAL",
  },
].map((dataset) => ({
  base_filters_json: null,
  default_sort_json: null,
  required_permission: null,
  failure_mode: "REQUIRED",
  ...dataset,
}));

beforeEach(() => {
  db.query.mockReset();
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.startsWith("SELECT `id` FROM `framework_bootstrap_profiles`")) return [[{ id: 1 }]];
    if (sql.includes("FROM `framework_bootstrap_datasets`")) return [REGISTRY];
    if (sql.includes("information_schema.tables")) return [[{ count: SCHEMAS[params[0]] ? 1 : 0 }]];
    const described = sql.match(/^DESCRIBE `(\w+)`/);
    if (described) {
      return [SCHEMAS[described[1]].map((Field) => ({ Field, Key: Field === "id" ? "PRI" : "" }))];
    }
    return [[{ id: 1 }]];
  });
});

const quoted = (columns) => columns.map((column) => `\`${column}\``).join(", ");
const dataSelects = () => db.query.mock.calls
  .filter(([sql]) => sql.startsWith("SELECT `") && !sql.includes("framework_bootstrap"))
  .map(([sql, params]) => [sql, params]);

describe("authenticated startup data", () => {
  test("loads four stores, each with its columns, filters and row limit", async () => {
    const { stores, unavailable } = await loadBootstrapProfile("authenticated_startup", { permissions: [] });

    expect(unavailable).toEqual([]);
    expect(Object.keys(stores)).toEqual(["tables_metadata", "admin_resources", "permissions", "ui_settings"]);
    expect(dataSelects()).toEqual([
      [`SELECT ${quoted(SCHEMAS.tables_metadata)} FROM \`tables_metadata\` LIMIT 2000`, []],
      [`SELECT ${quoted(SCHEMAS.admin_resources)} FROM \`admin_resources\` LIMIT 1000`, []],
      [`SELECT ${quoted(SCHEMAS.admin_permissions)} FROM \`admin_permissions\` LIMIT 1000`, []],
      [
        "SELECT `id`, `setting_key`, `setting_value`, `description`, `is_active`, `version` FROM `ui_settings` WHERE `setting_key` = ? AND `is_active` = ? LIMIT 10",
        ["layout.sider", 1],
      ],
    ]);
  });
});
