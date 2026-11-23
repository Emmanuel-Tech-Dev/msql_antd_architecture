const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");
const {
  canAccessResource,
  matchesResourcePath,
} = require("../lib/authorizationPolicy");
const { loadUserAuthority } = require("../lib/authorityService");
const {
  AbacEngine,
  AbacPolicyRegistry,
} = require("../lib/abacEngine");
const { buildHttpAuthorizationContext } = require("../lib/authorizationContext");
const { createCoreAbacPolicies } = require("../lib/coreAbacPolicies");

const permissionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const defaultPolicyRegistry = new AbacPolicyRegistry(createCoreAbacPolicies());
const defaultAbacEngine = new AbacEngine({ registry: defaultPolicyRegistry });
// These two endpoints establish the authenticated UI context. They are always
// available after token validation, even when a baseline role intentionally has
// no business permissions yet.
const AUTHENTICATED_CORE_ENDPOINTS = new Set([
  "/api/v1/bootstrap",
  "/auth/auth_user",
]);
// Forms need field metadata (which bootstrap already gives every user) and
// lookup options; metadataService checks each lookup's own permission.
const AUTHENTICATED_CORE_PATTERNS = [
  "/api/v1/metadata/:table",
  "/api/v1/lookups/:key",
];

// Optional authenticated-open endpoints still require an explicit system
// setting and must also appear in this code-level safety allowlist.
const AUTHENTICATED_OPEN_ALLOWLIST = new Set([
  "/api/v1/extra_meta_options",
  "/api/:resources/filters",
]);

function permissionCacheKey(userId) {
  return String(userId);
}

function getCached(cacheKey) {
  const entry = permissionCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    permissionCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

function setCache(cacheKey, data) {
  permissionCache.set(cacheKey, { data, timestamp: Date.now() });
}

function clearPermissionCache(userId) {
  if (!userId) {
    permissionCache.clear();
    return;
  }
  permissionCache.delete(String(userId));
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

function createAuthorizationMiddleware({ abacEngine = defaultAbacEngine } = {}) {
  return async (req, res, next) => {
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

      const cacheKey = permissionCacheKey(user.sub);
      let authority = getCached(cacheKey);
      if (!authority) {
        authority = await loadPermissionContext(user.sub);
        setCache(cacheKey, authority);
      }

      const { userRoles, permissionNames, resources, privileged } = authority;
      req.roles = userRoles;
      req.permissions = permissionNames;
      req.resources = resources;
      req.isPrivileged = privileged;
      req.authority = authority;

      let accessMode = "PROTECTED";
      let baselineAllowed = false;
      let matchedResources = [];

      if (
        AUTHENTICATED_CORE_ENDPOINTS.has(requestedPath)
        || AUTHENTICATED_CORE_PATTERNS.some((pattern) => matchesResourcePath(pattern, requestedPath))
      ) {
        accessMode = "AUTHENTICATED_CORE";
        baselineAllowed = true;
      }

      if (!baselineAllowed) {
        const openEndpointsRaw = await utils.getSystemOpenRoute();
        const openEndpoints = Array.isArray(openEndpointsRaw)
          ? openEndpointsRaw
          : [];
        const isConfiguredOpen = openEndpoints.some((pattern) =>
          matchesOpenEndpoint(pattern, requestedPath),
        );
        if (isConfiguredOpen && AUTHENTICATED_OPEN_ALLOWLIST.has(requestedPath)) {
          accessMode = "AUTHENTICATED_OPEN";
          baselineAllowed = true;
        }
      }

      if (!baselineAllowed) {
        matchedResources = resources.filter((resource) =>
          canAccessResource(resource, requestedMethod, requestedPath),
        );
        baselineAllowed = privileged || matchedResources.length > 0;
        if (privileged) accessMode = "PRIVILEGED_RBAC_BYPASS";
      }

      const authorizationContext = buildHttpAuthorizationContext({
        req,
        authority,
        matchedResources,
        accessMode,
      });
      const decision = await abacEngine.evaluate(authorizationContext, {
        baselineAllowed,
      });
      req.authorizationContext = authorizationContext;
      req.authorizationDecision = decision;

      if (!decision.allowed) {
        throw new AppError("ERR_ACCESS_DENIED", null, {
          message: `Access denied to ${requestedMethod} ${requestedPath}`,
          level: "access",
          userId: user.sub,
          requestedPath,
          requestedMethod,
          reason: decision.reason,
          deniedBy: decision.deniedBy,
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

const authorization = createAuthorizationMiddleware();

module.exports = {
  authorization,
  clearPermissionCache,
  createAuthorizationMiddleware,
  defaultAbacEngine,
  defaultPolicyRegistry,
  permissionCacheKey,
};
