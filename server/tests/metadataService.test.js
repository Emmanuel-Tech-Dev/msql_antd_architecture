jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const { getLookupOptions, getTableMetadata } = require("../core/lib/metadataService");

const SCHEMAS = {
  admin_roles: ["id", "role_name", "description"],
  admin_resources: ["id", "resource", "resource_type", "resource_path"],
  staff_accounts: ["id", "name", "password"],
  admin_credentials: ["id", "password"],
};

const lookup = (overrides) => ({
  lookup_key: "roles",
  source_table: "admin_roles",
  value_column: "role_name",
  label_column: "role_name",
  extra_columns: null,
  base_filters: null,
  depends_on: null,
  filter_column: null,
  sort: [{ column: "role_name", direction: "ASC" }],
  max_rows: 500,
  required_permission: null,
  ...overrides,
});

function mockDatabase({ lookups = [], tables = [], fields = [], rows = [] } = {}) {
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes("FROM `metadata_lookups`")) {
      if (sql.includes("`lookup_key` IN")) {
        return [lookups.filter((row) => params.includes(row.lookup_key))
          .map(({ lookup_key, depends_on }) => ({ lookup_key, depends_on }))];
      }
      return [lookups.filter((row) => row.lookup_key === params[0])];
    }
    if (sql.includes("FROM `metadata_tables`")) return [tables.filter((row) => row.table_name === params[0])];
    if (sql.includes("FROM `tables_metadata`")) return [fields];
    if (sql.includes("information_schema.tables")) return [[{ count: SCHEMAS[params[0]] ? 1 : 0 }]];
    const described = sql.match(/^DESCRIBE `(\w+)`/);
    if (described) return [SCHEMAS[described[1]].map((Field) => ({ Field, Key: "" }))];
    return [rows];
  });
}

const sourceQuery = (table) => db.query.mock.calls.find(([sql]) => sql.includes(`FROM \`${table}\``));

beforeEach(() => db.query.mockReset());

describe("lookups", () => {
  test("options come only from the lookup definition, as value and label", async () => {
    mockDatabase({ lookups: [lookup()], rows: [{ role_name: "Auditor" }, { role_name: "User" }] });

    const options = await getLookupOptions("roles");

    expect(options).toEqual([{ value: "Auditor", label: "Auditor" }, { value: "User", label: "User" }]);
    expect(sourceQuery("admin_roles")).toEqual([
      "SELECT `role_name` FROM `admin_roles` ORDER BY `role_name` ASC LIMIT 500",
      [],
    ]);
  });

  test("a dependent lookup filters on the parent value, and is empty without one", async () => {
    const byType = lookup({
      lookup_key: "resources_by_type",
      source_table: "admin_resources",
      value_column: "resource",
      label_column: "resource_path",
      depends_on: "resource_type",
      filter_column: "resource_type",
      sort: null,
    });
    mockDatabase({ lookups: [byType], rows: [{ resource: "read:x", resource_path: "/api/x" }] });

    await expect(getLookupOptions("resources_by_type")).resolves.toEqual([]);
    expect(sourceQuery("admin_resources")).toBeUndefined();

    const options = await getLookupOptions("resources_by_type", { parent: "API_ENDPOINT" });
    expect(options).toEqual([{ value: "read:x", label: "/api/x" }]);
    expect(sourceQuery("admin_resources")).toEqual([
      "SELECT `resource`, `resource_path` FROM `admin_resources` WHERE `resource_type` = ? LIMIT 500",
      ["API_ENDPOINT"],
    ]);
  });

  test("a lookup with a required permission is refused without it, unless privileged", async () => {
    mockDatabase({ lookups: [lookup({ required_permission: "read:admin_roles" })], rows: [] });

    await expect(getLookupOptions("roles", { permissions: [] })).rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
    await expect(getLookupOptions("roles", { permissions: ["read:admin_roles"] })).resolves.toEqual([]);
    await expect(getLookupOptions("roles", { privileged: true })).resolves.toEqual([]);
  });

  test("unknown keys, sensitive columns and credential tables are refused", async () => {
    mockDatabase({
      lookups: [
        lookup({ lookup_key: "secrets", source_table: "staff_accounts", label_column: "password", value_column: "id" }),
        lookup({ lookup_key: "credentials", source_table: "admin_credentials", value_column: "id", label_column: "id" }),
      ],
    });

    await expect(getLookupOptions("nope")).rejects.toMatchObject({ errorCode: "ERR_NOT_FOUND" });
    await expect(getLookupOptions("bad key!")).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
    await expect(getLookupOptions("secrets")).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
    await expect(getLookupOptions("credentials")).rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
  });
});

describe("table metadata", () => {
  test("returns the table settings, its fields in order and the lookups they use", async () => {
    mockDatabase({
      tables: [{ table_name: "admin_role_permissions", label: "Admin role permissions", version: 1 }],
      fields: [
        { column_name: "role_id", type: "lookup", config: { lookup: "roles" } },
        { column_name: "permission", type: "lookup", config: { lookup: "permissions" } },
        { column_name: "createdAt", type: "dateTime", config: null },
      ],
      lookups: [lookup(), lookup({ lookup_key: "permissions" })],
    });

    const metadata = await getTableMetadata("admin_role_permissions");

    expect(metadata.table.label).toBe("Admin role permissions");
    expect(metadata.fields.map((field) => field.column_name)).toEqual(["role_id", "permission", "createdAt"]);
    expect(metadata.lookups).toEqual([
      { lookup_key: "roles", depends_on: null },
      { lookup_key: "permissions", depends_on: null },
    ]);
    const [fieldSql] = sourceQuery("tables_metadata");
    expect(fieldSql).toContain("WHERE `table_name` = ? ORDER BY `rank` ASC, `id` ASC");
  });

  test("a table that is not described is not found", async () => {
    mockDatabase();
    await expect(getTableMetadata("orders")).rejects.toMatchObject({ errorCode: "ERR_NOT_FOUND" });
  });
});
