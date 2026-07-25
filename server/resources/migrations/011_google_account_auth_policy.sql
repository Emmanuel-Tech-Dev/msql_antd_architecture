-- Make the supported sign-in methods explicit for every administrator account.
-- Existing accounts remain password-enabled. New Google-only accounts are
-- created with password_login_enabled = 0 by AuthService.

START TRANSACTION;

SET @password_login_enabled_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_credentials'
    AND COLUMN_NAME = 'password_login_enabled'
);

SET @add_password_login_enabled = IF(
  @password_login_enabled_exists = 0,
  'ALTER TABLE `admin_credentials` ADD COLUMN `password_login_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `password`',
  'SELECT 1'
);

PREPARE password_login_enabled_statement FROM @add_password_login_enabled;
EXECUTE password_login_enabled_statement;
DEALLOCATE PREPARE password_login_enabled_statement;

COMMIT;
