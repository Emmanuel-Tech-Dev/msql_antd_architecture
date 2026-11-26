-- Grant table access (Permissions page): choose registered tables and actions,
-- and the permissions are created with the API endpoints they need.
--
-- 1. metadata_tables.is_system: a framework table, never offered for grants.
-- 2. manage:permissions and its two endpoints.
-- 3. The grantable_tables lookup: registered, enabled, non-system tables, by label.
-- 4. The access_table_grants form, described in metadata (no table behind it).

START TRANSACTION;

ALTER TABLE `metadata_tables`
  ADD COLUMN `is_system` TINYINT(1) NOT NULL DEFAULT 0 AFTER `enabled`;

UPDATE `metadata_tables`
SET `is_system` = 1
WHERE `table_name` IN ('admin', 'tables_metadata', 'system_resources', 'system_settings', 'ui_settings')
   OR `table_name` LIKE 'admin\_%'
   OR `table_name` LIKE 'metadata\_%'
   OR `table_name` LIKE 'framework\_%';

INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `alias`, `createdAt`, `updatedAt`)
VALUES
  ('manage:permissions', 'Create permissions for tables with the endpoints they need', 'Grant table access', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`,
   `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`, `show_in_nav`)
VALUES
  ('read:access:table_access', 'API_ENDPOINT', '/access/table_access/preview', 'POST',
   'Preview the permissions and endpoints a table grant would create', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0),
  ('manage:access:table_access', 'API_ENDPOINT', '/access/table_access', 'POST',
   'Create permissions and endpoints for chosen tables and actions', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0);

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('manage:permissions', 'read:access:table_access', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('manage:permissions', 'manage:access:table_access', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Privileged roles hold it to start with; it can be given to others later.
INSERT IGNORE INTO `admin_role_permissions`
  (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT role.`role_name`, 'manage:permissions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `admin_roles` AS role
WHERE LOWER(TRIM(role.`role_name`)) IN ('superadmin', 'dev');

INSERT IGNORE INTO `metadata_lookups`
  (`lookup_key`, `source_table`, `value_column`, `label_column`, `extra_columns`, `base_filters`,
   `depends_on`, `filter_column`, `sort`, `max_rows`, `required_permission`, `description`, `enabled`)
VALUES
  ('grantable_tables', 'metadata_tables', 'table_name', 'label', NULL,
   '[{"column": "is_system", "value": 0}, {"column": "enabled", "value": 1}]',
   NULL, NULL, '[{"column": "label", "direction": "ASC"}]', 500, 'manage:permissions',
   'Registered project tables that Grant table access can offer', 1);

INSERT IGNORE INTO `metadata_tables`
  (`table_name`, `label`, `singular_label`, `description`, `form_layout`, `form_columns`, `sections`, `enabled`, `is_system`)
VALUES
  ('access_table_grants', 'Grant table access', 'Table access',
   'The Grant table access form on the Permissions page; no table stores it', 'drawer', 1, '[]', 1, 1);

INSERT IGNORE INTO `tables_metadata`
  (`table_name`, `column_name`, `col_real_name`, `type`, `form_visible`, `list_visible`, `editable`,
   `required`, `section_key`, `col_span`, `config`, `icon`, `rank`, `disabled`)
VALUES
  ('access_table_grants', 'tables', 'Tables', 'multiLookup', 1, 1, 1, 1, NULL, 24,
   '{"lookup": "grantable_tables", "placeholder": "Choose tables", "helpText": "Your project''s registered tables. System tables are managed on their own screens."}',
   '', 1, 0),
  ('access_table_grants', 'actions', 'Actions', 'checkboxGroup', 1, 1, 1, 0, NULL, 24,
   '{"default": "read", "options": [{"value": "read", "label": "Read"}, {"value": "create", "label": "Create"}, {"value": "update", "label": "Update"}, {"value": "delete", "label": "Delete"}], "helpText": "Read: list, search, filter and open records. Create: add one or many. Update and Delete: one record."}',
   '', 2, 0),
  ('access_table_grants', 'custom_actions', 'Custom actions', 'text', 1, 1, 1, 0, NULL, 24,
   '{"placeholder": "e.g. export, approve", "helpText": "Comma-separated. A permission only, with no endpoints, for checks in pages (Can, useCan) and policies.", "rules": [{"rule": "pattern", "value": "^\\\\s*[a-z][a-z0-9_]*(\\\\s*,\\\\s*[a-z][a-z0-9_]*)*\\\\s*$", "message": "Use lower-case names separated by commas, e.g. export, approve"}]}',
   '', 3, 0);

COMMIT;
