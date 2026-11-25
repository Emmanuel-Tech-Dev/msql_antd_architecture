jest.mock("../core/model/model", () => jest.fn());
jest.mock("../shared/utils/functions", () => ({
  ...jest.requireActual("../shared/utils/functions"),
  getSystemOpenRoute: jest.fn(),
}));

const Model = require("../core/model/model");
const utils = require("../shared/utils/functions");
const {
  authorization,
  clearPermissionCache,
  createAuthorizationMiddleware,
  permissionCacheKey,
} = require("../core/middleware/authorization");
const { AbacEngine, AbacPolicyRegistry } = require("../core/lib/abacEngine");
const { createCoreAbacPolicies } = require("../core/lib/coreAbacPolicies");

function mockPermissionData({ userId, roles, accountStatus = 1, permissions = [], overrides = [], permissionResources = [], resources = [] }) {
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
        if (tableName === "admin") {
          return [{ custom_id: userId, status: accountStatus }];
        }
        if (tableName === "admin_user_roles") {
          return roles.map((roleId) => ({ user_id: userId, role_id: roleId }));
        }
        if (tableName === "admin_role_permissions") {
          return permissions.map((permission) => ({ permission }));
        }
        if (tableName === "admin_user_permission_overrides") return overrides;
        if (tableName === "admin_permission_resources") {
          return permissionResources.map((resource) => ({ resource }));
        }
        if (tableName === "admin_resources") return resources;
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

  test("allows an API through a direct user permission grant", async () => {
    const userId = "authority-user:allow";
    mockPermissionData({
      userId,
      roles: ["Admin"],
      overrides: [{ permission: "export:reports", effect: "ALLOW" }],
      permissionResources: ["export:reports:api"],
      resources: [{ resource: "export:reports:api", resource_path: "/api/reports/export", http_method: "POST" }],
    });
    const next = jest.fn();
    const req = { path: "/api/reports/export", method: "POST", user: { sub: userId } };

    await authorization(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.permissions).toContain("export:reports");
    expect(req.authorizationContext.subject.id).toBe(userId);
    expect(req.authorizationContext.action.name).toBe("export:reports:api");
    expect(req.authorizationDecision.allowed).toBe(true);
  });

  test("direct user deny removes inherited API access", async () => {
    const userId = "authority-user:deny";
    mockPermissionData({
      userId,
      roles: ["Admin"],
      permissions: ["delete:users"],
      overrides: [{ permission: "delete:users", effect: "DENY" }],
      permissionResources: ["delete:users:api"],
      resources: [{ resource: "delete:users:api", resource_path: "/api/users/:id", http_method: "DELETE" }],
    });
    const next = jest.fn();
    const req = { path: "/api/users/42", method: "DELETE", user: { sub: userId } };

    await authorization(req, {}, next);

    const [error] = next.mock.calls[0];
    expect(error?.errorCode).toBe("ERR_ACCESS_DENIED");
    expect(req.permissions).not.toContain("delete:users");
  });

  test("denies an inactive account even on an authenticated core endpoint", async () => {
    const userId = "inactive-user";
    mockPermissionData({ userId, roles: ["User"], accountStatus: 0 });
    const next = jest.fn();
    const req = { path: "/api/v1/bootstrap", method: "POST", user: { sub: userId } };

    await authorization(req, {}, next);

    const [error] = next.mock.calls[0];
    expect(error?.errorCode).toBe("ERR_ACCESS_DENIED");
    expect(error?.metadata?.reason).toBe("ACCOUNT_INACTIVE");
    expect(error?.metadata?.deniedBy).toBe("core.active-account");
  });

  test("mandatory ABAC denial still applies to a privileged role", async () => {
    const userId = "privileged-user";
    mockPermissionData({ userId, roles: ["SuperAdmin"] });
    const registry = new AbacPolicyRegistry([
      ...createCoreAbacPolicies(),
      {
        id: "test.maintenance-window",
        evaluate: () => ({ effect: "DENY", reason: "MAINTENANCE_WINDOW" }),
      },
    ]);
    const middleware = createAuthorizationMiddleware({
      abacEngine: new AbacEngine({ registry }),
    });
    const next = jest.fn();
    const req = { path: "/api/anything", method: "DELETE", user: { sub: userId } };

    await middleware(req, {}, next);

    const [error] = next.mock.calls[0];
    expect(error?.errorCode).toBe("ERR_ACCESS_DENIED");
    expect(error?.metadata?.reason).toBe("MAINTENANCE_WINDOW");
    expect(error?.metadata?.deniedBy).toBe("test.maintenance-window");
    expect(req.authorizationContext.subject.privileged).toBe(true);
  });

  test("uses one global authority cache entry per user", () => {
    expect(permissionCacheKey("ADM-1")).toBe("ADM-1");
    expect(permissionCacheKey("ADM-2")).toBe("ADM-2");
  });
});
