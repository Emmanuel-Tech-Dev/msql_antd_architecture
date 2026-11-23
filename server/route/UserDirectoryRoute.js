const db = require("../core/config/conn");

const ACCESS_STATES = [
  "READY",
  "SETUP_REQUIRED",
  "NO_ROLE",
  "TEMPORARY_AUTHORITY",
  "SUSPENDED",
];

const SORT_COLUMNS = {
  name: "directory.name",
  role_name: "directory.system_role",
  permission_count: "directory.effective_permission_count",
  access_state: "directory.access_state",
  last_login: "directory.last_login",
  createdAt: "directory.createdAt",
};

function positiveInteger(value, fallback, maximum = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function csv(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function placeholders(values) {
  return values.map(() => "?").join(", ");
}

function directoryCte() {
  return `WITH system_role_rollup AS (
      SELECT aur.user_id,
             COUNT(DISTINCT aur.role_id) AS system_role_count,
             GROUP_CONCAT(DISTINCT aur.role_id ORDER BY aur.role_id SEPARATOR '||') AS system_roles,
             SUBSTRING_INDEX(
               GROUP_CONCAT(DISTINCT aur.role_id ORDER BY aur.role_id SEPARATOR '||'),
               '||',
               1
             ) AS system_role
        FROM admin_user_roles aur
       GROUP BY aur.user_id
    ), inherited_permissions AS (
      SELECT DISTINCT aur.user_id, arp.permission
        FROM admin_user_roles aur
        JOIN admin_role_permissions arp ON arp.role_id = aur.role_id
    ), default_permission_rollup AS (
      SELECT user_id, COUNT(*) AS default_permission_count
        FROM inherited_permissions
       GROUP BY user_id
    ), active_user_overrides AS (
      SELECT override_row.*
        FROM admin_user_permission_overrides override_row
       WHERE (override_row.valid_from IS NULL OR override_row.valid_from <= NOW())
         AND (override_row.valid_until IS NULL OR override_row.valid_until > NOW())
    ), direct_permission_rollup AS (
      SELECT override_row.user_id,
             COUNT(DISTINCT CASE
               WHEN override_row.effect = 'ALLOW' AND inherited.permission IS NULL
               THEN override_row.permission END) AS additional_permission_count,
             COUNT(DISTINCT CASE
               WHEN override_row.effect = 'DENY' AND inherited.permission IS NOT NULL
               THEN override_row.permission END) AS denied_permission_count,
             COUNT(DISTINCT CASE
               WHEN override_row.valid_until IS NOT NULL
               THEN override_row.permission END) AS active_temporary_count
        FROM active_user_overrides override_row
        LEFT JOIN inherited_permissions inherited
          ON inherited.user_id = override_row.user_id
         AND inherited.permission = override_row.permission
       GROUP BY override_row.user_id
    )`;
}

function directorySelect() {
  return `SELECT a.id, a.custom_id, a.name, a.email, a.phone_no, a.avatar,
           a.profile_picture, a.status, a.forced_password_change,
           a.oauth_provider, a.last_login, a.createdAt,
           COALESCE(srr.system_role_count, 0) AS system_role_count,
           srr.system_roles, srr.system_role,
           COALESCE(dpr.default_permission_count, 0) AS default_permission_count,
           COALESCE(xpr.additional_permission_count, 0) AS additional_permission_count,
           COALESCE(xpr.denied_permission_count, 0) AS denied_permission_count,
           COALESCE(xpr.active_temporary_count, 0) AS active_temporary_count,
           GREATEST(
             COALESCE(dpr.default_permission_count, 0)
             + COALESCE(xpr.additional_permission_count, 0)
             - COALESCE(xpr.denied_permission_count, 0),
             0
           ) AS effective_permission_count,
           CASE
             WHEN a.status <> 1 THEN 'SUSPENDED'
             WHEN a.forced_password_change = 1 THEN 'SETUP_REQUIRED'
             WHEN COALESCE(srr.system_role_count, 0) = 0 THEN 'NO_ROLE'
             WHEN COALESCE(xpr.active_temporary_count, 0) > 0 THEN 'TEMPORARY_AUTHORITY'
             ELSE 'READY'
           END AS access_state
      FROM admin a
      LEFT JOIN system_role_rollup srr ON srr.user_id = a.custom_id
      LEFT JOIN default_permission_rollup dpr ON dpr.user_id = a.custom_id
      LEFT JOIN direct_permission_rollup xpr ON xpr.user_id = a.custom_id`;
}

class UserDirectoryRoute {
  constructor(app) {
    app.get("/api/v1/users/directory", this.list.bind(this));
  }

  async list(req, res, next) {
    try {
      const page = positiveInteger(req.query.page, 1, 100000);
      const limit = positiveInteger(req.query.limit, 10, 100);
      const offset = (page - 1) * limit;
      const roleNames = csv(
        req.query.role_name_in ?? req.query.role_id_in ?? req.query.role_name,
      );
      const permissionStates = csv(
        req.query.permission_state_in ?? req.query.permission_state,
      );
      const accessStates = csv(
        req.query.access_state_in ?? req.query.access_state,
      ).filter((value) => ACCESS_STATES.includes(value));
      const search = String(req.query.search ?? "").trim();
      const sortColumn = SORT_COLUMNS[req.query.sort_by] ?? SORT_COLUMNS.name;
      const sortDirection = String(req.query.sort_order ?? "ASC").toUpperCase() === "DESC"
        ? "DESC"
        : "ASC";

      const conditions = [];
      const params = [];
      if (search) {
        conditions.push(`(
          directory.name LIKE ?
          OR directory.email LIKE ?
          OR directory.phone_no LIKE ?
          OR directory.custom_id LIKE ?
        )`);
        params.push(...Array(4).fill(`%${search}%`));
      }
      if (roleNames.length) {
        conditions.push(`EXISTS (
          SELECT 1
            FROM admin_user_roles filter_role
           WHERE filter_role.user_id = directory.custom_id
             AND filter_role.role_id IN (${placeholders(roleNames)})
        )`);
        params.push(...roleNames);
      }
      if (permissionStates.includes("WITH_ADDITIONAL")) {
        conditions.push("directory.additional_permission_count > 0");
      }
      if (permissionStates.includes("WITH_TEMPORARY")) {
        conditions.push("directory.active_temporary_count > 0");
      }
      if (permissionStates.includes("DEFAULT_ONLY")) {
        conditions.push(
          "directory.additional_permission_count = 0 AND directory.active_temporary_count = 0",
        );
      }

      const stateCountConditions = [...conditions];
      const stateCountParams = [...params];
      if (accessStates.length) {
        conditions.push(`directory.access_state IN (${placeholders(accessStates)})`);
        params.push(...accessStates);
      }

      const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
      const stateCountWhere = stateCountConditions.length
        ? `WHERE ${stateCountConditions.join(" AND ")}`
        : "";
      const cte = directoryCte();
      const select = directorySelect();

      const [[countRows], [rows], [stateCountRows], [roles]] = await Promise.all([
        db.query(
          `${cte} SELECT COUNT(*) AS total FROM (${select}) directory ${where}`,
          params,
        ),
        db.query(
          `${cte} SELECT * FROM (${select}) directory ${where}
            ORDER BY ${sortColumn} ${sortDirection}, directory.custom_id ASC
            LIMIT ? OFFSET ?`,
          [...params, limit, offset],
        ),
        db.query(
          `${cte} SELECT directory.access_state, COUNT(*) AS total
             FROM (${select}) directory ${stateCountWhere}
            GROUP BY directory.access_state`,
          stateCountParams,
        ),
        db.query(
          "SELECT role_name AS value, role_name AS label, description FROM admin_roles ORDER BY role_name",
        ),
      ]);

      const total = Number(countRows[0]?.total ?? 0);
      const pageCounts = stateCountRows.reduce((result, row) => {
        result[row.access_state] = Number(row.total);
        return result;
      }, {});

      return res.json({
        success: true,
        data: {
          data: rows.map((row) => ({
            ...row,
            system_roles: row.system_roles ? row.system_roles.split("||") : [],
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          meta: {
            roles,
            accessStates: ACCESS_STATES.map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            })),
            pageCounts,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = UserDirectoryRoute;
