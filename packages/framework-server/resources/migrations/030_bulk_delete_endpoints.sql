-- Bulk delete (DELETE /api/<table> with { ids }): every table whose delete
-- permission covers DELETE /api/<table>/:id now covers the bulk route too, so
-- whoever may delete one record may delete several. New grants and new tables
-- get it from core/lib/tableAccess.js.

START TRANSACTION;

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`,
   `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`, `show_in_nav`)
SELECT DISTINCT
  CONCAT('delete:', SUBSTRING(r.`resource_path`, 6, CHAR_LENGTH(r.`resource_path`) - 9), ':many'),
  'API_ENDPOINT',
  LEFT(r.`resource_path`, CHAR_LENGTH(r.`resource_path`) - 4),
  'DELETE',
  CONCAT('DELETE ', LEFT(r.`resource_path`, CHAR_LENGTH(r.`resource_path`) - 4)),
  NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Data API', 0
FROM `admin_resources` AS r
WHERE r.`resource_type` = 'API_ENDPOINT'
  AND r.`http_method` = 'DELETE'
  AND r.`resource_path` REGEXP '^/api/[A-Za-z0-9_]+/:id$';

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
SELECT DISTINCT link.`permission`, many.`resource`, 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `admin_permission_resources` AS link
JOIN `admin_resources` AS one
  ON one.`resource` = link.`resource`
 AND one.`resource_type` = 'API_ENDPOINT'
 AND one.`http_method` = 'DELETE'
 AND one.`resource_path` REGEXP '^/api/[A-Za-z0-9_]+/:id$'
JOIN `admin_resources` AS many
  ON many.`resource_type` = 'API_ENDPOINT'
 AND many.`http_method` = 'DELETE'
 AND many.`resource_path` = LEFT(one.`resource_path`, CHAR_LENGTH(one.`resource_path`) - 4);

COMMIT;
