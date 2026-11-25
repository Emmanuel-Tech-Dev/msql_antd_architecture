jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const { loadBootstrapProfile } = require("../core/lib/bootstrapService");

const SCHEMAS = {
  reports: ["id", "title", "owner_id", "is_active"],
  staff_accounts: ["id", "name", "password"],
  admin_credentials: ["id", "password"],
};

const dataset = (overrides) => ({
  dataset_key: "reports",
  source_name: "reports",
  columns_json: ["id", "title"],
  base_filters_json: null,
  default_sort_json: null,
  max_rows: 50,
  required_permission: null,
  failure_mode: "REQUIRED",
  ...overrides,
});

function mockRegistry(datasets, { profileExists = true } = {}) {
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.startsWith("SELECT `id` FROM `framework_bootstrap_profiles`")) return [profileExists ? [{ id: 4 }] : []];
    if (sql.includes("FROM `framework_bootstrap_datasets`")) return [datasets];
    if (sql.includes("information_schema.tables")) return [[{ count: SCHEMAS[params[0]] ? 1 : 0 }]];
    const described = sql.match(/^DESCRIBE `(\w+)`/);
    if (described) return [SCHEMAS[described[1]].map((Field) => ({ Field, Key: "" }))];
    return [[{ id: 1, title: "Q3" }]];
  });
}

const registryQueries = () => db.query.mock.calls.filter(([sql]) => sql.includes("framework_bootstrap"));

const ORIGINAL_ENV = process.env.NODE_ENV;
beforeEach(() => db.query.mockReset());
afterEach(() => { process.env.NODE_ENV = ORIGINAL_ENV; });

describe("bootstrap registry", () => {
  test("reads only the enabled profile and datasets for this environment, in load order", async () => {
    process.env.NODE_ENV = "production";
    mockRegistry([dataset()]);

    await loadBootstrapProfile("authenticated_startup");

    const [[profileSql, profileParams], [datasetSql, datasetParams]] = registryQueries();
    expect(profileSql).toBe("SELECT `id` FROM `framework_bootstrap_profiles` WHERE `profile_key` = ? AND `enabled` = ? AND `environment` IN (?, ?)");
    expect(profileParams).toEqual(["authenticated_startup", 1, "all", "prod"]);
    expect(datasetSql).toContain("WHERE `framework_bootstrap_profile_datasets`.`profile_id` = ? AND `framework_bootstrap_profile_datasets`.`enabled` = ? AND `framework_bootstrap_datasets`.`enabled` = ? AND `framework_bootstrap_datasets`.`environment` IN (?, ?)");
    expect(datasetSql).toContain("ORDER BY `framework_bootstrap_profile_datasets`.`load_order` ASC");
    expect(datasetParams).toEqual([4, 1, 1, "all", "prod"]);
  });

  test("applies the registered columns, fixed filters, sort and row limit", async () => {
    mockRegistry([dataset({
      base_filters_json: [{ column: "is_active", value: 1 }],
      default_sort_json: [{ column: "title", direction: "DESC" }],
    })]);

    const { stores } = await loadBootstrapProfile("authenticated_startup");

    expect(stores).toEqual({ reports: [{ id: 1, title: "Q3" }] });
    const dataQuery = db.query.mock.calls.find(([sql]) => sql.startsWith("SELECT `id`, `title`"));
    expect(dataQuery).toEqual([
      "SELECT `id`, `title` FROM `reports` WHERE `is_active` = ? ORDER BY `title` DESC LIMIT 50",
      [1],
    ]);
  });

  test("an unknown profile or a missing key is refused", async () => {
    mockRegistry([], { profileExists: false });
    await expect(loadBootstrapProfile("someone_elses_profile")).rejects.toMatchObject({ errorCode: "ERR_NOT_FOUND" });
    await expect(loadBootstrapProfile(undefined)).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
    await expect(loadBootstrapProfile("x; DROP TABLE admin")).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
  });

  test("a sensitive or missing column is never loaded, even when registered", async () => {
    mockRegistry([dataset({ source_name: "staff_accounts", columns_json: ["id", "password"] })]);
    await expect(loadBootstrapProfile("authenticated_startup")).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });

    mockRegistry([dataset({ columns_json: ["id", "salary"] })]);
    await expect(loadBootstrapProfile("authenticated_startup")).rejects.toMatchObject({ errorCode: "ERR_INVALID_INPUT" });
  });

  test("credential tables are never a bootstrap source", async () => {
    mockRegistry([dataset({ source_name: "admin_credentials", columns_json: ["id"] })]);
    await expect(loadBootstrapProfile("authenticated_startup")).rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
  });

  test("a dataset with a required permission loads only for holders and privileged users", async () => {
    const guarded = dataset({ required_permission: "read:reports" });
    mockRegistry([guarded]);
    await expect(loadBootstrapProfile("authenticated_startup", { permissions: [] }))
      .rejects.toMatchObject({ errorCode: "ERR_ACCESS_DENIED" });
    await expect(loadBootstrapProfile("authenticated_startup", { permissions: ["read:reports"] }))
      .resolves.toMatchObject({ stores: { reports: [{ id: 1, title: "Q3" }] } });
    await expect(loadBootstrapProfile("authenticated_startup", { privileged: true }))
      .resolves.toMatchObject({ stores: { reports: [{ id: 1, title: "Q3" }] } });
  });

  test("an OPTIONAL dataset that fails is left out and reported; the others still load", async () => {
    mockRegistry([
      dataset(),
      dataset({ dataset_key: "audit", source_name: "missing_table", failure_mode: "OPTIONAL" }),
    ]);

    const { stores, unavailable } = await loadBootstrapProfile("authenticated_startup");

    expect(Object.keys(stores)).toEqual(["reports"]);
    expect(unavailable).toEqual(["audit"]);
  });

  test("a REQUIRED dataset that fails fails the whole request", async () => {
    mockRegistry([dataset({ source_name: "missing_table" }), dataset({ dataset_key: "later" })]);
    await expect(loadBootstrapProfile("authenticated_startup")).rejects.toMatchObject({ errorCode: "ERR_NOT_FOUND" });
  });
});
