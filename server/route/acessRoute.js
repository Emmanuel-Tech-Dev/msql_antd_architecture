const Model = require("../core/model/model");
const { clearPermissionCache } = require("../core/middleware/authorization");
const AppError = require("../shared/helpers/AppError");
const authorizationEvents = require("../core/lib/authorizationEvents");
const logger = require("../shared/helpers/logger");
const {
  loadBrowserRouteAuthority,
  loadUserAuthority,
  resolveOverrides,
} = require("../core/lib/authorityService");

const MANAGE_AUTHORITY_PERMISSION = "manage:user_authority";
const EFFECTS = new Set(["ALLOW", "DENY"]);

function normalizeAuthorityRows(rows, key) {
  if (!Array.isArray(rows) || rows.length > 1000) {
    throw new AppError("ERR_VALIDATION_FAILED", "Authority overrides must be a list of no more than 1000 entries");
  }

  const seen = new Set();
  return rows.map((row) => {
    const target = String(row?.[key] ?? "").trim();
    const effect = String(row?.effect ?? "").trim().toUpperCase();
    if (!target || !EFFECTS.has(effect)) {
      throw new AppError("ERR_VALIDATION_FAILED", "Each authority override requires a valid target and effect");
    }
    if (seen.has(target)) {
      throw new AppError("ERR_VALIDATION_FAILED", `Duplicate authority override: ${target}`);
    }
    seen.add(target);
    return { [key]: target, effect };
  });
}

function normalizeExpiry(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    throw new AppError("ERR_VALIDATION_FAILED", "Authority expiration must be a valid future date");
  }
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

class AccessRoute {
  constructor(app) {
    this.app = app;
    this.getUsersByRole(app);
    this.getPermissions(app);
    this.getRoutes(app);
    this.getUserInfo(app);
    this.getUserAuthority(app);
    this.saveUserAuthority(app);
    this.savePermissions(app);
    this.saveRoutes(app);
    this.toggleUserStatus(app);
    this.assignedRoles(app);

    return this;
  }

  getUserAuthority(app) {
    app.get("/access/user_authority/:user", async (req, res, next) => {
      try {
        const userId = String(req.params.user ?? "").trim();
        const [user] = await new Model()
          .select(["custom_id", "name", "email", "status"], "admin")
          .where("custom_id", "=", userId)
          .execute();
        if (!user) throw new AppError("ERR_USER_NOT_FOUND");

        const permissionAuthority = await loadUserAuthority(userId);
        const routeAuthority = await loadBrowserRouteAuthority(
          userId,
          permissionAuthority.userRoles,
        );
        const allPermissions = await new Model()
          .select(["permission_name", "description", "alias"], "admin_permissions")
          .orderBy("permission_name", "ASC")
          .execute();

        return res.json({
          success: true,
          data: {
            user,
            roles: permissionAuthority.userRoles,
            privileged: permissionAuthority.privileged,
            allPermissions,
            permissionOverrides: permissionAuthority.permissionOverrides,
            inheritedPermissions: permissionAuthority.inheritedPermissions,
            directPermissionAllows: permissionAuthority.directPermissionAllows,
            directPermissionDenies: permissionAuthority.directPermissionDenies,
            effectivePermissions: permissionAuthority.effectivePermissions,
            allRoutes: routeAuthority.allRoutes,
            routeOverrides: routeAuthority.routeOverrides,
            inheritedRoutes: routeAuthority.inheritedRoutes,
            directRouteAllows: routeAuthority.directRouteAllows,
            directRouteDenies: routeAuthority.directRouteDenies,
            effectiveRoutes: routeAuthority.effectiveRouteNames,
          },
        });
      } catch (error) {
        return next(error);
      }
    });
  }

  saveUserAuthority(app) {
    app.post("/access/user_authority/save", async (req, res, next) => {
      try {
        const userId = String(req.body?.user_id ?? "").trim();
        const reason = String(req.body?.reason ?? "").trim();
        if (!userId) throw new AppError("ERR_MISSING_REQUIRED_FIELD", "A target user is required");
        if (reason.length < 8 || reason.length > 500) {
          throw new AppError("ERR_VALIDATION_FAILED", "Provide an audit reason between 8 and 500 characters");
        }

        const permissionOverrides = normalizeAuthorityRows(
          req.body?.permissionOverrides ?? [],
          "permission",
        );
        const routeOverrides = normalizeAuthorityRows(
          req.body?.routeOverrides ?? [],
          "resource",
        );
        const validUntil = normalizeExpiry(req.body?.valid_until);
        const grantorId = req.user.sub;

        const [targetUser] = await new Model()
          .select(["custom_id", "name", "email"], "admin")
          .where("custom_id", "=", userId)
          .execute();
        if (!targetUser) throw new AppError("ERR_USER_NOT_FOUND");

        const targetAuthority = await loadUserAuthority(userId);
        if (targetAuthority.privileged && !req.isPrivileged) {
          throw new AppError("ERR_ACCESS_DENIED", "Only a privileged system role can manage authority for a privileged user");
        }
        if (grantorId === userId && !req.isPrivileged) {
          throw new AppError("ERR_ACCESS_DENIED", "You cannot modify your own direct authority");
        }

        const allPermissionRows = await new Model()
          .select(["permission_name"], "admin_permissions")
          .execute();
        const validPermissions = new Set(allPermissionRows.map((row) => row.permission_name));
        const unknownPermission = permissionOverrides.find((row) => !validPermissions.has(row.permission));
        if (unknownPermission) {
          throw new AppError("ERR_VALIDATION_FAILED", `Unknown permission: ${unknownPermission.permission}`);
        }

        const allRouteRows = await new Model()
          .select(["resource", "is_public"], "admin_resources")
          .where("resource_type", "=", "BROWSER_ROUTE")
          .execute();
        const validRoutes = new Set(allRouteRows.map((row) => row.resource));
        const unknownRoute = routeOverrides.find((row) => !validRoutes.has(row.resource));
        if (unknownRoute) {
          throw new AppError("ERR_VALIDATION_FAILED", `Unknown browser route: ${unknownRoute.resource}`);
        }
        const publicRoutes = new Set(
          allRouteRows
            .filter((row) => [true, 1, "1", "true"].includes(row.is_public))
            .map((row) => row.resource),
        );
        const publicRouteOverride = routeOverrides.find((row) => publicRoutes.has(row.resource));
        if (publicRouteOverride) {
          throw new AppError("ERR_VALIDATION_FAILED", "Authenticated-public routes cannot be overridden per user");
        }

        // Delegation ceiling: non-privileged managers can grant only authority
        // they currently possess. The management capability itself is reserved
        // so it cannot recursively manufacture more authority managers.
        if (!req.isPrivileged) {
          const grantorPermissions = new Set(req.permissions ?? []);
          const currentTargetPermissions = new Set(targetAuthority.effectivePermissions);
          const proposedTargetPermissions = resolveOverrides(
            targetAuthority.inheritedPermissions.map((permission) => ({ permission })),
            permissionOverrides,
            "permission",
          ).effective;
          const invalidGrant = proposedTargetPermissions.find(
            (permission) => !currentTargetPermissions.has(permission)
              && (permission === MANAGE_AUTHORITY_PERMISSION || !grantorPermissions.has(permission)),
          );
          if (invalidGrant) {
            throw new AppError("ERR_ACCESS_DENIED", "You cannot delegate authority that you do not possess");
          }

          const grantorRoutes = await loadBrowserRouteAuthority(grantorId, req.roles);
          const grantorRouteNames = new Set(grantorRoutes.effectiveRouteNames);
          const targetRoutes = await loadBrowserRouteAuthority(userId, targetAuthority.userRoles);
          const currentTargetRoutes = new Set(targetRoutes.effectiveRouteNames);
          const proposedTargetRoutes = resolveOverrides(
            targetRoutes.inheritedRoutes.map((resource) => ({ resource })),
            routeOverrides,
            "resource",
          ).effective;
          const invalidRouteGrant = proposedTargetRoutes.find(
            (resource) => !currentTargetRoutes.has(resource) && !grantorRouteNames.has(resource),
          );
          if (invalidRouteGrant) {
            throw new AppError("ERR_ACCESS_DENIED", "You cannot delegate a browser route that you cannot access");
          }
        }

        await new Model().transaction(async (transaction) => {
          await transaction.query(
            "DELETE FROM admin_user_permission_overrides WHERE user_id = ?",
            [userId],
          );
          await transaction.query(
            "DELETE FROM admin_user_browser_route_overrides WHERE user_id = ?",
            [userId],
          );

          if (permissionOverrides.length) {
            await transaction.query(
              `INSERT INTO admin_user_permission_overrides
                (user_id, permission, effect, reason, granted_by, valid_from, valid_until)
               VALUES ${permissionOverrides.map(() => "(?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)").join(", ")}`,
              permissionOverrides.flatMap((row) => [
                userId,
                row.permission,
                row.effect,
                reason,
                grantorId,
                validUntil,
              ]),
            );
          }

          if (routeOverrides.length) {
            await transaction.query(
              `INSERT INTO admin_user_browser_route_overrides
                (user_id, resource, effect, reason, granted_by, valid_from, valid_until)
               VALUES ${routeOverrides.map(() => "(?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)").join(", ")}`,
              routeOverrides.flatMap((row) => [
                userId,
                row.resource,
                row.effect,
                reason,
                grantorId,
                validUntil,
              ]),
            );
          }
        });

        clearPermissionCache(userId);
        authorizationEvents.publish([userId], "user-authority-changed");
        logger.security("User authority overrides updated", {
          operation: "user-authority.update",
          actorUserId: grantorId,
          targetUserId: userId,
          permissionOverrideCount: permissionOverrides.length,
          routeOverrideCount: routeOverrides.length,
          expires: validUntil,
          requestId: req.requestId,
        });

        return res.json({
          success: true,
          message: "User authority updated",
          data: {
            user_id: userId,
            permissionOverrideCount: permissionOverrides.length,
            routeOverrideCount: routeOverrides.length,
          },
        });
      } catch (error) {
        return next(error);
      }
    });
  }

  getUsersByRole(app) {
    app.get("/access/users/:role_name", async (req, res) => {
      const { role_name } = req.params;
      const data = await new Model()
        .multiSelect([
          { table: "admin", columns: ["email", "name", "phone_no"] },
          { table: "admin_user_roles", columns: [] }, // No room columns, just for joining
        ])
        //  .addAggregate("SUM", "rooms.room_capacity", "total_capacity") // Won't work - need custom approach
        .join(
          "INNER",
          "admin_user_roles",
          "admin.custom_id",
          "admin_user_roles.user_id",
        )
        .where("admin_user_roles.role_id", "=", role_name)
        .execute();

      res.json({ success: true, data });
    });
  }

  getPermissions(app) {
    app.get("/access/permissions/:role_name", async (req, res) => {
      const { role_name } = req.params;

      //First step is to fetch all permissions in the system

      const assigned = await new Model()
        .select(["permission"], "admin_role_permissions")
        .where("role_id", "=", role_name)
        .execute();
      //Second is to fetch all this permissions assigned to a role

      res.json({ success: true, data: { assigned } });
    });
  }

  getRoutes(app) {
    app.get("/access/routes/:role_name", async (req, res) => {
      const { role_name } = req.params;

      //First step is to fetch all routes in the system

      const assigned = await new Model()
        .multiSelect([
          {
            table: "admin_role_browser_routes",
            columns: ["resource"],
          },
          { table: "admin_resources", columns: ["resource_path"] },
        ])
        .join(
          "INNER",
          "admin_resources",
          "admin_role_browser_routes.resource",
          "admin_resources.resource",
        )
        .where(
          [
            {
              column: "admin_role_browser_routes.role_id",
              operator: "=",
              value: role_name,
            },
            {
              column: "admin_resources.resource_type",
              operator: "=",
              value: "BROWSER_ROUTE",
            },
          ],
          "=",
          "AND",
        )
        .execute();
      //Second is to fetch all this permissions assigned to a role

      res.json({ success: true, data: { assigned } });
    });
  }

  getUserInfo(app) {
    app.get("/access/user_info/:user", async (req, res) => {
      const { user } = req.params;
      const custom_id = user;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      // ── 1. ROLES ──────────────────────────────────────────────────────────
      // Which roles is this user assigned?
      const rolesQuery = new Model()
        .select(["role_id"], "admin_user_roles")
        .where("user_id", "=", custom_id)
        .execute();

      // ── 2a. STAT — login count (last 30 days) ─────────────────────────────
      const loginCountQuery = new Model()
        .aggregate("COUNT", "*", "login_count")
        .from("user_activity_logs")
        .where("user_id", "=", custom_id)
        .where("activity_type", "=", "Login")
        .where("created_at", ">=", thirtyDaysAgo)
        .execute();

      // ── 2b. STAT — password reset count ──────────────────────────────────
      // admin_credentials.reset_limit tracks total resets used
      const credentialsQuery = new Model()
        .select(["reset_limit", "last_reset_attempt"], "admin_credentials")
        .where("admin_custom_id", "=", custom_id)
        .first();

      // ── 2c. STAT — total distinct permissions (via roles) ─────────────────
      const authorityQuery = loadUserAuthority(custom_id);

      // ── 2d. STAT — browser routes count (via roles) ───────────────────────
      const routeAuthorityQuery = authorityQuery.then((authority) =>
        loadBrowserRouteAuthority(custom_id, authority.userRoles));

      // ── 3. ACTIVITIES — top 5 most recent ────────────────────────────────
      const activitiesQuery = new Model()
        .select(
          [
            "id",
            "activity_type",
            "title",
            "description",
            "ip_address",
            "user_agent",
            "created_at",
          ],
          "user_activity_logs",
        )
        .where("user_id", "=", custom_id)
        .orderBy("created_at", "DESC")
        .limit(5)
        .execute();

      // ── 4. PERMISSIONS — flat distinct list from all assigned roles ───────
      const permissionsQuery = authorityQuery.then((authority) =>
        authority.effectivePermissions.map((permission) => ({ permission })));

      // ── 5. BROWSER ROUTES — pages this user can access ───────────────────
      const routesQuery = routeAuthorityQuery.then((authority) => authority.effectiveRoutes);

      // ── Fire all 8 queries concurrently ──────────────────────────────────
      const [
        roles,
        loginCountRows,
        credentials,
        authority,
        routeAuthority,
        activities,
        permissions,
        routes,
      ] = await Promise.all([
        rolesQuery, // 1. roles
        loginCountQuery, // 2a. login count
        credentialsQuery, // 2b. pwd reset count
        authorityQuery,
        routeAuthorityQuery,
        activitiesQuery, // 3. recent activities
        permissionsQuery, // 4. permission list
        routesQuery, // 5. browser routes
      ]);

      // ── Shape the stats object ────────────────────────────────────────────

      const stats = [
        { label: "Logins (30d)", value: loginCountRows?.[0]?.login_count ?? 0 },
        { label: "Pwd resets", value: credentials?.reset_limit ?? 0 },
        {
          label: "Permissions",
          value: authority.effectivePermissions.length,
        },
        { label: "Routes", value: routeAuthority.effectiveRoutes.length },
      ];

      return res.json({
        success: true,
        data: {
          roles, // [{ role_id: "SuperAdmin" }, { role_id: "Admin" }]
          stats, // { logins_30d, pwd_resets, permissions, routes }
          activities, // top 5 rows from user_activity_logs
          permissions, // [{ permission: "read:user" }, ...]
          routes, // [{ id, resource, resource_path, icon, category, display_order }]
        },
      });
    });
  }

  savePermissions(app) {
    app.post("/access/permissions/save", async (req, res, next) => {
      try {
        const { role, permissions } = req.body;
        // permissions = full effective list e.g. ["create:admin", "read:roles"]

        // 1. Get currently assigned permissions for this role
        const existing = await new Model()
          .select(["permission"], "admin_role_permissions")
          .where("role_id", "=", role)
          .execute();

        const existingSet = new Set(existing.map((r) => r.permission));
        const incomingSet = new Set(permissions);

        // 2. Diff — what needs to be inserted vs deleted
        const toInsert = permissions.filter((p) => !existingSet.has(p));
        const toDelete = [...existingSet].filter((p) => !incomingSet.has(p));

        // 3. Run both in parallel
        await Promise.all([
          toInsert.length > 0
            ? new Model().raw(
                `INSERT INTO admin_role_permissions (role_id, permission)
                         VALUES ${toInsert.map(() => "(?, ?)").join(", ")}`,
                toInsert.flatMap((p) => [role, p]),
              )
            : Promise.resolve(),

          toDelete.length > 0
            ? new Model().raw(
                `DELETE FROM admin_role_permissions
                         WHERE role_id = ? AND permission IN (${toDelete.map(() => "?").join(", ")})`,
                [role, ...toDelete],
              )
            : Promise.resolve(),
        ]);

        // 4. Clear the permission cache for all users with this role
        // so authorization middleware picks up changes immediately
        const affected = await new Model()
          .select(["user_id"], "admin_user_roles")
          .where("role_id", "=", role)
          .execute();

        affected.forEach((u) => clearPermissionCache(u.user_id));
        authorizationEvents.publish(
          affected.map((user) => user.user_id),
          "permissions-changed",
        );

        res.json({
          success: true,
          inserted: toInsert.length,
          deleted: toDelete.length,
        });
      } catch (error) {
        return next(error);
      }
    });
  }

  saveRoutes(app) {
    app.post("/access/routes/save", async (req, res, next) => {
      try {
        const { role, routes } = req.body;
        // routes = full effective list e.g. ["Dashboard", "Users", "Settings"]

        // 1. Get currently assigned routes for this role
        const existing = await new Model()
          .select(["resource"], "admin_role_browser_routes")
          .where("role_id", "=", role)
          .execute();

        const existingSet = new Set(existing.map((r) => r.resource));
        const incomingSet = new Set(routes);

        // 2. Diff — what needs to be inserted vs deleted
        const toInsert = routes.filter((r) => !existingSet.has(r));
        const toDelete = [...existingSet].filter((r) => !incomingSet.has(r));

        // 3. Run both in parallel
        await Promise.all([
          toInsert.length > 0
            ? new Model().raw(
                `INSERT INTO admin_role_browser_routes (role_id, resource)
                         VALUES ${toInsert.map(() => "(?, ?)").join(", ")}`,
                toInsert.flatMap((r) => [role, r]),
              )
            : Promise.resolve(),

          toDelete.length > 0
            ? new Model().raw(
                `DELETE FROM admin_role_browser_routes
                         WHERE role_id = ? AND resource IN (${toDelete.map(() => "?").join(", ")})`,
                [role, ...toDelete],
              )
            : Promise.resolve(),
        ]);

        // 4. Clear the permission cache for all users with this role
        // so authorization middleware picks up changes immediately
        const affected = await new Model()
          .select(["user_id"], "admin_user_roles")
          .where("role_id", "=", role)
          .execute();

        affected.forEach((u) => clearPermissionCache(u.user_id));
        authorizationEvents.publish(
          affected.map((user) => user.user_id),
          "routes-changed",
        );

        res.json({
          success: true,
          inserted: toInsert.length,
          deleted: toDelete.length,
        });
      } catch (error) {
        return next(error);
      }
    });
  }

  toggleUserStatus(app) {
    app.post("/access/user/toggle_status", async (req, res) => {
      const { custom_id } = req.body;

      const [user] = await new Model()
        .select(["status"], "admin")
        .where("custom_id", "=", custom_id)
        .execute();

      if (!user) {
        throw new AppError("User not found");
      }

      const newStatus = user.status ? 0 : 1;

      await new Model()
        .update("admin", { status: newStatus })
        .where("custom_id", "=", custom_id)
        .execute();

      return res
        .status(200)
        .json({ message: "Operation successfull!", status: "ok" });
    });
  }

  assignedRoles(app) {
    app.post("/access/assign/roles", async (req, res) => {
      const { custom_id, role } = req.body;

      // console.log("Assigning role", role, "to user", custom_id);
      // return;

      // 1. Check if user exists
      const [existingRoles] = await new Model()
        .select(["user_id"], "admin_user_roles")
        .where("user_id", "=", custom_id)
        .execute();

      if (existingRoles) {
        await new Model()
          .update("admin_user_roles", { role_id: role })
          .where("user_id", "=", custom_id)
          .execute();
      } else {
        await new Model()
          .insert("admin_user_roles", { user_id: custom_id, role_id: role })
          .execute();
      }

      clearPermissionCache(custom_id);
      authorizationEvents.publish([custom_id], "roles-changed");

      return res
        .status(200)
        .json({ message: "Operation successfull!", status: "ok" });
    });
  }
}

module.exports = AccessRoute;
