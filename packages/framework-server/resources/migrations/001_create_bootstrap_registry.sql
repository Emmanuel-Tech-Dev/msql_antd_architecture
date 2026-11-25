-- Database-managed bootstrap registry.
--
-- The UI requests a stable profile key. It never supplies a physical table,
-- column list, or SQL statement. The server resolves and validates the profile
-- and its datasets from these tables before building parameterized queries.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `framework_bootstrap_datasets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dataset_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `source_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `source_type` enum('TABLE','VIEW') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'TABLE',
  `columns_json` json NOT NULL,
  `filterable_columns_json` json DEFAULT NULL,
  `sortable_columns_json` json DEFAULT NULL,
  `base_filters_json` json DEFAULT NULL,
  `default_sort_json` json DEFAULT NULL,
  `max_rows` int unsigned NOT NULL DEFAULT 500,
  `cache_ttl_seconds` int unsigned NOT NULL DEFAULT 300,
  `required_permission` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `environment` enum('all','dev','staging','prod') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'all',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `config_version` int unsigned NOT NULL DEFAULT 1,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bootstrap_dataset_key` (`dataset_key`),
  KEY `idx_bootstrap_dataset_source` (`source_name`, `source_type`),
  KEY `idx_bootstrap_dataset_state` (`enabled`, `environment`),
  KEY `idx_bootstrap_dataset_permission` (`required_permission`),
  CONSTRAINT `chk_bootstrap_dataset_key`
    CHECK (`dataset_key` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'),
  CONSTRAINT `chk_bootstrap_source_name`
    CHECK (`source_name` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'),
  CONSTRAINT `chk_bootstrap_max_rows`
    CHECK (`max_rows` BETWEEN 1 AND 5000),
  CONSTRAINT `chk_bootstrap_cache_ttl`
    CHECK (`cache_ttl_seconds` <= 86400),
  CONSTRAINT `chk_bootstrap_columns_array`
    CHECK (JSON_TYPE(`columns_json`) = 'ARRAY' AND JSON_LENGTH(`columns_json`) > 0),
  CONSTRAINT `fk_bootstrap_dataset_permission`
    FOREIGN KEY (`required_permission`)
    REFERENCES `admin_permissions` (`permission_name`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `framework_bootstrap_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `profile_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `environment` enum('all','dev','staging','prod') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'all',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `config_version` int unsigned NOT NULL DEFAULT 1,
  `created_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `updated_by` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bootstrap_profile_key` (`profile_key`),
  KEY `idx_bootstrap_profile_state` (`enabled`, `environment`),
  CONSTRAINT `chk_bootstrap_profile_key`
    CHECK (`profile_key` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `framework_bootstrap_profile_datasets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `profile_id` bigint unsigned NOT NULL,
  `dataset_id` bigint unsigned NOT NULL,
  `load_order` int unsigned NOT NULL DEFAULT 0,
  `failure_mode` enum('REQUIRED','OPTIONAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'REQUIRED',
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bootstrap_profile_dataset` (`profile_id`, `dataset_id`),
  KEY `idx_bootstrap_profile_load_order` (`profile_id`, `enabled`, `load_order`),
  KEY `idx_bootstrap_profile_dataset` (`dataset_id`),
  CONSTRAINT `fk_bootstrap_profile_dataset_profile`
    FOREIGN KEY (`profile_id`)
    REFERENCES `framework_bootstrap_profiles` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_bootstrap_profile_dataset_dataset`
    FOREIGN KEY (`dataset_id`)
    REFERENCES `framework_bootstrap_datasets` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Preserve the framework's current authenticated bootstrap contract while
-- moving ownership of the definitions into the database.
INSERT IGNORE INTO `framework_bootstrap_datasets` (
  `dataset_key`,
  `source_name`,
  `source_type`,
  `columns_json`,
  `filterable_columns_json`,
  `sortable_columns_json`,
  `max_rows`,
  `cache_ttl_seconds`,
  `required_permission`,
  `environment`,
  `enabled`,
  `description`
) VALUES
(
  'tables_metadata',
  'tables_metadata',
  'TABLE',
  JSON_ARRAY(
    'id', 'table_name', 'column_name', 'col_real_name', 'type', 'options',
    'extra_options', 'backend_visible', 'frontend_visible', 'editable',
    'validator', 'icon', 'rank', 'group_name', 'disabled'
  ),
  JSON_ARRAY('table_name', 'column_name', 'type', 'group_name'),
  JSON_ARRAY('table_name', 'rank', 'column_name'),
  2000,
  300,
  NULL,
  'all',
  1,
  'Field metadata used by dynamic forms and tables'
),
(
  'admin_resources',
  'admin_resources',
  'TABLE',
  JSON_ARRAY(
    'id', 'resource', 'resource_type', 'resource_path', 'http_method',
    'description', 'icon', 'is_public', 'display_order', 'category'
  ),
  JSON_ARRAY('resource_type', 'is_public', 'category'),
  JSON_ARRAY('display_order', 'resource'),
  1000,
  120,
  NULL,
  'all',
  1,
  'API and browser resource definitions'
),
(
  'permissions',
  'admin_permissions',
  'TABLE',
  JSON_ARRAY('id', 'permission_name', 'description', 'alias'),
  JSON_ARRAY('permission_name'),
  JSON_ARRAY('permission_name'),
  1000,
  300,
  NULL,
  'all',
  1,
  'Permission definitions exposed to the authenticated framework bootstrap'
);

INSERT IGNORE INTO `framework_bootstrap_profiles` (
  `profile_key`,
  `description`,
  `environment`,
  `enabled`
) VALUES (
  'authenticated_startup',
  'Core datasets required immediately after successful authentication',
  'all',
  1
);

INSERT IGNORE INTO `framework_bootstrap_profile_datasets` (
  `profile_id`,
  `dataset_id`,
  `load_order`,
  `failure_mode`,
  `enabled`
)
SELECT
  profile.`id`,
  dataset.`id`,
  mapping.`load_order`,
  mapping.`failure_mode`,
  1
FROM `framework_bootstrap_profiles` AS profile
JOIN (
  SELECT 'tables_metadata' AS `dataset_key`, 10 AS `load_order`, 'REQUIRED' AS `failure_mode`
  UNION ALL
  SELECT 'admin_resources', 20, 'REQUIRED'
  UNION ALL
  SELECT 'permissions', 30, 'REQUIRED'
) AS mapping
JOIN `framework_bootstrap_datasets` AS dataset
  ON dataset.`dataset_key` = mapping.`dataset_key`
WHERE profile.`profile_key` = 'authenticated_startup';

COMMIT;
