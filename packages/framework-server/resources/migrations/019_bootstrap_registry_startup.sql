-- The server now builds the startup data from this registry (metadata
-- upgrade phase 1). The column lists match what the browser loaded before
-- (every non-sensitive column), and the active sidebar appearance joins the
-- startup profile. It is OPTIONAL: without it the UI uses its default theme.

START TRANSACTION;

UPDATE `framework_bootstrap_datasets`
SET `columns_json` = JSON_ARRAY(
      'id', 'table_name', 'column_name', 'col_real_name', 'type', 'options',
      'extra_options', 'backend_visible', 'frontend_visible', 'editable',
      'validator', 'icon', 'rank', 'createdAt', 'updatedAt', 'group_name', 'disabled'
    ),
    `config_version` = `config_version` + 1
WHERE `dataset_key` = 'tables_metadata';

UPDATE `framework_bootstrap_datasets`
SET `columns_json` = JSON_ARRAY(
      'id', 'resource', 'resource_type', 'resource_path', 'http_method',
      'description', 'icon', 'is_public', 'display_order', 'createdAt',
      'updatedAt', 'category', 'show_in_nav'
    ),
    `config_version` = `config_version` + 1
WHERE `dataset_key` = 'admin_resources';

UPDATE `framework_bootstrap_datasets`
SET `columns_json` = JSON_ARRAY(
      'id', 'permission_name', 'description', 'alias', 'createdAt', 'updatedAt'
    ),
    `config_version` = `config_version` + 1
WHERE `dataset_key` = 'permissions';

INSERT IGNORE INTO `framework_bootstrap_datasets` (
  `dataset_key`, `source_name`, `source_type`, `columns_json`, `base_filters_json`,
  `max_rows`, `cache_ttl_seconds`, `required_permission`, `environment`, `enabled`, `description`
) VALUES (
  'ui_settings',
  'ui_settings',
  'TABLE',
  JSON_ARRAY('id', 'setting_key', 'setting_value', 'description', 'is_active', 'version'),
  JSON_ARRAY(
    JSON_OBJECT('column', 'setting_key', 'value', 'layout.sider'),
    JSON_OBJECT('column', 'is_active', 'value', 1)
  ),
  10,
  0,
  NULL,
  'all',
  1,
  'Active workspace appearance (sidebar, colours, fonts)'
);

INSERT IGNORE INTO `framework_bootstrap_profile_datasets`
  (`profile_id`, `dataset_id`, `load_order`, `failure_mode`, `enabled`)
SELECT profile.`id`, dataset.`id`, 40, 'OPTIONAL', 1
FROM `framework_bootstrap_profiles` AS profile
JOIN `framework_bootstrap_datasets` AS dataset ON dataset.`dataset_key` = 'ui_settings'
WHERE profile.`profile_key` = 'authenticated_startup';

COMMIT;
