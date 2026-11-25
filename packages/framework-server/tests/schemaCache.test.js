jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));

const db = require("../core/config/conn");
const { cachedDescribedFields, clearTableCache, tableSchema } = require("../core/lib/schemaCache");

const COLUMNS = [{ COLUMN_NAME: "id", COLUMN_KEY: "PRI" }, { COLUMN_NAME: "name", COLUMN_KEY: "" }];

beforeEach(() => {
  db.query.mockReset();
  clearTableCache();
  db.query.mockResolvedValue([COLUMNS]);
});

describe("table schema cache", () => {
  test("one query per table answers existence, columns and primary key, then is reused", async () => {
    const [first, second] = await Promise.all([tableSchema("suppliers"), tableSchema("suppliers")]);
    expect(first).toEqual({ exists: true, columns: ["id", "name"], primaryKey: "id" });
    expect(second).toBe(first);
    await tableSchema("suppliers");
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toContain("FROM `information_schema`.`columns` WHERE `table_schema` = DATABASE() AND `table_name` = ?");
  });

  test("a table that does not exist has no columns", async () => {
    db.query.mockResolvedValue([[]]);
    expect(await tableSchema("nope")).toEqual({ exists: false, columns: [], primaryKey: null });
  });

  test("clearing a table, as the builder does on save, reads it again", async () => {
    const load = jest.fn(async () => [{ column_name: "name" }]);
    await cachedDescribedFields("suppliers", load);
    await cachedDescribedFields("suppliers", load);
    expect(load).toHaveBeenCalledTimes(1);

    clearTableCache("suppliers");
    await cachedDescribedFields("suppliers", load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  test("a busy table is still read again after 5 minutes, so a migration's new column shows", async () => {
    const now = jest.spyOn(Date, "now");
    try {
      now.mockReturnValue(1_000_000);
      await tableSchema("suppliers");
      for (const minute of [1, 2, 3, 4]) {
        now.mockReturnValue(1_000_000 + minute * 60_000);
        await tableSchema("suppliers");
      }
      expect(db.query).toHaveBeenCalledTimes(1);
      now.mockReturnValue(1_000_000 + 5 * 60_000 + 1);
      await tableSchema("suppliers");
      expect(db.query).toHaveBeenCalledTimes(2);
    } finally {
      now.mockRestore();
    }
  });

  test("a failed query is not kept, so the next request tries again", async () => {
    db.query.mockRejectedValueOnce(new Error("connection lost"));
    await expect(tableSchema("suppliers")).rejects.toThrow("connection lost");
    expect(await tableSchema("suppliers")).toMatchObject({ exists: true });
  });
});
