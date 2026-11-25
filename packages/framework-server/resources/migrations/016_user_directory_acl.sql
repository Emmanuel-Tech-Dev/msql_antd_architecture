-- The Users page reads one directory endpoint that combines each user's
-- roles, permission overrides and access state.

START TRANSACTION;

INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `alias`, `createdAt`, `updatedAt`)
VALUES
  ('read:user_directory', 'Read the user directory', 'Read user directory', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`, `show_in_nav`)
VALUES
  ('read:user:directory', 'API_ENDPOINT', '/api/v1/users/directory', 'GET', 'Read the user directory', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0);

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('read:user_directory', 'read:user:directory', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_role_permissions`
  (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT
  role.`role_name`,
  'read:user_directory',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `admin_roles` AS role
WHERE LOWER(TRIM(role.`role_name`)) IN ('superadmin', 'dev');

COMMIT;
