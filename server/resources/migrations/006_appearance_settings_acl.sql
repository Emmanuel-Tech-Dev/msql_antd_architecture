START TRANSACTION;

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`)
VALUES
  ('update:system:ui_appearance', 'API_ENDPOINT', '/api/v1/ui-settings/:id', 'PUT',
   'Validate and update versioned UI appearance settings', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('Appearance', 'BROWSER_ROUTE', '/admin/settings/appearance', 'GET',
   'Manage application layout, branding, and visual tokens', 'ControlOutlined', 0, 85,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Settings');

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('update:ui_settings', 'update:system:ui_appearance', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_role_browser_routes` (`role_id`, `resource`)
SELECT `role_name`, 'Appearance'
FROM `admin_roles`
WHERE LOWER(TRIM(`role_name`)) IN ('superadmin', 'dev');

COMMIT;
