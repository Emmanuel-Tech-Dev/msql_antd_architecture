START TRANSACTION;

CREATE TABLE IF NOT EXISTS `ui_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` json NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `version` int unsigned NOT NULL DEFAULT 1,
  `updated_by` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ui_settings_setting_key_unique` (`setting_key`),
  CONSTRAINT `ui_settings_version_positive` CHECK (`version` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `ui_settings`
  (`setting_key`, `setting_value`, `description`, `is_active`, `version`)
VALUES (
  'layout.sider',
  '{"variant":"premium","width":252,"collapsedWidth":76,"breakpoint":"lg","theme":"dark","collapsible":true,"defaultCollapsed":false,"headerHeight":64,"isGrouped":true,"groupKey":"category","groupVariant":"group","orderKey":"order","bottomKey":"/admin/settings/system_logs","defaultHeader":false,"defaultFooter":false,"brand":{"name":"Budget Manager","caption":"Operations Console","mark":"B"},"colors":{"siderBg":"#171512","headerBg":"#fffdf9","contentBg":"#f5f2ee","accent":"#d4570a","accentText":"#ffffff","textPrimary":"rgba(255,255,255,0.92)","textMuted":"rgba(226,218,208,0.62)","border":"rgba(255,255,255,0.10)","itemHover":"rgba(255,255,255,0.07)","itemActive":"rgba(212,87,10,0.18)"}}',
  'Validated visual and behavioral configuration for the authenticated application sidebar',
  1,
  1
);

INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('read:ui_settings', 'Read user-interface configuration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('create:ui_settings', 'Create user-interface configuration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update:ui_settings', 'Update user-interface configuration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete:ui_settings', 'Delete user-interface configuration', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`)
VALUES
  ('read:ui_settings:table', 'API_ENDPOINT', '/api/ui_settings/table', 'GET', 'Read UI settings table', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('read:ui_settings:one', 'API_ENDPOINT', '/api/ui_settings/:id', 'GET', 'Read one UI setting', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('create:ui_settings:one', 'API_ENDPOINT', '/api/ui_settings', 'POST', 'Create a UI setting', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('update:ui_settings:one', 'API_ENDPOINT', '/api/ui_settings/:id', 'PUT', 'Update a UI setting', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('delete:ui_settings:one', 'API_ENDPOINT', '/api/ui_settings/:id', 'DELETE', 'Delete a UI setting', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API');

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('read:ui_settings', 'read:ui_settings:table', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('read:ui_settings', 'read:ui_settings:one', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('create:ui_settings', 'create:ui_settings:one', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('update:ui_settings', 'update:ui_settings:one', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('delete:ui_settings', 'delete:ui_settings:one', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_role_permissions`
  (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT role.`role_name`, permission.`permission_name`, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `admin_roles` AS role
CROSS JOIN `admin_permissions` AS permission
WHERE LOWER(TRIM(role.`role_name`)) IN ('superadmin', 'dev')
  AND permission.`permission_name` IN (
    'read:ui_settings', 'create:ui_settings', 'update:ui_settings', 'delete:ui_settings'
  );

INSERT INTO `tables_metadata` (
  `table_name`, `column_name`, `col_real_name`, `type`, `options`, `extra_options`,
  `backend_visible`, `frontend_visible`, `editable`, `validator`, `icon`, `rank`,
  `group_name`, `disabled`
)
SELECT
  column_info.TABLE_NAME,
  column_info.COLUMN_NAME,
  REPLACE(column_info.COLUMN_NAME, '_', ' '),
  CASE
    WHEN column_info.COLUMN_KEY = 'PRI' THEN 'primaryKey'
    WHEN column_info.COLUMN_NAME = 'setting_value' THEN 'textArea'
    WHEN column_info.COLUMN_NAME = 'is_active' THEN 'jsonSelect'
    WHEN column_info.DATA_TYPE IN ('int', 'bigint', 'smallint', 'tinyint') THEN 'number'
    WHEN column_info.DATA_TYPE IN ('timestamp', 'datetime') THEN 'dateTime'
    ELSE 'text'
  END,
  CASE WHEN column_info.COLUMN_NAME = 'is_active' THEN '{"1":"Active","0":"Inactive"}' ELSE NULL END,
  NULL,
  CASE WHEN column_info.COLUMN_NAME IN ('id', 'createdAt', 'updatedAt') THEN 0 ELSE 1 END,
  CASE WHEN column_info.COLUMN_NAME = 'id' THEN 0 ELSE 1 END,
  CASE WHEN column_info.COLUMN_NAME IN ('id', 'createdAt', 'updatedAt') THEN 0 ELSE 1 END,
  CASE WHEN column_info.IS_NULLABLE = 'NO' AND column_info.COLUMN_DEFAULT IS NULL AND column_info.EXTRA NOT LIKE '%auto_increment%' THEN 'validateEmptyString' ELSE '' END,
  '',
  column_info.ORDINAL_POSITION,
  'UI Settings',
  CASE WHEN column_info.COLUMN_NAME IN ('id', 'createdAt', 'updatedAt') THEN 1 ELSE 0 END
FROM information_schema.COLUMNS AS column_info
WHERE column_info.TABLE_SCHEMA = DATABASE()
  AND column_info.TABLE_NAME = 'ui_settings'
  AND NOT EXISTS (
    SELECT 1 FROM `tables_metadata` AS existing
    WHERE existing.`table_name` = column_info.TABLE_NAME
      AND existing.`column_name` = column_info.COLUMN_NAME
  );

COMMIT;
