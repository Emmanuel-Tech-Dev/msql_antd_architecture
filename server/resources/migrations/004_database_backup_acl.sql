START TRANSACTION;

INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('create:database_backup', 'Create and download complete database backups', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_resources` (
  `resource`, `resource_type`, `resource_path`, `http_method`, `description`,
  `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`
)
VALUES
  ('create:system:database_backup', 'API_ENDPOINT', '/api/v1/system/backups', 'POST',
   'Create or download a complete database backup', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('Database Backup', 'BROWSER_ROUTE', '/admin/settings/database_backup', 'GET',
   'Create and securely store database backups', 'DatabaseOutlined', 0, 90,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Settings');

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('create:database_backup', 'create:system:database_backup', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_role_permissions`
  (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT `role_name`, 'create:database_backup', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `admin_roles`
WHERE LOWER(TRIM(`role_name`)) IN ('superadmin', 'dev');

INSERT IGNORE INTO `admin_role_browser_routes`
  (`role_id`, `resource`)
SELECT `role_name`, 'Database Backup'
FROM `admin_roles`
WHERE LOWER(TRIM(`role_name`)) IN ('superadmin', 'dev');

COMMIT;
