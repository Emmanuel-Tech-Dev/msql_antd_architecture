function normalizePath(value) {
  const path = String(value ?? "").trim();
  if (!path) return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function matchesResourcePath(pattern, requestedPath) {
  const patternParts = normalizePath(pattern).split("/");
  const requestedParts = normalizePath(requestedPath).split("/");

  if (patternParts.at(-1) === "*") {
    if (requestedParts.length < patternParts.length - 1) return false;
  } else if (patternParts.length !== requestedParts.length) {
    return false;
  }

  return patternParts.every((part, index) => {
    if (part === "*" && index === patternParts.length - 1) return true;
    if (part.startsWith(":")) return Boolean(requestedParts[index]);
    return part === requestedParts[index];
  });
}

function matchesHttpMethod(configuredMethod, requestedMethod) {
  const configured = String(configuredMethod ?? "").toUpperCase();
  const requested = String(requestedMethod ?? "").toUpperCase();
  return configured === requested || configured === "*" || configured === "ALL";
}

function canAccessResource(resource, requestedMethod, requestedPath) {
  return (
    matchesHttpMethod(resource?.http_method, requestedMethod) &&
    matchesResourcePath(resource?.resource_path, requestedPath)
  );
}

function isPrivilegedSystemRole(userRoles = []) {
  return userRoles.some((role) => {
    const normalized = String(role?.role_id ?? role).trim().toLowerCase();
    return normalized === "superadmin" || normalized === "dev";
  });
}

module.exports = {
  canAccessResource,
  isPrivilegedSystemRole,
  matchesHttpMethod,
  matchesResourcePath,
  normalizePath,
};
