// server/core/middleware/authorization.js

const AppError = require("../../shared/helpers/AppError");
const Model = require("../model/model");
const SettingsManager = require("../lib/systemSettings");
const utils = require("../../shared/utils/functions");

// simple in-memory cache — keyed by user custom_id
// invalidated when roles/permissions change (you can call clearPermissionCache(userId) from admin routes)
const permissionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const settings = new SettingsManager();

function getCached(userId) {
  const entry = permissionCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    permissionCache.delete(userId);
    return null;
  }
  return entry.data;
}

function setCache(userId, data) {
  permissionCache.set(userId, { data, timestamp: Date.now() });
}

function clearPermissionCache(userId) {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
}

const authorization = async (req, res, next) => {
  // console.log(await settings.get("system.open_routes"));
  try {
    const requestedPath = req.path;
    const requestedMethod = req.method;
    const openEndpointsRaw = await utils.getSystemOpenRoute();
    const openEndpoints = Array.isArray(openEndpointsRaw)
      ? openEndpointsRaw
      : [];
    // const isAuthUserEndpoint = requestedPath === "/auth/auth_user";

    // 2. open endpoints — authenticated but no role check needed
    // /auth/auth_user is a special case: we need roles/permissions/resources attached.
    if (openEndpoints.some((p) => requestedPath.startsWith(p))) {
      return next();
    }

    const user = req.user;
    if (!user) {
      throw new AppError("ERR_AUTHENTICATION_REQUIRED", null, {
        message: "Failed to authorize user, token missing or invalid",
        level: "access",
      });
    }

    // 3. load from cache or fetch
    let cached = getCached(user.sub);

    if (!cached) {
      // 3a. get roles
      const userRoles = await new Model()
        .select(["user_id", "role_id"], "admin_user_roles")
        .where("user_id", "=", user.sub)
        .execute();

      if (!userRoles || userRoles.length === 0) {
        throw new AppError("ERR_NO_RESOURCES", null, {
          message: "User has no roles assigned",
          level: "access",
        });
      }

      const roleIds = userRoles.map((r) => r.role_id);

      // 3b. get permissions for those roles
      const perms = await new Model()
        .select(["permission"], "admin_role_permissions")
        .whereIn("role_id", roleIds)
        .execute();

      if (!perms || perms.length === 0) {
        throw new AppError("ERR_NO_RESOURCES", null, {
          message: "User roles have no permissions assigned",
          level: "access",
        });
      }

      const permissionNames = perms.map((p) => p.permission);

      // 3c. get resources those permissions can access
      const permResources = await new Model()
        .select(["resource"], "admin_permission_resources")
        .whereIn("permission", permissionNames)
        .execute();

      if (!permResources || permResources.length === 0) {
        throw new AppError("ERR_NO_RESOURCES", null, {
          message: "User permissions have no resources assigned",
          level: "access",
        });
      }

      const resourceNames = permResources.map((r) => r.resource);

      // 3d. get full API endpoint details
      const resources = await new Model()
        .select(["*"], "admin_resources")
        .where("resource_type", "=", "API_ENDPOINT")
        .whereIn("resource", resourceNames)
        .execute();

      cached = { userRoles, permissionNames, resources };
      setCache(user.sub, cached);
    }

    const { userRoles, permissionNames, resources } = cached;

    // 4. check access — supports both exact and prefix matching
    // /api/admin matches /api/admin, /api/admin/123, /api/admin/123/something
    const canAccess = resources.some((r) => {
      const methodMatches =
        r.http_method === requestedMethod ||
        r.http_method === "*" ||
        r.http_method === "ALL";

      // exact match
      if (r.resource_path === requestedPath) return methodMatches;

      // prefix match for parameterized routes
      // /api/admin matches /api/admin/123
      if (requestedPath.startsWith(r.resource_path + "/")) return methodMatches;

      return false;
    });

    if (!canAccess) {
      throw new AppError("ERR_ACCESS_DENIED", null, {
        message: `Access denied to ${requestedMethod} ${requestedPath}`,
        level: "access",
        userId: user.sub,
        requestedPath,
        requestedMethod,
      });
    }

    // 5. attach to request for downstream use
    req.roles = userRoles;
    req.permissions = permissionNames;
    req.resources = resources;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authorization, clearPermissionCache };
