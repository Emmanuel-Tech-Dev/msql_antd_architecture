-- The metadata builder (Settings › Data model, metadata upgrade phase 5).
-- Every save of a table's metadata is kept as a version: the whole
-- definition (table settings and fields) and a readable list of changes,
-- so it can be compared and restored.

CREATE TABLE IF NOT EXISTS `metadata_versions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(100) NOT NULL,
  `version` INT UNSIGNED NOT NULL,
  `definition` JSON NOT NULL,
  `changes` JSON NULL,
  `changed_by` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_metadata_versions_table_version` (`table_name`, `version`),
  CONSTRAINT `chk_metadata_versions_table` CHECK (`table_name` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

START TRANSACTION;

INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `alias`, `createdAt`, `updatedAt`)
VALUES
  ('manage:metadata', 'Describe tables, design their forms and lists, edit lookups and import records', 'Manage data model', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`, `show_in_nav`)
VALUES
  ('manage:system:metadata', 'API_ENDPOINT', '/api/v1/metadata-admin/*', 'ALL',
   'The metadata builder API', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0),
  ('Data Model', 'BROWSER_ROUTE', '/admin/settings/data-model', 'GET',
   'Describe tables and design their forms, lists and lookups', 'ApartmentOutlined', 0, 95, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Settings', 1);

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('manage:metadata', 'manage:system:metadata', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_role_permissions`
  (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT `role_name`, 'manage:metadata', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `admin_roles`
WHERE LOWER(TRIM(`role_name`)) IN ('superadmin', 'dev');

INSERT IGNORE INTO `admin_role_browser_routes`
  (`role_id`, `resource`)
SELECT `role_name`, 'Data Model'
FROM `admin_roles`
WHERE LOWER(TRIM(`role_name`)) IN ('superadmin', 'dev');

COMMIT;
