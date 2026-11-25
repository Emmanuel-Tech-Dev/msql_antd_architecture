const utils = require("../shared/utils/functions");

describe("shared server utilities", () => {
  test("identifiers", () => {
    expect(utils.isIdentifier("admin_roles")).toBe(true);
    expect(utils.isIdentifier("1bad")).toBe(false);
    expect(utils.isIdentifier(undefined)).toBe(false);
    expect(utils.requireIdentifier("customers", "table name")).toBe("customers");
    expect(() => utils.requireIdentifier("a; DROP", "column name")).toThrow("Invalid column name: a; DROP");
  });

  test("blank values, names and lists", () => {
    expect(utils.isBlank("  ")).toBe(true);
    expect(utils.isBlank([])).toBe(true);
    expect(utils.isBlank(0)).toBe(false);
    expect(utils.humanize("created_by")).toBe("Created by");
    expect(utils.uniqueIds([" a", "a", null, undefined, "b"])).toEqual(["a", "b"]);
    expect(utils.placeholders(["x", "x", "y"])).toBe("?, ?, ?");
    expect(utils.clampInteger("250", 10, 100)).toBe(100);
    expect(utils.clampInteger("x", 10, 100)).toBe(10);
  });

  test("hashing and JSON", () => {
    expect(utils.sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(utils.parseJson('{"a":1}', null)).toEqual({ a: 1 });
    expect(utils.parseJson("{bad", null)).toBeNull();
  });
});
