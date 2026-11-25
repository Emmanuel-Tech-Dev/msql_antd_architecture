-- Administrators can give a user who forgot their password a new temporary
-- password (POST /auth/users/:userId/temporary_password), with the same
-- permission that enables and disables accounts. New accounts now get a
-- random temporary password shown once to the administrator, instead of the
-- user's email or registration number.

START TRANSACTION;

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`, `show_in_nav`)
VALUES
  ('manage:auth:temporary_password', 'API_ENDPOINT', '/auth/users/:userId/temporary_password', 'POST', 'Give a user a new temporary password', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Auth API', 0);

INSERT IGNORE INTO `admin_permission_resources` (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`) VALUES
  ('update:admin', 'manage:auth:temporary_password', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
