const Model = require("../core/model/model");

class AccessRoute {
  constructor(app) {
    this.app = app;
    this.getUsersByRole(app);
    this.getPermissions(app);
    this.getUserInfo(app);

    return this;
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
      const permCountQuery = new Model().raw(
        `SELECT COUNT(DISTINCT arp.permission) AS permission_count
         FROM admin_role_permissions arp
         INNER JOIN admin_user_roles aur ON aur.role_id = arp.role_id
         WHERE aur.user_id = ?`,
        [custom_id],
      );

      // ── 2d. STAT — browser routes count (via roles) ───────────────────────
      const routeCountQuery = new Model().raw(
        `SELECT COUNT(DISTINCT ar.id) AS route_count
         FROM admin_resources ar
         INNER JOIN admin_role_permissions arp ON arp.permission = ar.resource
         INNER JOIN admin_user_roles aur        ON aur.role_id   = arp.role_id
         WHERE aur.user_id = ?
           AND ar.resource_type = 'BROWSER_ROUTE'`,
        [custom_id],
      );

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
      const permissionsQuery = new Model().raw(
        `SELECT DISTINCT arp.permission
         FROM admin_role_permissions arp
         INNER JOIN admin_user_roles aur ON aur.role_id = arp.role_id
         WHERE aur.user_id = ?`,
        [custom_id],
      );

      // ── 5. BROWSER ROUTES — pages this user can access ───────────────────
      const routesQuery = new Model().raw(
        `SELECT DISTINCT
           ar.id,
           ar.resource,
           ar.resource_path,
           ar.icon,
           ar.category,
           ar.\`order\`
         FROM admin_resources ar
         INNER JOIN admin_role_permissions arp ON arp.permission = ar.resource
         INNER JOIN admin_user_roles aur        ON aur.role_id   = arp.role_id
         WHERE aur.user_id = ?
           AND ar.resource_type = 'BROWSER_ROUTE'
         ORDER BY ar.\`order\` ASC`,
        [custom_id],
      );

      // ── Fire all 8 queries concurrently ──────────────────────────────────
      const [
        roles,
        loginCountRows,
        credentials,
        permCountRows,
        routeCountRows,
        activities,
        permissions,
        routes,
      ] = await Promise.all([
        rolesQuery, // 1. roles
        loginCountQuery, // 2a. login count
        credentialsQuery, // 2b. pwd reset count
        permCountQuery, // 2c. permission count
        routeCountQuery, // 2d. route count
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
          value: permCountRows?.[0]?.permission_count ?? 0,
        },
        { label: "Routes", value: routeCountRows?.[0]?.route_count ?? 0 },
      ];

      return res.json({
        success: true,
        data: {
          roles, // [{ role_id: "SuperAdmin" }, { role_id: "Admin" }]
          stats, // { logins_30d, pwd_resets, permissions, routes }
          activities, // top 5 rows from user_activity_logs
          permissions, // [{ permission: "read:user" }, ...]
          routes, // [{ id, resource, resource_path, icon, category, order }]
        },
      });
    });
  }
}

module.exports = AccessRoute;
