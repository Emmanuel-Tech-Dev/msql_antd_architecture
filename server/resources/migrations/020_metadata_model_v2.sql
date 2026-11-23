-- Metadata model v2 (metadata upgrade phase 2).
--
-- tables_metadata gains the columns a real form needs. form_visible,
-- list_visible and required are generated from the old columns, so the
-- metadata has one source of truth until phase 4 moves the admin pages over
-- and swaps them. Select options move into `config`, and SQL in options is
-- replaced by named, server-owned lookups (metadata_lookups). Type names
-- move to the v2 catalogue; the form engine reads both until phase 4.

ALTER TABLE `tables_metadata`
  ADD COLUMN `form_visible` TINYINT(1) GENERATED ALWAYS AS (COALESCE(`backend_visible`, 0)) VIRTUAL AFTER `frontend_visible`,
  ADD COLUMN `list_visible` TINYINT(1) GENERATED ALWAYS AS (COALESCE(`frontend_visible`, 0)) VIRTUAL AFTER `form_visible`,
  ADD COLUMN `required` TINYINT(1) GENERATED ALWAYS AS (COALESCE(`validator` = 'validateEmptyString', 0)) VIRTUAL AFTER `validator`,
  ADD COLUMN `default_value` TEXT NULL AFTER `required`,
  ADD COLUMN `placeholder` VARCHAR(255) NULL AFTER `default_value`,
  ADD COLUMN `help_text` VARCHAR(500) NULL AFTER `placeholder`,
  ADD COLUMN `section_key` VARCHAR(64) NULL AFTER `help_text`,
  ADD COLUMN `col_span` TINYINT UNSIGNED NOT NULL DEFAULT 24 AFTER `section_key`,
  ADD COLUMN `config` JSON NULL AFTER `col_span`,
  ADD COLUMN `rules` JSON NULL AFTER `config`,
  ADD COLUMN `visible_when` JSON NULL AFTER `rules`,
  ADD COLUMN `required_when` JSON NULL AFTER `visible_when`,
  ADD COLUMN `version` INT UNSIGNED NOT NULL DEFAULT 1 AFTER `required_when`,
  ADD CONSTRAINT `chk_tables_metadata_col_span` CHECK (`col_span` BETWEEN 1 AND 24),
  ADD UNIQUE KEY `uq_tables_metadata_field` (`table_name`, `column_name`);

CREATE TABLE IF NOT EXISTS `metadata_tables` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(100) NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `singular_label` VARCHAR(120) NULL,
  `description` VARCHAR(500) NULL,
  `icon` VARCHAR(64) NULL,
  -- Shown when a record of this table is referenced elsewhere.
  `title_column` VARCHAR(100) NULL,
  `default_sort` JSON NULL,
  `search_columns` JSON NULL,
  `form_layout` ENUM('modal', 'drawer', 'page') NOT NULL DEFAULT 'modal',
  `form_columns` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  -- Ordered: [{ "key", "title", "description", "collapsed" }]
  `sections` JSON NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `version` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` VARCHAR(255) NULL,
  `updated_by` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_metadata_tables_table` (`table_name`),
  CONSTRAINT `chk_metadata_tables_name` CHECK (`table_name` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'),
  CONSTRAINT `chk_metadata_tables_columns` CHECK (`form_columns` IN (1, 2))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `metadata_lookups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lookup_key` VARCHAR(100) NOT NULL,
  `source_table` VARCHAR(100) NOT NULL,
  `value_column` VARCHAR(100) NOT NULL,
  `label_column` VARCHAR(100) NOT NULL,
  `extra_columns` JSON NULL,
  -- Fixed conditions: [{ "column", "value" }]
  `base_filters` JSON NULL,
  -- The form field whose value filters this lookup, on filter_column.
  `depends_on` VARCHAR(100) NULL,
  `filter_column` VARCHAR(100) NULL,
  -- [{ "column", "direction" }]
  `sort` JSON NULL,
  `max_rows` INT UNSIGNED NOT NULL DEFAULT 500,
  `required_permission` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `description` VARCHAR(255) NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `version` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_by` VARCHAR(255) NULL,
  `updated_by` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_metadata_lookups_key` (`lookup_key`),
  CONSTRAINT `chk_metadata_lookups_key` CHECK (`lookup_key` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'),
  CONSTRAINT `chk_metadata_lookups_source` CHECK (`source_table` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'),
  CONSTRAINT `chk_metadata_lookups_columns` CHECK (
    `value_column` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'
    AND `label_column` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'
    AND (`filter_column` IS NULL OR `filter_column` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$')
  ),
  CONSTRAINT `chk_metadata_lookups_dependency` CHECK ((`depends_on` IS NULL) = (`filter_column` IS NULL)),
  CONSTRAINT `chk_metadata_lookups_max_rows` CHECK (`max_rows` BETWEEN 1 AND 5000),
  CONSTRAINT `fk_metadata_lookups_permission`
    FOREIGN KEY (`required_permission`) REFERENCES `admin_permissions` (`permission_name`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

START TRANSACTION;

-- One row per described table.
INSERT IGNORE INTO `metadata_tables` (`table_name`, `label`, `sections`)
SELECT DISTINCT
  tm.`table_name`,
  CONCAT(UPPER(LEFT(REPLACE(tm.`table_name`, '_', ' '), 1)), SUBSTRING(REPLACE(tm.`table_name`, '_', ' '), 2)),
  JSON_ARRAY()
FROM `tables_metadata` AS tm;

-- The lookups that replace the SQL found in options and extra_options.
INSERT IGNORE INTO `metadata_lookups`
  (`lookup_key`, `source_table`, `value_column`, `label_column`, `depends_on`, `filter_column`, `sort`, `required_permission`, `description`)
VALUES
  ('roles', 'admin_roles', 'role_name', 'role_name', NULL, NULL,
   JSON_ARRAY(JSON_OBJECT('column', 'role_name', 'direction', 'ASC')), 'read:admin_roles', 'System roles'),
  ('permissions', 'admin_permissions', 'permission_name', 'permission_name', NULL, NULL,
   JSON_ARRAY(JSON_OBJECT('column', 'permission_name', 'direction', 'ASC')), 'read:admin_permissions', 'Registered permissions'),
  ('users', 'admin', 'custom_id', 'name', NULL, NULL,
   JSON_ARRAY(JSON_OBJECT('column', 'name', 'direction', 'ASC')), 'read:admin', 'User accounts by name'),
  ('resource_types', 'system_resources', 'resource_type', 'resource_type', NULL, NULL,
   JSON_ARRAY(JSON_OBJECT('column', 'resource_type', 'direction', 'ASC')), 'read:system_resources', 'Resource types'),
  ('resources_by_type', 'admin_resources', 'resource', 'resource_path', 'resource_type', 'resource_type',
   JSON_ARRAY(JSON_OBJECT('column', 'resource_path', 'direction', 'ASC')), 'read:admin_resources', 'Resources of the chosen type');

UPDATE `tables_metadata` AS tm
JOIN (
  SELECT 'admin_role_permissions' AS table_name, 'role_id' AS column_name, 'roles' AS lookup_key
  UNION ALL SELECT 'admin_role_permissions', 'permission', 'permissions'
  UNION ALL SELECT 'admin_permission_resources', 'permission', 'permissions'
  UNION ALL SELECT 'admin_permission_resources', 'resource', 'resources_by_type'
  UNION ALL SELECT 'admin_user_roles', 'user_id', 'users'
  UNION ALL SELECT 'admin_user_roles', 'role_id', 'roles'
  UNION ALL SELECT 'admin_resources', 'resource_type', 'resource_types'
) AS conversion
  ON conversion.table_name = tm.`table_name` AND conversion.column_name = tm.`column_name`
SET tm.`config` = JSON_OBJECT('lookup', conversion.lookup_key),
    tm.`options` = NULL;

-- The resource_type -> resource cascade now lives on the lookup.
UPDATE `tables_metadata`
SET `extra_options` = NULL
WHERE `table_name` = 'admin_permission_resources'
  AND `column_name` = 'resource_type'
  AND `extra_options` LIKE '%admin_resources%';

-- Static options: {"1":"Active","0":"Inactive"} and "GET,POST" become
-- config.options = [{ "value", "label" }].
UPDATE `tables_metadata` AS tm
SET tm.`config` = JSON_OBJECT('options', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT(
        'value', option_key.name,
        'label', JSON_UNQUOTE(JSON_EXTRACT(tm.`options`, CONCAT('$."', option_key.name, '"')))
      ))
      FROM JSON_TABLE(JSON_KEYS(tm.`options`), '$[*]' COLUMNS (name VARCHAR(255) PATH '$')) AS option_key
    )),
    tm.`options` = NULL
WHERE tm.`type` IN ('jsonSelect', 'jsonMultiSelect', 'jsonRadio', 'jsonCheck')
  AND JSON_VALID(tm.`options`)
  AND JSON_TYPE(tm.`options`) = 'OBJECT';

UPDATE `tables_metadata` AS tm
SET tm.`config` = JSON_OBJECT('options', (
      SELECT JSON_ARRAYAGG(JSON_OBJECT('value', option_value.value, 'label', option_value.value))
      FROM JSON_TABLE(
        CONCAT('["', REPLACE(TRIM(tm.`options`), ',', '","'), '"]'),
        '$[*]' COLUMNS (value VARCHAR(255) PATH '$')
      ) AS option_value
    )),
    tm.`options` = NULL
WHERE tm.`type` IN ('csvSelect', 'csvMultiSelect', 'csvRadio', 'csvCheck')
  AND tm.`options` IS NOT NULL
  AND tm.`options` NOT LIKE '%"%';

-- The v2 type catalogue. Unlisted types keep their names.
UPDATE `tables_metadata`
SET `type` = CASE `type`
    WHEN 'jsonSelect' THEN 'select'
    WHEN 'csvSelect' THEN 'select'
    WHEN 'jsonMultiSelect' THEN 'multiSelect'
    WHEN 'csvMultiSelect' THEN 'multiSelect'
    WHEN 'jsonRadio' THEN 'radio'
    WHEN 'csvRadio' THEN 'radio'
    WHEN 'jsonCheck' THEN 'checkboxGroup'
    WHEN 'csvCheck' THEN 'checkboxGroup'
    WHEN 'sqlSelect' THEN 'lookup'
    WHEN 'sqlMultiSelect' THEN 'multiLookup'
    WHEN 'textArea' THEN 'textarea'
    WHEN 'textEditor' THEN 'richText'
    WHEN 'customGenerateString' THEN 'generatedId'
    ELSE `type`
  END,
  `version` = `version` + 1
WHERE `type` IN ('jsonSelect', 'csvSelect', 'jsonMultiSelect', 'csvMultiSelect', 'jsonRadio', 'csvRadio',
  'jsonCheck', 'csvCheck', 'sqlSelect', 'sqlMultiSelect', 'textArea', 'textEditor', 'customGenerateString')
  AND (`type` NOT LIKE 'sql%' OR JSON_EXTRACT(`config`, '$.lookup') IS NOT NULL);

-- The metadata editor's own "type" field offers the v2 names.
UPDATE `tables_metadata`
SET `config` = JSON_OBJECT('options', JSON_ARRAY(
      JSON_OBJECT('value', 'text', 'label', 'text'),
      JSON_OBJECT('value', 'textarea', 'label', 'textarea'),
      JSON_OBJECT('value', 'richText', 'label', 'richText'),
      JSON_OBJECT('value', 'email', 'label', 'email'),
      JSON_OBJECT('value', 'password', 'label', 'password'),
      JSON_OBJECT('value', 'number', 'label', 'number'),
      JSON_OBJECT('value', 'dateTime', 'label', 'dateTime'),
      JSON_OBJECT('value', 'time', 'label', 'time'),
      JSON_OBJECT('value', 'select', 'label', 'select'),
      JSON_OBJECT('value', 'multiSelect', 'label', 'multiSelect'),
      JSON_OBJECT('value', 'radio', 'label', 'radio'),
      JSON_OBJECT('value', 'checkboxGroup', 'label', 'checkboxGroup'),
      JSON_OBJECT('value', 'lookup', 'label', 'lookup'),
      JSON_OBJECT('value', 'multiLookup', 'label', 'multiLookup'),
      JSON_OBJECT('value', 'file', 'label', 'file'),
      JSON_OBJECT('value', 'primaryKey', 'label', 'primaryKey'),
      JSON_OBJECT('value', 'generatedId', 'label', 'generatedId')
    ))
WHERE `table_name` = 'tables_metadata' AND `column_name` = 'type';

-- Startup sends the new columns, and the lookup dependencies the form needs
-- to refresh a dependent field (resource after resource_type).
UPDATE `framework_bootstrap_datasets`
SET `columns_json` = JSON_ARRAY(
      'id', 'table_name', 'column_name', 'col_real_name', 'type', 'options',
      'extra_options', 'backend_visible', 'frontend_visible', 'form_visible', 'list_visible',
      'editable', 'validator', 'required', 'default_value', 'placeholder', 'help_text',
      'section_key', 'col_span', 'config', 'rules', 'visible_when', 'required_when', 'version',
      'icon', 'rank', 'createdAt', 'updatedAt', 'group_name', 'disabled'
    ),
    `config_version` = `config_version` + 1
WHERE `dataset_key` = 'tables_metadata';

INSERT IGNORE INTO `framework_bootstrap_datasets` (
  `dataset_key`, `source_name`, `source_type`, `columns_json`, `base_filters_json`,
  `max_rows`, `cache_ttl_seconds`, `required_permission`, `environment`, `enabled`, `description`
) VALUES (
  'metadata_lookups',
  'metadata_lookups',
  'TABLE',
  JSON_ARRAY('lookup_key', 'depends_on'),
  JSON_ARRAY(JSON_OBJECT('column', 'enabled', 'value', 1)),
  1000,
  0,
  NULL,
  'all',
  1,
  'Lookup keys and the field each one depends on (no lookup data)'
);

INSERT IGNORE INTO `framework_bootstrap_profile_datasets`
  (`profile_id`, `dataset_id`, `load_order`, `failure_mode`, `enabled`)
SELECT profile.`id`, dataset.`id`, 15, 'OPTIONAL', 1
FROM `framework_bootstrap_profiles` AS profile
JOIN `framework_bootstrap_datasets` AS dataset ON dataset.`dataset_key` = 'metadata_lookups'
WHERE profile.`profile_key` = 'authenticated_startup';

COMMIT;
