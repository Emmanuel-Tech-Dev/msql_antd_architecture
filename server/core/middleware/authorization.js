const AppError = require("../../shared/helpers/AppError");
const Model = require("../model/model");
const utils = require("../../shared/utils/functions");
const {
  canAccessResource,
  isPrivilegedSystemRole,
} = require("../lib/authorizationPolicy");

const permissionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const AUTHENTICATED_OPEN_ALLOWLIST = new Set([
  "/api/v1/bootstrap",
  "/api/v1/extra_meta_options",
  "/auth/auth_user",
  "/api/:resources/filters",
]);

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
  if (userId) permissionCache.delete(userId);
  else permissionCache.clear();
}

function matchesOpenEndpoint(pattern, requestedPath) {
  if (typeof pattern !== "string") return false;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return requestedPath === prefix || requestedPath.startsWith(`${prefix}/`);
  }
  return requestedPath === pattern;
}

async function loadPermissionContext(userId) {
  const userRoles = await new Model()
    .select(["user_id", "role_id"], "admin_user_roles")
    .where("user_id", "=", userId)
    .execute();

  if (!userRoles?.length) {
    throw new AppError("ERR_NO_RESOURCES", null, {
      message: "User has no roles assigned",
      level: "access",
    });
  }

  const roleIds = userRoles.map((role) => role.role_id);
  const permissionRows = await new Model()
    .select(["permission"], "admin_role_permissions")
    .whereIn("role_id", roleIds)
    .execute();
  const permissionNames = permissionRows.map((row) => row.permission);

  // SuperAdmin and dev are explicit privileged system roles. They bypass
  // endpoint mappings while still carrying declared permissions for UI context.
  if (isPrivilegedSystemRole(userRoles)) {
    return { userRoles, permissionNames, resources: [], privileged: true };
  }

  if (!permissionNames.length) {
    throw new AppError("ERR_NO_RESOURCES", null, {
      message: "User roles have no permissions assigned",
      level: "access",
    });
  }

  const permissionResources = await new Model()
    .select(["resource"], "admin_permission_resources")
    .whereIn("permission", permissionNames)
    .execute();
  const resourceNames = permissionResources.map((row) => row.resource);
  const resources = resourceNames.length
    ? await new Model()
        .select(["*"], "admin_resources")
        .where("resource_type", "=", "API_ENDPOINT")
        .whereIn("resource", resourceNames)
        .execute()
    : [];

  return { userRoles, permissionNames, resources, privileged: false };
}

const authorization = async (req, res, next) => {
  try {
    const requestedPath = req.path;
    const requestedMethod = req.method;
    const user = req.user;
    if (!user?.sub) {
      throw new AppError("ERR_AUTHENTICATION_REQUIRED", null, {
        message: "Failed to authorize user, token missing or invalid",
        level: "access",
      });
    }

    let context = getCached(user.sub);
    if (!context) {
      context = await loadPermissionContext(user.sub);
      setCache(user.sub, context);
    }

    const { userRoles, permissionNames, resources, privileged } = context;
    req.roles = userRoles;
    req.permissions = permissionNames;
    req.resources = resources;

    const openEndpointsRaw = await utils.getSystemOpenRoute();
    const openEndpoints = Array.isArray(openEndpointsRaw)
      ? openEndpointsRaw
      : [];
    const isConfiguredOpen = openEndpoints.some((pattern) =>
      matchesOpenEndpoint(pattern, requestedPath),
    );
    if (isConfiguredOpen && AUTHENTICATED_OPEN_ALLOWLIST.has(requestedPath)) {
      return next();
    }

    if (privileged) return next();

    const canAccess = resources.some((resource) =>
      canAccessResource(resource, requestedMethod, requestedPath),
    );

    if (!canAccess) {
      throw new AppError("ERR_ACCESS_DENIED", null, {
        message: `Access denied to ${requestedMethod} ${requestedPath}`,
        level: "access",
        userId: user.sub,
        requestedPath,
        requestedMethod,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { authorization, clearPermissionCache };
