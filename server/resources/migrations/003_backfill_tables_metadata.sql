-- Keep metadata aligned with physical, form-eligible framework tables.
-- Existing definitions are never overwritten: hand-tuned types, options,
-- visibility, validators, and ranks remain authoritative.

START TRANSACTION;

-- Remove definitions that point to a table or column that no longer exists.
DELETE tm
FROM tables_metadata AS tm
LEFT JOIN information_schema.COLUMNS AS c
  ON c.TABLE_SCHEMA = DATABASE()
 AND c.TABLE_NAME = tm.table_name
 AND c.COLUMN_NAME = tm.column_name
WHERE c.COLUMN_NAME IS NULL;

INSERT INTO tables_metadata (
  table_name,
  column_name,
  col_real_name,
  type,
  options,
  extra_options,
  backend_visible,
  frontend_visible,
  editable,
  validator,
  icon,
  `rank`,
  group_name,
  disabled
)
SELECT
  c.TABLE_NAME,
  c.COLUMN_NAME,
  REPLACE(c.COLUMN_NAME, '_', ' '),
  CASE
    WHEN c.COLUMN_KEY = 'PRI' THEN 'primaryKey'
    WHEN c.TABLE_NAME = 'tables_metadata' AND c.COLUMN_NAME = 'type' THEN 'csvSelect'
    WHEN c.COLUMN_NAME = 'custom_id' THEN 'customGenerateString'
    WHEN c.COLUMN_NAME REGEXP '(^|_)(avatar|image|photo|picture|file)(_url|_path)?$' THEN 'file'
    WHEN c.COLUMN_NAME LIKE '%email%' THEN 'email'
    WHEN c.DATA_TYPE = 'enum' THEN 'csvSelect'
    WHEN c.DATA_TYPE = 'tinyint' AND c.COLUMN_TYPE = 'tinyint(1)' THEN 'jsonSelect'
    WHEN c.DATA_TYPE IN ('text', 'mediumtext', 'longtext', 'json') THEN 'textArea'
    WHEN c.DATA_TYPE IN ('datetime', 'timestamp', 'date') THEN 'dateTime'
    WHEN c.DATA_TYPE = 'time' THEN 'time'
    WHEN c.DATA_TYPE IN ('tinyint', 'smallint', 'mediumint', 'int', 'bigint', 'decimal', 'float', 'double') THEN 'number'
    ELSE 'text'
  END,
  CASE
    WHEN c.DATA_TYPE = 'enum' THEN
      REPLACE(
        REPLACE(SUBSTRING(c.COLUMN_TYPE, 6, LENGTH(c.COLUMN_TYPE) - 6), ''',''', ','),
        '''',
        ''
      )
    WHEN c.DATA_TYPE = 'tinyint' AND c.COLUMN_TYPE = 'tinyint(1)' THEN
      '{"1":"Yes","0":"No"}'
    WHEN c.TABLE_NAME = 'tables_metadata' AND c.COLUMN_NAME = 'type' THEN
      'text,email,password,number,textArea,dateTime,time,jsonSelect,csvSelect,jsonMultiSelect,csvMultiSelect,file,primaryKey,customGenerateString'
    ELSE NULL
  END,
  NULL,
  CASE
    WHEN c.COLUMN_KEY = 'PRI' THEN 0
    WHEN c.COLUMN_NAME IN ('createdAt', 'updatedAt', 'created_at', 'updated_at', 'last_login', 'last_logout', 'oauth_id') THEN 0
    ELSE 1
  END,
  CASE
    WHEN c.COLUMN_KEY = 'PRI' OR c.COLUMN_NAME = 'oauth_id' THEN 0
    ELSE 1
  END,
  CASE
    WHEN c.COLUMN_KEY = 'PRI' THEN 0
    WHEN c.COLUMN_NAME IN (
      'custom_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at',
      'last_login', 'last_logout', 'oauth_id', 'is_system_role'
    ) THEN 0
    ELSE 1
  END,
  CASE
    WHEN c.IS_NULLABLE = 'NO'
     AND c.COLUMN_DEFAULT IS NULL
     AND c.EXTRA NOT LIKE '%auto_increment%'
     AND c.COLUMN_NAME NOT IN (
       'custom_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'
     )
    THEN 'validateEmptyString'
    ELSE ''
  END,
  '',
  c.ORDINAL_POSITION,
  c.TABLE_NAME,
  CASE
    WHEN c.COLUMN_KEY = 'PRI' THEN 1
    WHEN c.COLUMN_NAME IN (
      'createdAt', 'updatedAt', 'created_at', 'updated_at',
      'last_login', 'last_logout', 'oauth_id', 'is_system_role'
    ) THEN 1
    ELSE 0
  END
FROM information_schema.COLUMNS AS c
WHERE c.TABLE_SCHEMA = DATABASE()
  AND c.TABLE_NAME IN (
    'achievements',
    'admin',
    'admin_permission_resources',
    'admin_permissions',
    'admin_resources',
    'admin_role_browser_routes',
    'admin_role_permissions',
    'admin_roles',
    'admin_user_roles',
    'file_folder',
    'tables_metadata',
    'transaction',
    'ui_settings',
    'volunteer'
  )
  AND c.COLUMN_NAME NOT IN (
    'password', 'password_hash', 'otp_secret', 'reset_token',
    'access_token', 'refresh_token', 'secret', 'api_key', 'private_key'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM tables_metadata AS existing
    WHERE existing.table_name = c.TABLE_NAME
      AND existing.column_name = c.COLUMN_NAME
  )
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;

-- The admin ID is application-generated. The legacy text definition disabled
-- the field without producing a value, causing generic user creation to fail.
UPDATE tables_metadata
SET type = 'customGenerateString',
    backend_visible = 1,
    frontend_visible = 0,
    editable = 0,
    validator = '',
    disabled = 0
WHERE table_name = 'admin'
  AND column_name = 'custom_id'
  AND type = 'text';

COMMIT;
