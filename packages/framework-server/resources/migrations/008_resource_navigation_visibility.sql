START TRANSACTION;

SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_resources'
    AND COLUMN_NAME = 'show_in_nav'
);
SET @add_column_sql = IF(
  @column_exists = 0,
  'ALTER TABLE `admin_resources` ADD COLUMN `show_in_nav` TINYINT(1) NOT NULL DEFAULT 0 AFTER `category`',
  'SELECT 1'
);
PREPARE add_column_statement FROM @add_column_sql;
EXECUTE add_column_statement;
DEALLOCATE PREPARE add_column_statement;

-- Existing authenticated admin routes remain visible by default. Routes can
-- now be hidden without removing them from the authorization registry.
UPDATE `admin_resources`
SET `show_in_nav` = CASE
  WHEN `resource_type` = 'BROWSER_ROUTE'
   AND `resource_path` LIKE '/admin/%'
   AND `resource_path` <> '/admin/404'
  THEN 1
  ELSE 0
END;

UPDATE `admin_resources`
SET `show_in_nav` = 1
WHERE `resource` = 'Profile'
  AND `resource_type` = 'BROWSER_ROUTE';

INSERT INTO `tables_metadata` (
  `table_name`, `column_name`, `col_real_name`, `type`, `options`,
  `extra_options`, `backend_visible`, `frontend_visible`, `editable`,
  `validator`, `icon`, `rank`, `group_name`, `disabled`
)
SELECT
  'admin_resources', 'show_in_nav', 'Show in navigation', 'jsonSelect',
  '{"1":"Show","0":"Hide"}', NULL, 1, 1, 1, '', '',
  ranks.next_rank, 'admin_resources', 0
FROM (
  SELECT COALESCE(MAX(`rank`), 0) + 1 AS next_rank
  FROM `tables_metadata`
) AS ranks
WHERE NOT EXISTS (
  SELECT 1 FROM `tables_metadata`
  WHERE `table_name` = 'admin_resources' AND `column_name` = 'show_in_nav'
);

UPDATE `tables_metadata`
SET `col_real_name` = 'Show in navigation',
    `type` = 'jsonSelect',
    `options` = '{"1":"Show","0":"Hide"}',
    `backend_visible` = 1,
    `frontend_visible` = 1,
    `editable` = 1,
    `disabled` = 0
WHERE `table_name` = 'admin_resources'
  AND `column_name` = 'show_in_nav';

COMMIT;
