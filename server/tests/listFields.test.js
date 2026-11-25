jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const { clearTableCache } = require("../core/lib/schemaCache");
const { validateRecordAgainstMetadata } = require("../core/lib/metadataSchema");
const { upgradeLegacyField } = require("../core/lib/legacyDynamicForm");

const row = (column_name, type, overrides = {}) => ({ column_name, col_real_name: overrides.label ?? column_name, type, required: 0, config: null, ...overrides });
const field = (column_name, type, config, overrides = {}) => ({
  column_name, col_real_name: overrides.label ?? column_name, type, editable: 1, disabled: 0, required: 0, form_visible: 1, config, options: null, ...overrides,
});

const CONTACTS = field("contacts", "list", {
  minRows: 1,
  maxRows: 3,
  fields: [
    row("name", "text", { label: "Name", required: 1 }),
    row("channel", "select", { label: "Channel", config: { options: [{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }] } }),
    row("phone", "phone", { label: "Phone", config: { requiredWhen: { field: "channel", in: ["phone"] } } }),
    row("share", "number", { label: "Share", config: { max: 100 } }),
    row("photo", "image", { label: "Photo" }),
  ],
}, { label: "Contacts" });

const PRICES = field("price_list", "groupList", {
  fields: [row("name", "text", { label: "Group name", required: 1 })],
  children: { key: "items", label: "Items", fields: [row("item", "text", { label: "Item", required: 1 }), row("price", "money", { label: "Price" })] },
}, { label: "Price list" });

function describe_(fields) {
  db.query.mockImplementation(async (sql, params = []) => {
    if (sql.includes("FROM `metadata_tables`")) return [[{ table_name: params[0] }]];
    if (sql.includes("FROM `tables_metadata`")) return [fields];
    return [[]];
  });
}
const check = (record) => validateRecordAgainstMetadata("suppliers", record, { mode: "create" });

beforeEach(() => {
  db.query.mockReset();
  clearTableCache();
});

describe("list and groupList fields", () => {
  test("rows are checked like records and stored as JSON without unknown keys", async () => {
    describe_([CONTACTS]);
    const { record, errors } = await check({ contacts: [{ name: "Ama", channel: "email", share: "40", extra: "dropped", photo: "x.png" }] });
    expect(errors).toEqual({});
    expect(JSON.parse(record.contacts)).toEqual([{ name: "Ama", channel: "email", phone: null, share: 40 }]);
  });

  test("errors name the row, and conditions read the row's own values", async () => {
    describe_([CONTACTS]);
    const { errors } = await check({ contacts: [{ name: "Ama", channel: "email" }, { name: "", channel: "phone", share: 120 }] });
    expect(errors.contacts).toBe("Contacts, row 2: Name is required; Contacts, row 2: Phone is required; Contacts, row 2: Share must be at most 100");
  });

  test("row counts are limited, and a JSON string from a form is accepted", async () => {
    describe_([CONTACTS]);
    expect((await check({ contacts: "[]" })).errors.contacts).toBe("Contacts needs at least 1 row");
    const four = Array.from({ length: 4 }, (_, index) => ({ name: `C${index}` }));
    expect((await check({ contacts: JSON.stringify(four) })).errors.contacts).toBe("Contacts allows at most 3 rows");
    expect((await check({ contacts: "not json" })).errors.contacts).toBe("Contacts must be a list");
  });

  test("a groupList checks its groups and each group's inner list", async () => {
    describe_([PRICES]);
    const ok = await check({ price_list: [{ name: "Stationery", items: [{ item: "A4 paper", price: "58" }] }, { name: "Toner", items: [] }] });
    expect(ok.errors).toEqual({});
    expect(JSON.parse(ok.record.price_list)).toEqual([{ name: "Stationery", items: [{ item: "A4 paper", price: 58 }] }, { name: "Toner", items: [] }]);

    const bad = await check({ price_list: [{ name: "Stationery", items: [{ item: "", price: "abc" }] }] });
    expect(bad.errors.price_list).toBe("Price list, group 1, Items row 1: Item is required; Price list, group 1, Items row 1: Price must be a number");
  });

  test("old dynaFormSimple and dynaFormNested definitions read as list and groupList", () => {
    const simple = upgradeLegacyField(field("lines", "dynaFormSimple", null, {
      options: JSON.stringify({ item: { type: "text", markup: { isRequired: true } }, unit: { type: "csvSelect", options: "box,ream" }, qty: { type: "number" }, source: { type: "sqlSelect" } }),
    }));
    expect(simple.type).toBe("list");
    expect(simple.config.fields).toEqual([
      { column_name: "item", col_real_name: "item", type: "text", required: 1, config: null },
      { column_name: "unit", col_real_name: "unit", type: "select", required: 0, config: { options: [{ value: "box", label: "box" }, { value: "ream", label: "ream" }] } },
      { column_name: "qty", col_real_name: "qty", type: "number", required: 0, config: null },
      { column_name: "source", col_real_name: "source", type: "text", required: 0, config: null },
    ]);

    const nested = upgradeLegacyField(field("menu", "dynaFormNested", null, {
      options: { parent: { title: { type: "text" } }, children: { dish: { type: "jsonSelect", options: { r: "Rice", b: "Beans" } } } },
    }));
    expect(nested.type).toBe("groupList");
    expect(nested.config.children).toEqual({ key: "list", label: "Items", fields: [{ column_name: "dish", col_real_name: "dish", type: "select", required: 0, config: { options: [{ value: "r", label: "Rice" }, { value: "b", label: "Beans" }] } }] });
  });
});

describe("saving list definitions", () => {
  const { checkField } = require("../core/lib/metadataScaffold");
  const list = (fields) => ({ column_name: "contacts", type: "list", col_span: 24, config: { fields } });

  test("row fields need valid, unique keys and a type a row can hold", () => {
    expect(() => checkField(list([{ column_name: "name", type: "text" }]), ["contacts"])).not.toThrow();
    expect(() => checkField(list([]), ["contacts"])).toThrow("contacts: add at least one row field");
    expect(() => checkField(list([{ column_name: "bad key", type: "text" }]), ["contacts"])).toThrow("is not a valid row field key");
    expect(() => checkField(list([{ column_name: "a", type: "text" }, { column_name: "a", type: "number" }]), ["contacts"])).toThrow("used twice");
    expect(() => checkField(list([{ column_name: "photo", type: "image" }]), ["contacts"])).toThrow("rows cannot hold image fields");
  });
});
