-- The sign-in page's look (Appearance › Sign-in page): layout, headline,
-- supporting text, highlights, cover image and help link. Served to the
-- signed-out sign-in pages by /auth/login_options; loaded at sign-in as its
-- own dataset so Appearance can edit it (the ui_settings dataset stays
-- limited to layout.sider, because ui_settings also holds the backup schedule).

START TRANSACTION;

INSERT IGNORE INTO `ui_settings`
  (`setting_key`, `setting_value`, `description`, `is_active`, `version`)
VALUES (
  'login_ui',
  '{"layout":"centered","headline":"","message":"","highlights":[],"coverImage":"","helpUrl":""}',
  'Sign-in page layout and text, shown before sign-in',
  1,
  1
);

INSERT IGNORE INTO `framework_bootstrap_datasets` (
  `dataset_key`, `source_name`, `source_type`, `columns_json`, `base_filters_json`,
  `max_rows`, `cache_ttl_seconds`, `required_permission`, `environment`, `enabled`, `description`
) VALUES (
  'login_ui',
  'ui_settings',
  'TABLE',
  JSON_ARRAY('id', 'setting_key', 'setting_value', 'description', 'is_active', 'version'),
  JSON_ARRAY(
    JSON_OBJECT('column', 'setting_key', 'value', 'login_ui'),
    JSON_OBJECT('column', 'is_active', 'value', 1)
  ),
  1,
  0,
  NULL,
  'all',
  1,
  'Sign-in page appearance, for Appearance › Sign-in page'
);

INSERT IGNORE INTO `framework_bootstrap_profile_datasets`
  (`profile_id`, `dataset_id`, `load_order`, `failure_mode`, `enabled`)
SELECT profile.`id`, dataset.`id`, 41, 'OPTIONAL', 1
FROM `framework_bootstrap_profiles` AS profile
JOIN `framework_bootstrap_datasets` AS dataset ON dataset.`dataset_key` = 'login_ui'
WHERE profile.`profile_key` = 'authenticated_startup';

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`)
VALUES
  ('update:system:login_cover', 'API_ENDPOINT', '/api/v1/ui-settings/login-cover', 'POST',
   'Upload the sign-in page cover image', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API');

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('update:ui_settings', 'update:system:login_cover', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
