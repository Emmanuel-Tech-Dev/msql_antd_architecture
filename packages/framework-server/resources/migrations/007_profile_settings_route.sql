START TRANSACTION;

INSERT INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`)
VALUES
  ('Profile', 'BROWSER_ROUTE', '/admin/profile', 'GET',
   'Manage the authenticated user profile and account security', 'UserOutlined', 1, 80,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Account')
ON DUPLICATE KEY UPDATE
  `resource_path` = VALUES(`resource_path`),
  `http_method` = VALUES(`http_method`),
  `description` = VALUES(`description`),
  `icon` = VALUES(`icon`),
  `is_public` = VALUES(`is_public`),
  `display_order` = VALUES(`display_order`),
  `category` = VALUES(`category`),
  `updatedAt` = CURRENT_TIMESTAMP;

COMMIT;
