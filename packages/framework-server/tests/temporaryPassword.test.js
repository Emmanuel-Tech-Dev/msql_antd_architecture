jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), security: jest.fn(), info: jest.fn(), warn: jest.fn() }));
jest.mock("../core/lib/systemSettings", () => jest.fn().mockImplementation(() => ({ get: jest.fn(async () => null) })));

const db = require("../core/config/conn");
const bcrypt = require("bcrypt");
const AuthService = require("../core/lib/authService");

describe("temporary passwords from an administrator", () => {
  test("a reset gives a random, readable password, signs the user out everywhere and requires a new password", async () => {
    const connection = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn(async (sql) => (sql.startsWith("SELECT") ? [[{ token_version: 4 }]] : [{ affectedRows: 1 }])),
    };
    db.getConnection.mockResolvedValue(connection);
    db.query.mockResolvedValue([[{ custom_id: "USR-1", name: "Mustapha" }]]);

    const auth = new AuthService();
    const first = await auth.resetTemporaryPassword("USR-1");
    const second = await auth.resetTemporaryPassword("USR-1");

    expect(first.temporary_password).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(first.temporary_password).not.toBe(second.temporary_password);
    expect(connection.query.mock.calls[0]).toEqual([
      "SELECT `token_version` FROM `admin_credentials` WHERE `admin_custom_id` = ? FOR UPDATE",
      ["USR-1"],
    ]);
    const [credentialsSql, [hash, loginEnabled, tokenVersion, userId]] = connection.query.mock.calls[1];
    expect(credentialsSql).toBe("UPDATE `admin_credentials` SET `password` = ?, `password_login_enabled` = ?, `token_version` = ? WHERE `admin_custom_id` = ?");
    expect([loginEnabled, tokenVersion, userId]).toEqual([1, 5, "USR-1"]);
    expect(await bcrypt.compare(first.temporary_password, hash)).toBe(true);
    expect(connection.query.mock.calls[2][0]).toBe("UPDATE `admin` SET `forced_password_change` = ? WHERE `custom_id` = ?");
    expect(connection.query.mock.calls[2][1]).toEqual([1, "USR-1"]);
  });

  test("an unknown user is refused", async () => {
    db.query.mockResolvedValue([[]]);
    await expect(new AuthService().resetTemporaryPassword("NOPE")).rejects.toMatchObject({ errorCode: "ERR_USER_NOT_FOUND" });
  });
});
