const { definitionMigration, describeChanges, guessField, newTableMigration } = require("../core/lib/metadataScaffold");

const column = (COLUMN_NAME, COLUMN_TYPE, extra = {}) => ({
  COLUMN_NAME,
  COLUMN_TYPE,
  DATA_TYPE: COLUMN_TYPE.replace(/\(.*$/, "").replace(/ unsigned$/, ""),
  IS_NULLABLE: "YES",
  COLUMN_KEY: "",
  COLUMN_DEFAULT: null,
  EXTRA: "",
  ...extra,
});
const guessed = (...args) => guessField(column(...args)).field;

describe("guessing a field from a column", () => {
  test("types from the column's type and name", () => {
    expect(guessed("id", "bigint unsigned", { COLUMN_KEY: "PRI", EXTRA: "auto_increment", IS_NULLABLE: "NO" }))
      .toMatchObject({ type: "primaryKey", form_visible: 0, required: 0 });
    expect(guessed("status", "enum('DONE','FAILED')", { IS_NULLABLE: "NO" })).toMatchObject({
      type: "select", required: 1, config: { options: [{ value: "DONE", label: "Done" }, { value: "FAILED", label: "Failed" }] },
    });
    expect(guessed("is_active", "tinyint(1)").type).toBe("switch");
    expect(guessed("display_order", "int").type).toBe("integer");
    expect(guessed("credit_limit", "decimal(14,2)").type).toBe("money");
    expect(guessed("weight", "decimal(8,3)").type).toBe("number");
    expect(guessed("notes", "text")).toMatchObject({ type: "textarea", list_visible: 0 });
    expect(guessed("contact_email", "varchar(255)").type).toBe("email");
    expect(guessed("phone_no", "varchar(20)").type).toBe("phone");
    expect(guessed("logo", "varchar(500)").type).toBe("image");
    expect(guessed("contract_file", "varchar(500)").type).toBe("file");
    expect(guessed("file_name", "varchar(160)").type).toBe("text");
    expect(guessed("createdAt", "datetime", { COLUMN_DEFAULT: "CURRENT_TIMESTAMP", IS_NULLABLE: "NO" }))
      .toMatchObject({ type: "dateTime", form_visible: 0, disabled: 1, required: 0 });
  });

  test("a required column with a default is not required in the form", () => {
    expect(guessed("status", "varchar(20)", { IS_NULLABLE: "NO", COLUMN_DEFAULT: "NEW" }).required).toBe(0);
    expect(guessed("name", "varchar(120)", { IS_NULLABLE: "NO" }).required).toBe(1);
  });

  test("a foreign key reuses a lookup on the same table and column, or suggests one", () => {
    const foreignKey = column("created_by", "varchar(255)", { REFERENCED_TABLE_NAME: "admin", REFERENCED_COLUMN_NAME: "custom_id" });
    const reused = guessField(foreignKey, { existingLookups: [{ lookup_key: "users", source_table: "admin", value_column: "custom_id" }] });
    expect(reused.field).toMatchObject({ type: "lookup", config: { lookup: "users" } });
    expect(reused.lookupSuggestion).toBeNull();

    const suggested = guessField(foreignKey);
    expect(suggested.field.config).toEqual({ lookup: "admin" });
    expect(suggested.lookupSuggestion).toEqual({ lookup_key: "admin", source_table: "admin", value_column: "custom_id", label_column: "custom_id" });
  });
});

describe("migrations written by the builder", () => {
  test("a new table: its columns, unique keys, metadata and permissions", () => {
    const { sql, fields } = newTableMigration({
      table: "suppliers",
      label: "Suppliers",
      singular_label: "Supplier",
      columns: [
        { name: "name", type: "text", required: true, unique: true },
        { name: "credit_limit", type: "money", config: { currency: "GHS" } },
        { name: "active", type: "switch" },
      ],
    });

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `suppliers` (");
    expect(sql).toContain("`name` VARCHAR(255) NOT NULL");
    expect(sql).toContain("`credit_limit` DECIMAL(14,2) NULL");
    expect(sql).toContain("`active` TINYINT(1) NOT NULL DEFAULT 0");
    expect(sql).toContain("UNIQUE KEY `uq_suppliers_name` (`name`)");
    expect(sql).toContain("INSERT INTO `metadata_tables`");
    expect(sql).toContain("'{\\\"currency\\\":\\\"GHS\\\"}'");
    expect(sql).toContain("('read:suppliers', 'read Suppliers', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
    expect(sql).toContain("'/api/suppliers/:id', 'PUT'");
    expect(fields.map((field) => field.column_name)).toEqual(["id", "name", "credit_limit", "active", "createdAt", "updatedAt"]);
  });

  test("bad names, repeated or reserved columns and unknown types are refused", () => {
    expect(() => newTableMigration({ table: "bad name", columns: [{ name: "a", type: "text" }] })).toThrow(/Invalid table name/);
    expect(() => newTableMigration({ table: "t", columns: [] })).toThrow(/at least one column/);
    expect(() => newTableMigration({ table: "t", columns: [{ name: "a", type: "text" }, { name: "a", type: "text" }] })).toThrow(/listed twice/);
    expect(() => newTableMigration({ table: "t", columns: [{ name: "id", type: "text" }] })).toThrow(/reserved/);
    expect(() => newTableMigration({ table: "t", columns: [{ name: "a; DROP", type: "text" }] })).toThrow(/Invalid column name/);
    expect(() => newTableMigration({ table: "t", columns: [{ name: "a", type: "blob" }] })).toThrow(/unknown field type/);
  });

  test("an exported definition quotes every value, so labels cannot break the SQL", () => {
    const sql = definitionMigration({
      table: { table_name: "suppliers", label: "Suppliers' list", sections: [] },
      fields: [{ column_name: "name", col_real_name: "Name'); DROP TABLE admin; --", type: "text" }],
    });
    expect(sql).toContain("'Suppliers\\' list'");
    expect(sql).toContain("'Name\\'); DROP TABLE admin; --'");
    expect(sql).not.toMatch(/\);\s*DROP TABLE admin;\s*--'\)/);
  });
});

describe("what changed between versions", () => {
  test("table settings, changed fields, new fields and removed fields", () => {
    const before = {
      table: { label: "Resources", stepper: null },
      fields: [
        { column_name: "path", required: 0, col_span: 24 },
        { column_name: "icon", required: 0 },
      ],
    };
    const after = {
      table: { label: "Resources", stepper: { variant: "horizontal" } },
      fields: [
        { column_name: "path", required: 1, col_span: 24 },
        { column_name: "category", required: 0 },
      ],
    };
    expect(describeChanges(before, after)).toEqual([
      { scope: "table", subject: "stepper", change: "none → {\"variant\":\"horizontal\"}" },
      { scope: "field", subject: "path", change: "required: 0 → 1" },
      { scope: "field", subject: "category", change: "described" },
      { scope: "field", subject: "icon", change: "removed" },
    ]);
  });
});
