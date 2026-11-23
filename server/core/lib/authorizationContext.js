function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function buildHttpAuthorizationContext({
  req,
  authority,
  matchedResources = [],
  accessMode = "PROTECTED",
  now = new Date(),
}) {
  const requestedMethod = String(req?.method ?? "").toUpperCase();
  const requestedPath = String(req?.path ?? req?.originalUrl ?? "").trim();
  const resourceNames = uniqueStrings(matchedResources.map((resource) => resource?.resource));
  const routePatterns = uniqueStrings(matchedResources.map((resource) => resource?.resource_path));
  const primaryResource = matchedResources[0];
  return {
    subject: {
      id: String(req?.user?.sub ?? "").trim(),
      roles: uniqueStrings(authority?.roleNames ?? []),
      permissions: uniqueStrings(authority?.effectivePermissions ?? []),
      privileged: authority?.privileged === true,
      attributes: {
        accountStatus: authority?.account?.status,
        tokenType: req?.user?.type,
        tokenVersion: req?.user?.token_version,
      },
    },
    action: {
      name: primaryResource?.resource || `http:${requestedMethod.toLowerCase()}`,
      method: requestedMethod,
      attributes: {
        resourceNames,
      },
    },
    resource: {
      type: primaryResource?.resource_type || "API_ENDPOINT",
      id: primaryResource?.resource || `${requestedMethod}:${requestedPath}`,
      attributes: {
        requestedPath,
        routePatterns,
        accessMode,
      },
    },
    environment: {
      occurredAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
      requestId: req?.requestId,
      ipAddress: req?.ip,
      userAgent: req?.get?.("user-agent") ?? req?.headers?.["user-agent"],
      scope: { type: "global", id: null },
    },
  };
}

module.exports = { buildHttpAuthorizationContext, uniqueStrings };
