const conn = require("../core/config/conn");

class AdminStatisticsRoute {
  constructor(app) {
    app.get("/api/v1/admin/statistics", async (req, res, next) => {
      try {
        const [overviewRows] = await conn.query(`
          SELECT
            COUNT(*) AS total_users,
            SUM(CASE WHEN admin.status = 1 THEN 1 ELSE 0 END) AS active_users,
            SUM(CASE WHEN admin.status <> 1 OR admin.status IS NULL THEN 1 ELSE 0 END) AS inactive_users,
            SUM(CASE WHEN admin.oauth_id IS NOT NULL AND admin.oauth_id <> '' THEN 1 ELSE 0 END) AS google_linked_users,
            SUM(CASE WHEN credentials.password_login_enabled = 1 THEN 1 ELSE 0 END) AS password_enabled_users,
            SUM(CASE WHEN admin.last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS active_last_30_days,
            SUM(CASE WHEN admin.createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS created_last_30_days
          FROM admin
          LEFT JOIN admin_credentials AS credentials
            ON credentials.admin_custom_id = admin.custom_id
        `);
        const [roles] = await conn.query(`
          SELECT role.role_name, COUNT(DISTINCT assignment.user_id) AS user_count
          FROM admin_roles AS role
          LEFT JOIN admin_user_roles AS assignment ON assignment.role_id = role.role_name
          GROUP BY role.role_name
          ORDER BY user_count DESC, role.role_name ASC
        `);
        const [registrations] = await conn.query(`
          SELECT DATE(createdAt) AS date, COUNT(*) AS user_count
          FROM admin
          WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
          GROUP BY DATE(createdAt)
          ORDER BY date ASC
        `);
        const [recentUsers] = await conn.query(`
          SELECT custom_id, name, email, status, oauth_provider, last_login, createdAt
          FROM admin
          ORDER BY COALESCE(last_login, createdAt) DESC
          LIMIT 8
        `);

        return res.status(200).json({
          status: "ok",
          data: {
            overview: overviewRows[0] ?? {},
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
