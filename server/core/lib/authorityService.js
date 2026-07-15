const Model = require("../model/model");
const { isPrivilegedSystemRole } = require("./authorizationPolicy");

const OVERRIDE_EFFECTS = new Set(["ALLOW", "DENY"]);

function normalizeName(value) {
  return String(value ?? "").trim();
}

function uniqueNames(rows, key) {
  return [...new Set((rows ?? []).map((row) => normalizeName(row?.[key] ?? row)).filter(Boolean))];
}

function isOverrideActive(override, now = new Date()) {
  const nowValue = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const fromValue = override?.valid_from ? new Date(override.valid_from).getTime() : null;
  const untilValue = override?.valid_until ? new Date(override.valid_until).getTime() : null;
  if (fromValue !== null && (!Number.isFinite(fromValue) || fromValue > nowValue)) return false;
  if (untilValue !== null && (!Number.isFinite(untilValue) || untilValue <= nowValue)) return false;
  return OVERRIDE_EFFECTS.has(normalizeName(override?.effect).toUpperCase());
}

function resolveOverrides(baseNames, overrides, key, { privileged = false, now = new Date() } = {}) {
  const inherited = uniqueNames(baseNames, key);
  const activeOverrides = (overrides ?? []).filter((row) => isOverrideActive(row, now));
  const directAllows = uniqueNames(
    activeOverrides.filter((row) => normalizeName(row.effect).toUpperCase() === "ALLOW"),
    key,
  );
  const directDenies = uniqueNames(
    activeOverrides.filter((row) => normalizeName(row.effect).toUpperCase() === "DENY"),
    key,
  );

  // System-role bypass is intentionally role-only. User override rows cannot
  // create it, and override denies do not make privileged roles unpredictable.
  const effective = new Set(inherited);
  if (!privileged) {
    directAllows.forEach((name) => effective.add(name));
    directDenies.forEach((name) => effective.delete(name));
  }

  return {
    inherited,
    directAllows: privileged ? [] : directAllows,
    directDenies: privileged ? [] : directDenies,
    effective: [...effective],
    activeOverrides: privileged ? [] : activeOverrides,
    overridesApplied: !privileged,
  };
}

async function loadUserAuthority(userId) {
  const userRoles = await new Model()
    .select(["user_id", "role_id"], "admin_user_roles")
    .where("user_id", "=", userId)
    .execute();
  const roleNames = uniqueNames(userRoles, "role_id");
  const rolePermissionRows = roleNames.length
    ? await new Model()
        .select(["permission"], "admin_role_permissions")
        .whereIn("role_id", roleNames)
        .execute()
    : [];
  const overrideRows = await new Model()
    .select(
      ["id", "permission", "effect", "reason", "granted_by", "valid_from", "valid_until", "createdAt", "updatedAt"],
      "admin_user_permission_overrides",
    )
    .where("user_id", "=", userId)
    .execute();
  const privileged = isPrivilegedSystemRole(userRoles);
  const permissionAuthority = resolveOverrides(
    rolePermissionRows,
    overrideRows,
    "permission",
    { privileged },
  );
  const permissionResources = permissionAuthority.effective.length
    ? await new Model()
        .select(["resource"], "admin_permission_resources")
        .whereIn("permission", permissionAuthority.effective)
        .execute()
    : [];
  const resourceNames = uniqueNames(permissionResources, "resource");
  const resources = resourceNames.length
    ? await new Model()
        .select(["*"], "admin_resources")
        .where("resource_type", "=", "API_ENDPOINT")
        .whereIn("resource", resourceNames)
        .execute()
    : [];

  return {
    userRoles,
    roleNames,
    privileged,
    resources,
    permissionOverrides: overrideRows,
    inheritedPermissions: permissionAuthority.inherited,
    directPermissionAllows: permissionAuthority.directAllows,
    directPermissionDenies: permissionAuthority.directDenies,
    effectivePermissions: permissionAuthority.effective,
  };
}

async function loadBrowserRouteAuthority(userId, userRoles = []) {
  const roleNames = uniqueNames(userRoles, "role_id");
  const privileged = isPrivilegedSystemRole(userRoles);
  const allRoutes = await new Model()
    .select(
      ["id", "resource", "resource_path", "icon", "is_public", "display_order", "category", "show_in_nav", "description"],
      "admin_resources",
    )
    .where("resource_type", "=", "BROWSER_ROUTE")
    .execute();
  const roleRouteRows = roleNames.length
    ? await new Model()
        .select(["resource"], "admin_role_browser_routes")
        .whereIn("role_id", roleNames)
        .execute()
    : [];
  const overrideRows = await new Model()
    .select(
      ["id", "resource", "effect", "reason", "granted_by", "valid_from", "valid_until", "createdAt", "updatedAt"],
      "admin_user_browser_route_overrides",
    )
    .where("user_id", "=", userId)
    .execute();
  const publicNames = uniqueNames(
    allRoutes.filter((route) => [true, 1, "1", "true"].includes(route.is_public)),
    "resource",
  );
  const publicSet = new Set(publicNames);
  const baseRows = privileged
    ? allRoutes
    : [...roleRouteRows, ...publicNames.map((resource) => ({ resource }))];
  const applicableOverrides = overrideRows.filter((row) => !publicSet.has(row.resource));
  const routeAuthority = resolveOverrides(baseRows, applicableOverrides, "resource", { privileged });
  const effectiveSet = new Set(routeAuthority.effective);

  return {
    allRoutes,
    routeOverrides: overrideRows,
    inheritedRoutes: routeAuthority.inherited,
    directRouteAllows: routeAuthority.directAllows,
    directRouteDenies: routeAuthority.directDenies,
    effectiveRouteNames: routeAuthority.effective,
    effectiveRoutes: allRoutes
      .filter((route) => effectiveSet.has(route.resource))
      .sort((left, right) => Number(left.display_order ?? 0) - Number(right.display_order ?? 0)),
  };
}

module.exports = {
  isOverrideActive,
  loadBrowserRouteAuthority,
  loadUserAuthority,
  normalizeName,
  resolveOverrides,
  uniqueNames,
};
