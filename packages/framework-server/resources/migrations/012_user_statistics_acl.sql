START TRANSACTION;

INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('read:admin_statistics', 'Read framework administrator statistics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`)
VALUES
  ('read:admin:statistics', 'API_ENDPOINT', '/api/v1/admin/statistics', 'GET',
   'Read administrator identity and access statistics', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('User Statistics', 'BROWSER_ROUTE', '/admin/management/user-statistics', 'GET',
   'View administrator identity and authentication statistics', 'BarChartOutlined', 0, 45,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Administration');

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('read:admin_statistics', 'read:admin:statistics', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_role_permissions` (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT `role_name`, 'read:admin_statistics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `admin_roles`
WHERE LOWER(TRIM(`role_name`)) IN ('superadmin', 'dev');

INSERT IGNORE INTO `admin_role_browser_routes` (`role_id`, `resource`)
SELECT `role_name`, 'User Statistics'
FROM `admin_roles`
WHERE LOWER(TRIM(`role_name`)) IN ('superadmin', 'dev');

COMMIT;
