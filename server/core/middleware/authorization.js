const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");
const {
  canAccessResource,
} = require("../lib/authorizationPolicy");
const { loadUserAuthority } = require("../lib/authorityService");

const permissionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
// These two endpoints establish the authenticated UI context. They are always
// available after token validation, even when a baseline role intentionally has
// no business permissions yet.
const AUTHENTICATED_CORE_ENDPOINTS = new Set([
  "/api/v1/bootstrap",
  "/auth/auth_user",
]);

// Optional authenticated-open endpoints still require an explicit system
// setting and must also appear in this code-level safety allowlist.
const AUTHENTICATED_OPEN_ALLOWLIST = new Set([
  "/api/v1/extra_meta_options",
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
  const authority = await loadUserAuthority(userId);
  const { userRoles } = authority;

  if (!userRoles?.length) {
    throw new AppError("ERR_NO_RESOURCES", null, {
      message: "User has no roles assigned",
      level: "access",
    });
  }

  return {
    ...authority,
    permissionNames: authority.effectivePermissions,
  };
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
    req.isPrivileged = privileged;
    req.authority = context;

    if (AUTHENTICATED_CORE_ENDPOINTS.has(requestedPath)) {
      return next();
    }

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
