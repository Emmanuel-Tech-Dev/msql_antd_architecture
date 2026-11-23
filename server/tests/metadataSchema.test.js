jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const { metadataSchema, validateRecordAgainstMetadata } = require("../core/lib/metadataSchema");

const field = (column_name, type, overrides = {}) => ({
  column_name,
  col_real_name: overrides.label ?? column_name,
  type,
  editable: 1,
  disabled: 0,
  required: 0,
  config: null,
  ...overrides,
});

const TAXES = [
  field("id", "primaryKey"),
  field("name", "text", { label: "Name", required: 1, config: { rules: [{ rule: "minLength", value: 2 }] } }),
  field("code", "text", { label: "Code", editable: 0, config: { rules: [{ rule: "pattern", value: "^[A-Z]{3}$", message: "Code is three capital letters" }] } }),
  field("rate", "number", { label: "Rate", config: { min: 0, max: 100 } }),
  field("kind", "select", { label: "Kind", config: { options: [{ value: "VAT", label: "VAT" }, { value: "LEVY", label: "Levy" }] } }),
  field("levy_body", "text", { label: "Levy body", config: { visibleWhen: { field: "kind", in: ["LEVY"] }, requiredWhen: { field: "kind", in: ["LEVY"] } } }),
  field("contact", "email", { label: "Contact" }),
  field("internal_note", "text", { disabled: 1 }),
  field("owner_role", "lookup", { label: "Owner role", config: { lookup: "roles" } }),
];

const ROLES_LOOKUP = {
  lookup_key: "roles", source_table: "admin_roles", value_column: "role_name", label_column: "role_name",
  extra_columns: null, base_filters: null, depends_on: null, filter_column: null, sort: null, max_rows: 500,
  required_permission: "read:admin_roles",
};

function mockMetadata({ described = true, fields = TAXES, roles = ["Auditor", "User"] } = {}) {
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes("FROM `metadata_tables`")) return [described ? [{ table_name: params[0] }] : []];
    if (sql.includes("FROM `tables_metadata`")) return [fields];
    if (sql.includes("FROM `metadata_lookups`")) return [[ROLES_LOOKUP]];
    if (sql.includes("information_schema.tables")) return [[{ count: 1 }]];
    if (sql.startsWith("DESCRIBE `admin_roles`")) return [[{ Field: "id" }, { Field: "role_name" }]];
    if (sql.includes("FROM `admin_roles`")) return [roles.filter((role) => params.includes(role)).map((role_name) => ({ role_name }))];
    return [[]];
  });
}

beforeEach(() => db.query.mockReset());

describe("server-side metadata checks", () => {
  test("a valid record comes back cleaned: numbers coerced, read-only fields dropped", async () => {
    mockMetadata();
    const { record, errors } = await validateRecordAgainstMetadata("taxes", {
      id: 9, name: "Standard VAT", code: "VAT", rate: "15", kind: "VAT", contact: "tax@example.com",
      internal_note: "never written", owner_role: "Auditor",
    });

    expect(errors).toEqual({});
    expect(record).toEqual({ name: "Standard VAT", code: "VAT", rate: 15, kind: "VAT", contact: "tax@example.com", owner_role: "Auditor" });
  });

  test("each broken rule comes back as a message for its field", async () => {
    mockMetadata();
    const { errors } = await validateRecordAgainstMetadata("taxes", {
      name: "V", code: "vat", rate: 120, kind: "SALES", contact: "not-an-email", owner_role: "Ghost",
    });

    expect(errors).toEqual({
      name: "Name needs at least 2 characters",
      code: "Code is three capital letters",
      rate: "Rate must be at most 100",
      kind: "Kind must be one of the listed options",
      contact: "Contact must be a valid email address",
      owner_role: "Owner role must be one of the available choices",
    });
  });

  test("a lookup value must exist in the lookup's source", async () => {
    mockMetadata();
    const { errors } = await validateRecordAgainstMetadata("taxes", { name: "Levy", owner_role: "Ghost" });
    expect(errors).toEqual({ owner_role: "Owner role must be one of the available choices" });
  });

  test("required fields: every one on create, only the ones sent on update", async () => {
    mockMetadata();
    await expect(validateRecordAgainstMetadata("taxes", { rate: 5 }))
      .resolves.toMatchObject({ errors: { name: "Name is required" } });

    await expect(validateRecordAgainstMetadata("taxes", { rate: 5 }, { mode: "update", existing: { name: "VAT" } }))
      .resolves.toMatchObject({ errors: {} });
    await expect(validateRecordAgainstMetadata("taxes", { name: " " }, { mode: "update", existing: { name: "VAT" } }))
      .resolves.toMatchObject({ errors: { name: "Name is required" } });
  });

  test("a field is required only while its condition holds, using the stored record on update", async () => {
    mockMetadata();
    await expect(validateRecordAgainstMetadata("taxes", { name: "Road levy", kind: "LEVY" }))
      .resolves.toMatchObject({ errors: { levy_body: "Levy body is required" } });
    await expect(validateRecordAgainstMetadata("taxes", { name: "VAT", kind: "VAT" }))
      .resolves.toMatchObject({ errors: {} });
    await expect(validateRecordAgainstMetadata("taxes", { levy_body: "" }, { mode: "update", existing: { name: "Road levy", kind: "LEVY" } }))
      .resolves.toMatchObject({ errors: { levy_body: "Levy body is required" } });
  });

  test("a field that is not editable can be set on create but is dropped on update", async () => {
    mockMetadata();
    const created = await validateRecordAgainstMetadata("taxes", { name: "VAT", code: "VAT" });
    expect(created.record).toEqual({ name: "VAT", code: "VAT" });

    const updated = await validateRecordAgainstMetadata("taxes", { code: "NEW", rate: 10 }, { mode: "update" });
    expect(updated.record).toEqual({ rate: 10 });
  });

  test("a table without an enabled metadata_tables row is left unchecked", async () => {
    mockMetadata({ described: false });
    const record = { anything: "goes" };
    await expect(validateRecordAgainstMetadata("orders", record)).resolves.toEqual({ record, errors: {} });
    await expect(metadataSchema("orders")).resolves.toBeNull();
  });

  test("hand-written routes can reuse the schema and extend it", async () => {
    mockMetadata();
    const schema = (await metadataSchema("taxes")).refine((tax) => tax.kind !== "LEVY" || tax.rate <= 5, {
      message: "A levy is at most 5%", path: ["rate"],
    });
    const result = schema.safeParse({ name: "Road levy", kind: "LEVY", levy_body: "Ministry", rate: 8 });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("A levy is at most 5%");
  });
});
