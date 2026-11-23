jest.mock("../core/config/conn", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({ error: jest.fn(), security: jest.fn(), info: jest.fn(), warn: jest.fn() }));
jest.mock("../core/lib/systemSettings", () => jest.fn().mockImplementation(() => ({
  get: jest.fn(async (key, fallback) => mockSettings[key] ?? fallback),
  fetchFromDB: jest.fn(async (key) => mockSettings[key] ?? null),
})));

const db = require("../core/config/conn");
const AuthService = require("../core/lib/authService");

let mockSettings = {};
const ADMIN_INDEXES = [
  { Key_name: "PRIMARY", Column_name: "id", Non_unique: 0 },
  { Key_name: "custom_id", Column_name: "custom_id", Non_unique: 0 },
  { Key_name: "email", Column_name: "email", Non_unique: 0 },
  { Key_name: "uq_admin_phone_no", Column_name: "phone_no", Non_unique: 0 },
  { Key_name: "email_2", Column_name: "email", Non_unique: 1 },
  { Key_name: "email_2", Column_name: "name", Non_unique: 1 },
];
const ACCOUNT = { custom_id: "REG-1", email: "ama@example.com", status: 1, password: "hash", password_login_enabled: 1 };

function mockDatabase(users) {
  db.query.mockImplementation(async (sql) => (
    sql.startsWith("SHOW INDEX") ? [ADMIN_INDEXES] : [users]
  ));
}

function signInAuth() {
  const auth = new AuthService();
  auth.comparePassword = jest.fn(async () => true);
  auth.issueAuthTokensAndRecordLogin = jest.fn(async (user) => ({ user }));
  return auth;
}

const userQuery = () => db.query.mock.calls.find(([sql]) => sql.startsWith("SELECT"));

beforeEach(() => {
  db.query.mockReset();
  mockSettings = {};
});

describe("configurable sign-in identifiers", () => {
  test("a local phone number signs in through the configured columns, normalised", async () => {
    mockSettings = { "auth.login_identifiers": ["email", "custom_id", "phone_no"] };
    mockDatabase([ACCOUNT]);

    const result = await signInAuth().login({ identifier: "024 123 4567", password: "secret" });

    expect(result.user.custom_id).toBe("REG-1");
    const [sql, params] = userQuery();
    expect(sql).toContain("(`admin`.`email` = ? OR `admin`.`custom_id` = ? OR `admin`.`phone_no` = ?)");
    expect(params).toEqual(["024 123 4567", "024 123 4567", "+233241234567"]);
  });

  test("the old email field still works, and only columns with their own unique key are used", async () => {
    mockSettings = { "auth.login_identifiers": ["email", "name", "status"] };
    mockDatabase([ACCOUNT]);

    await signInAuth().login({ email: "Ama@Example.com", password: "secret" });

    const [sql, params] = userQuery();
    expect(sql).toContain("(`admin`.`email` = ?)");
    expect(params).toEqual(["ama@example.com"]);
  });

  test("a value matching two accounts signs in neither", async () => {
    mockDatabase([ACCOUNT, { ...ACCOUNT, custom_id: "REG-2" }]);

    await expect(signInAuth().login({ identifier: "REG-1", password: "secret" }))
      .rejects.toMatchObject({ errorCode: "ERR_USER_NOT_FOUND" });
  });

  test("input that fits no configured column is refused without searching accounts", async () => {
    mockSettings = { "auth.login_identifiers": ["phone_no"] };
    mockDatabase([ACCOUNT]);

    await expect(signInAuth().login({ identifier: "not-a-phone", password: "secret" }))
      .rejects.toMatchObject({ errorCode: "ERR_USER_NOT_FOUND" });
    expect(userQuery()).toBeUndefined();
  });

  test("with no usable configured column, only the registration number is accepted", async () => {
    mockSettings = { "auth.login_identifiers": ["name"] };
    mockDatabase([]);

    await expect(new AuthService().loginIdentifierColumns()).resolves.toEqual(["custom_id"]);
  });
});
