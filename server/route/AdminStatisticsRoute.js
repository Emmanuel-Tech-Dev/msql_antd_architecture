const Model = require("../core/model/model");

class AdminStatisticsRoute {
  constructor(app) {
    app.get("/api/v1/admin/statistics", async (req, res, next) => {
      try {
        const [overview] = await new Model()
          .select([
            "COUNT(*) AS total_users",
            "SUM(CASE WHEN admin.status = 1 THEN 1 ELSE 0 END) AS active_users",
            "SUM(CASE WHEN admin.status <> 1 OR admin.status IS NULL THEN 1 ELSE 0 END) AS inactive_users",
            "SUM(CASE WHEN admin.oauth_id IS NOT NULL AND admin.oauth_id <> '' THEN 1 ELSE 0 END) AS google_linked_users",
            "SUM(CASE WHEN admin_credentials.password_login_enabled = 1 THEN 1 ELSE 0 END) AS password_enabled_users",
            "SUM(CASE WHEN admin.forced_password_change = 1 THEN 1 ELSE 0 END) AS setup_required_users",
            "SUM(CASE WHEN admin.last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS active_last_30_days",
            "SUM(CASE WHEN admin.createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS created_last_30_days",
          ], "admin")
          .join("LEFT", "admin_credentials", "admin_credentials.admin_custom_id", "admin.custom_id")
          .execute();
        const roles = await new Model()
          .select(["admin_roles.role_name", "COUNT(DISTINCT admin_user_roles.user_id) AS user_count"], "admin_roles")
          .join("LEFT", "admin_user_roles", "admin_user_roles.role_id", "admin_roles.role_name")
          .groupBy("admin_roles.role_name")
          .orderBy("user_count", "DESC")
          .orderBy("admin_roles.role_name", "ASC")
          .execute();
        const registrations = await new Model()
          .select(["DATE(createdAt) AS date", "COUNT(*) AS user_count"], "admin")
          .whereColumns("createdAt", ">=", "DATE_SUB(CURDATE(), INTERVAL 29 DAY)")
          .groupBy("DATE(createdAt)")
          .orderBy("date", "ASC")
          .execute();
        const recentUsers = await new Model()
          .select(["custom_id", "name", "email", "phone_no", "status", "oauth_provider", "forced_password_change", "last_login", "createdAt"], "admin")
          .orderBy("COALESCE(last_login, createdAt)", "DESC")
          .limit(8)
          .execute();

        return res.status(200).json({
          status: "ok",
          data: {
            overview: overview ?? {},
            roles,
            registrations,
            recentUsers,
          },
        });
      } catch (error) {
        return next(error);
      }
    });
  }
}

module.exports = AdminStatisticsRoute;
