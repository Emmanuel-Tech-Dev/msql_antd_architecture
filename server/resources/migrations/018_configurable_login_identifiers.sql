-- Password sign-in accepts any admin column listed in auth.login_identifiers
-- that alone identifies one account (a primary or unique key). The server
-- ignores listed columns without such a key, so phone_no only works once its
-- unique key exists. Local phone numbers get auth.phone_country_code.

START TRANSACTION;

INSERT IGNORE INTO `system_settings`
  (`key`, `value`, `type`, `scope`, `env`, `catergory`, `description`, `is_sensitive`)
VALUES
  ('auth.login_identifiers', '["email", "custom_id", "phone_no"]', 'json', 'global', NULL, 0,
   'Admin columns accepted at password sign-in, in order. Each needs a unique key.', 0),
  ('auth.phone_country_code', '233', 'string', 'global', NULL, 0,
   'Country calling code added to local phone numbers at sign-in', 0);

COMMIT;

-- The unique key is added only when no two accounts share a phone number;
-- otherwise phone sign-in stays off until the duplicates are fixed.
SET @admin_phone_index_exists = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin'
    AND INDEX_NAME = 'uq_admin_phone_no'
);

SET @admin_phone_duplicates = (
  SELECT COUNT(*)
  FROM (
    SELECT `phone_no`
    FROM `admin`
    WHERE `phone_no` IS NOT NULL
    GROUP BY `phone_no`
    HAVING COUNT(*) > 1
  ) AS duplicate_phone
);

SET @admin_phone_index_sql = IF(
  @admin_phone_index_exists = 0 AND @admin_phone_duplicates = 0,
  'ALTER TABLE `admin` ADD UNIQUE KEY `uq_admin_phone_no` (`phone_no`)',
  'SELECT 1'
);

PREPARE admin_phone_index_statement FROM @admin_phone_index_sql;
EXECUTE admin_phone_index_statement;
DEALLOCATE PREPARE admin_phone_index_statement;
