jest.mock("../shared/helpers/logger", () => ({
  security: jest.fn(),
  error: jest.fn(),
  app: jest.fn(),
}));

const AuthService = require("../core/lib/authService");

function chainResult(result) {
  const query = {
    where: jest.fn(() => query),
    execute: jest.fn(async () => result),
  };
  return query;
}

function makeService({ blacklisted = false, tokenVersion = 6 } = {}) {
  const service = Object.create(AuthService.prototype);
  service.refreshTokenSecret = "refresh-secret";
  service.verifyToken = jest.fn(async () => ({
    sub: "USER-1",
    jti: "refresh-jti",
    type: "refresh",
    token_version: 6,
  }));
  service.generateAuthTokens = jest.fn(async () => ({
    accessToken: "new-access-token",
    refreshToken: "new-refresh-token",
  }));

  const blacklistQuery = chainResult(blacklisted ? [{ jti: "refresh-jti" }] : []);
  const credentialQuery = chainResult([{ token_version: tokenVersion }]);
  const insertQuery = chainResult(undefined);
  let selectCount = 0;

  service.model = {
    select: jest.fn(() => {
      selectCount += 1;
      return selectCount === 1 ? blacklistQuery : credentialQuery;
    }),
    insert: jest.fn(() => insertQuery),
  };

  return { service, insertQuery };
}

describe("refresh token rotation", () => {
  test("rotates a valid token and accepts numeric database values returned as strings", async () => {
    const { service, insertQuery } = makeService({ tokenVersion: "6" });

    await expect(service.refreshToken("old-refresh-token")).resolves.toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
    });

    expect(service.generateAuthTokens).toHaveBeenCalledWith({
      custom_id: "USER-1",
      token_version: 6,
    });
    expect(service.model.insert).toHaveBeenCalledWith("token_blacklist", {
      user_custom_id: "USER-1",
      jti: "refresh-jti",
      token_type: "refresh",
    });
    expect(insertQuery.execute).toHaveBeenCalledTimes(1);
  });

  test("reports reuse as a revoked token instead of a generic bad request", async () => {
    const { service } = makeService({ blacklisted: true });

    await expect(service.refreshToken("used-refresh-token")).rejects.toMatchObject({
      errorCode: "ERR_TOKEN_REVOKED",
      statusCode: 401,
      metadata: { reason: "refresh_token_reused" },
    });
    expect(service.generateAuthTokens).not.toHaveBeenCalled();
  });

  test("reports an expired refresh token as an authentication failure", async () => {
    const { service } = makeService();
    service.verifyToken.mockRejectedValueOnce(
      Object.assign(new Error("jwt expired"), { name: "TokenExpiredError" }),
    );

    await expect(service.refreshToken("expired-refresh-token")).rejects.toMatchObject({
      errorCode: "ERR_TOKEN_EXPIRED",
      statusCode: 401,
      metadata: { reason: "refresh_token_expired" },
    });
  });
});
