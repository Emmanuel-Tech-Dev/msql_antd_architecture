jest.mock("../core/model/model", () => jest.fn());
jest.mock("../shared/utils/functions", () => ({
  getSystemOpenRoute: jest.fn(),
}));

const Model = require("../core/model/model");
const utils = require("../shared/utils/functions");
const {
  authorization,
  clearPermissionCache,
} = require("../core/middleware/authorization");

function mockPermissionData({ userId, roles, permissions = [] }) {
  Model.mockImplementation(() => {
    let tableName;
    const builder = {
      select: jest.fn((_columns, table) => {
        tableName = table;
        return builder;
      }),
      where: jest.fn(() => builder),
      whereIn: jest.fn(() => builder),
      execute: jest.fn(async () => {
        if (tableName === "admin_user_roles") {
          return roles.map((roleId) => ({ user_id: userId, role_id: roleId }));
        }
        if (tableName === "admin_role_permissions") {
          return permissions.map((permission) => ({ permission }));
        }
        return [];
      }),
    };
    return builder;
  });
}

describe("authorization middleware baseline access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPermissionCache();
    utils.getSystemOpenRoute.mockResolvedValue([]);
  });

  test.each(["/auth/auth_user", "/api/v1/bootstrap"])(
    "allows authenticated users with a role but no permissions to access %s",
    async (path) => {
      const userId = `baseline-user:${path}`;
      mockPermissionData({ userId, roles: ["User "] });
      const next = jest.fn();
      const req = { path, method: "POST", user: { sub: userId } };

      await authorization(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.roles).toEqual([{ user_id: userId, role_id: "User " }]);
      expect(req.permissions).toEqual([]);
      expect(req.resources).toEqual([]);
    },
  );

  test("keeps protected APIs denied when the role has no permissions", async () => {
    const userId = "baseline-user:protected";
    mockPermissionData({ userId, roles: ["User "] });
    const next = jest.fn();
    const req = { path: "/api/admin", method: "GET", user: { sub: userId } };

    await authorization(req, {}, next);

    const [error] = next.mock.calls[0];
    expect(error?.errorCode).toBe("ERR_ACCESS_DENIED");
  });
});
