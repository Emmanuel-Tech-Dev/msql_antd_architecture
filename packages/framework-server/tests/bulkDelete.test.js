jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), app: jest.fn() }));
jest.mock("../core/lib/uploadTracking", () => ({ releaseRecordFiles: jest.fn(async () => {}), syncRecordFiles: jest.fn(async () => {}) }));

const db = require("../core/config/conn");
const { releaseRecordFiles } = require("../core/lib/uploadTracking");
const BaseService = require("../core/lib/baseService");

const ROWS = [{ id: 3, name: "Ama", photo: "https://files/a.png" }, { id: 5, name: "Kofi", photo: null }];
let connection;

function serviceFor(table = "volunteer") {
  return new BaseService({
    params: { resources: table },
    validatedResource: { table, primaryKey: "id", fields: ["id", "name", "photo"] },
  }, {});
}

beforeEach(() => {
  db.query.mockReset();
  db.getConnection.mockReset();
  releaseRecordFiles.mockClear();
  db.query.mockImplementation(async (sql, params) => [ROWS.filter((row) => params.map(String).includes(String(row.id)))]);
  connection = {
    beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
    query: jest.fn(async () => [{ affectedRows: 2 }]),
  };
  db.getConnection.mockResolvedValue(connection);
});

describe("bulk delete (DELETE /api/:resources)", () => {
  test("deletes the found records in one transaction, releases their files and reports missing ids", async () => {
    const result = await serviceFor().deleteMany(["3", 5, "9", "3"]);

    expect(result).toEqual({ deleted: 2, missing: ["9"] });
    const [sql, params] = connection.query.mock.calls[0];
    expect(sql).toBe("DELETE FROM `volunteer` WHERE `id` IN (?, ?)");
    expect(params).toEqual([3, 5]);
    expect(connection.commit).toHaveBeenCalled();
    expect(releaseRecordFiles.mock.calls.map(([table, row]) => [table, row.id])).toEqual([["volunteer", 3], ["volunteer", 5]]);
  });

  test("nothing found: no delete runs", async () => {
    expect(await serviceFor().deleteMany(["41", "42"])).toEqual({ deleted: 0, missing: ["41", "42"] });
    expect(db.getConnection).not.toHaveBeenCalled();
  });

  test("a failure rolls the whole batch back", async () => {
    connection.query.mockRejectedValueOnce(Object.assign(new Error("Cannot delete: a foreign key"), { code: "ER_ROW_IS_REFERENCED_2" }));
    await expect(serviceFor().deleteMany([3, 5])).rejects.toThrow("Cannot delete: a foreign key");
    expect(connection.rollback).toHaveBeenCalled();
    expect(releaseRecordFiles).not.toHaveBeenCalled();
  });

  test("needs between 1 and 500 ids", async () => {
    await expect(serviceFor().deleteMany([])).rejects.toThrow("Send between 1 and 500 ids to delete");
    await expect(serviceFor().deleteMany(Array.from({ length: 501 }, (_, i) => i + 1))).rejects.toThrow("Send between 1 and 500 ids to delete");
    await expect(serviceFor().deleteMany("3,5")).rejects.toThrow("Send between 1 and 500 ids to delete");
  });
});
