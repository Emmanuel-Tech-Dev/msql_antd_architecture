jest.mock("../core/config/conn", () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn() }));

const db = require("../core/config/conn");
const logger = require("../shared/helpers/logger");
const Model = require("../core/model/model");
const AppError = require("../shared/helpers/AppError");

describe("Model error and transaction contracts", () => {
  let connection;

  beforeEach(() => {
    jest.resetAllMocks();
    connection = {
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    db.getConnection.mockResolvedValue(connection);
  });

  test("execute preserves database error codes", async () => {
    const error = Object.assign(new Error("Duplicate profile"), {
      code: "ER_DUP_ENTRY",
      errno: 1062,
    });
    db.query.mockRejectedValue(error);

    await expect(
      new Model().select(["custom_id"], "designer_profiles").execute(),
    ).rejects.toBe(error);
  });

  test("raw preserves the original database error", async () => {
    const error = Object.assign(new Error("Query failed"), {
      code: "ER_LOCK_DEADLOCK",
    });
    db.query.mockRejectedValue(error);

    await expect(new Model().raw("SELECT 1")).rejects.toBe(error);
  });

  test("transaction builder uses the acquired connection and returns rows directly", async () => {
    const rows = [{ custom_id: "TAG-1" }];
    connection.query.mockResolvedValue([rows]);

    const result = await new Model().transaction(async (tx) => {
      expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
      return tx.builder()
        .select(["custom_id"], "fashion_style_tags")
        .where("status", "=", "ACTIVE")
        .whereIn("custom_id", ["TAG-1"])
        .executeInTransaction();
    });

    expect(result).toBe(rows);
    expect(connection.query).toHaveBeenCalledWith(
      "SELECT `custom_id` FROM `fashion_style_tags` WHERE `status` = ? AND `custom_id` IN (?)",
      ["ACTIVE", "TAG-1"],
    );
    expect(db.query).not.toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("transaction query uses the same connection and unwraps rows", async () => {
    const rows = [{ total: 1 }];
    connection.query.mockResolvedValue([rows]);

    const result = await new Model().transaction((tx) =>
      tx.query("SELECT ? AS total", [1]),
    );

    expect(result).toBe(rows);
    expect(connection.query).toHaveBeenCalledWith("SELECT ? AS total", [1]);
    expect(db.query).not.toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("validation errors retain their identity, status and metadata after rollback", async () => {
    const error = new AppError("ERR_VALIDATION_FAILED", "Unavailable style tag", {
      field: "style_tag_ids",
    });

    await expect(new Model().transaction(async () => {
      throw error;
    })).rejects.toBe(error);

    expect(error.metadata).toEqual({ field: "style_tag_ids" });
    expect(error.isOperational).toBe(true);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("a builder query failure rolls back and preserves the MySQL error", async () => {
    const error = Object.assign(new Error("Duplicate profile"), { code: "ER_DUP_ENTRY" });
    connection.query.mockRejectedValue(error);

    await expect(new Model().transaction((tx) => tx.builder()
      .insert("designer_profiles", { custom_id: "DSP-1", user_id: "USER-1" })
      .executeInTransaction(),
    )).rejects.toBe(error);

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("commit failure does not report success and still releases the connection", async () => {
    const error = new Error("Commit connection interrupted");
    connection.commit.mockRejectedValue(error);

    await expect(new Model().transaction(async () => "profile"))
      .rejects.toBe(error);

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("rollback failure is logged without hiding the original failure", async () => {
    const error = new AppError("ERR_VALIDATION_FAILED", "Invalid profile");
    const rollbackError = new Error("Rollback connection interrupted");
    connection.rollback.mockRejectedValue(rollbackError);

    await expect(new Model().transaction(async () => {
      throw error;
    })).rejects.toBe(error);

    expect(logger.error).toHaveBeenCalledWith(rollbackError, {
      component: "Model", operation: "transaction.rollback",
    });
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("begin failure does not run the callback and releases the connection", async () => {
    const error = new Error("Unable to begin transaction");
    const callback = jest.fn();
    connection.beginTransaction.mockRejectedValue(error);

    await expect(new Model().transaction(callback)).rejects.toBe(error);

    expect(callback).not.toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("connection acquisition failure preserves the error without running work", async () => {
    const error = new Error("Connection pool unavailable");
    const callback = jest.fn();
    db.getConnection.mockRejectedValue(error);

    await expect(new Model().transaction(callback)).rejects.toBe(error);

    expect(callback).not.toHaveBeenCalled();
    expect(connection.release).not.toHaveBeenCalled();
  });

  test("the transaction's own connection is available for raw statements", async () => {
    connection.query.mockResolvedValue([[{ id: 7 }]]);

    const rows = await new Model().transaction(async ({ connection: transactionConnection }) => {
      const [result] = await transactionConnection.query("SELECT id FROM invoices WHERE id = ? FOR UPDATE", [7]);
      return result;
    });

    expect(rows).toEqual([{ id: 7 }]);
    expect(connection.query).toHaveBeenCalledWith("SELECT id FROM invoices WHERE id = ? FOR UPDATE", [7]);
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test("expected refusals are not logged; unexpected failures are", async () => {
    const refusal = new AppError("ERR_CONFLICT", "This invoice changed elsewhere");
    await expect(new Model().transaction(async () => { throw refusal; })).rejects.toBe(refusal);
    expect(logger.error).not.toHaveBeenCalled();

    const failure = new Error("Lock wait timeout exceeded");
    await expect(new Model().transaction(async () => { throw failure; })).rejects.toBe(failure);
    expect(logger.error).toHaveBeenCalledWith(failure, { component: "Model", operation: "transaction" });
  });
});
