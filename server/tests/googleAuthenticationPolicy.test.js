jest.mock("../shared/helpers/logger", () => ({
  security: jest.fn(),
}));

const AuthService = require("../core/lib/authService");

const joinedQuery = (...results) => {
  const execute = jest.fn();
  results.forEach((result) => execute.mockResolvedValueOnce(result));

  const query = {
    join: jest.fn(() => query),
    where: jest.fn(() => query),
    execute,
  };

  return query;
};

const makeService = () => {
  const service = Object.create(AuthService.prototype);
  service.IDPREFIX = "USR";
  service.settings = { get: jest.fn(async () => "USR") };
  service.verifyGoogleAuthToken = jest.fn(async () => ({
    sub: "google-subject",
    email: "New.User@example.com",
    email_verified: true,
    name: "New User",
    picture: "https://example.com/avatar.png",
  }));
  service.hashedPassword = jest.fn(async () => "random-password-hash");
  service.issueAuthTokensAndRecordLogin = jest.fn(async (user) => ({ user }));
  return service;
};

describe("Google authentication account policy", () => {
  test("new Google users receive User role and no password login", async () => {
    const service = makeService();
    const query = joinedQuery([], []);
    const inserted = [];

    service.model = {
      multiSelect: jest.fn(() => query),
      select: jest.fn(() => ({
        execute: jest.fn(async () => [
          { role_name: "Administrator" },
          { role_name: "User" },
        ]),
      })),
      transaction: jest.fn(async (callback) => {
        await callback({
          builder: () => ({
            insert: (table, data) => inserted.push({ table, data }),
            executeInTransaction: jest.fn(async () => undefined),
          }),
        });
      }),
    };

    await service.googleLogin("verified-google-token", {});

    expect(inserted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "admin_credentials",
          data: expect.objectContaining({ password_login_enabled: 0 }),
        }),
        {
          table: "admin_user_roles",
          data: expect.objectContaining({ role_id: "User" }),
        },
      ]),
    );
  });

  test("existing email accounts are linked without replacing roles", async () => {
    const service = makeService();
    const existingUser = {
      custom_id: "ADM-1",
      email: "new.user@example.com",
      name: "Existing Admin",
      status: 1,
      token_version: 4,
      password_login_enabled: 1,
    };
    const query = joinedQuery([], [existingUser]);
    const updateQuery = {
      where: jest.fn(() => updateQuery),
      execute: jest.fn(async () => undefined),
    };

    service.model = {
      multiSelect: jest.fn(() => query),
      update: jest.fn(() => updateQuery),
      select: jest.fn(),
      transaction: jest.fn(),
    };

    await service.googleLogin("verified-google-token", {});

    expect(service.model.update).toHaveBeenCalledWith(
      "admin",
      expect.objectContaining({
        oauth_id: "google-subject",
        oauth_provider: "google",
      }),
    );
    expect(service.model.transaction).not.toHaveBeenCalled();
    expect(service.model.select).not.toHaveBeenCalled();
    expect(service.issueAuthTokensAndRecordLogin).toHaveBeenCalledWith(
      expect.objectContaining({ custom_id: "ADM-1", token_version: 4 }),
      {},
    );
  });

  test("Google-only accounts are rejected by password login", async () => {
    const service = makeService();
    const query = joinedQuery([
      {
        custom_id: "USR-1",
        email: "new.user@example.com",
        status: 1,
        password: "random-password-hash",
        password_login_enabled: 0,
      },
    ]);

    service.model = { multiSelect: jest.fn(() => query) };

    await expect(
      service.login({ email: "new.user@example.com", password: "attempt" }, {}),
    ).rejects.toThrow("This account uses Google sign-in");
  });
});
