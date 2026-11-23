-- Registration/custom ID is the mandatory sign-in identifier. Email remains
-- unique when supplied but is optional for users who do not own an email account.

ALTER TABLE `admin`
  MODIFY COLUMN `email` VARCHAR(255) NULL;

SET @credentials_user_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_credentials'
    AND INDEX_NAME = 'uq_admin_credentials_user'
);

SET @credentials_user_index_sql = IF(
  @credentials_user_index_exists = 0,
  'ALTER TABLE `admin_credentials` ADD UNIQUE KEY `uq_admin_credentials_user` (`admin_custom_id`)',
  'SELECT 1'
);

PREPARE credentials_user_index_statement FROM @credentials_user_index_sql;
EXECUTE credentials_user_index_statement;
DEALLOCATE PREPARE credentials_user_index_statement;

UPDATE `tables_metadata`
SET `validator` = '',
    `editable` = 1,
    `disabled` = 0
WHERE `table_name` = 'admin'
  AND `column_name` = 'email';

