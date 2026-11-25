-- The Permissions page moves to the metadata runtime (metadata upgrade
-- phase 4). Its lists were hand-coded, so list_visible was never used and
-- did not match them; these rows now describe what the page shows.

START TRANSACTION;

UPDATE `tables_metadata`
SET `list_visible` = CASE `column_name` WHEN 'permission_name' THEN 1 WHEN 'description' THEN 1 ELSE 0 END,
    `version` = `version` + 1
WHERE `table_name` = 'admin_permissions';

UPDATE `tables_metadata`
SET `list_visible` = CASE `column_name` WHEN 'role_id' THEN 1 WHEN 'permission' THEN 1 ELSE 0 END,
    `version` = `version` + 1
WHERE `table_name` = 'admin_role_permissions';

UPDATE `tables_metadata`
SET `col_real_name` = 'Alias', `version` = `version` + 1
WHERE `table_name` = 'admin_permissions' AND `column_name` = 'alias';

UPDATE `metadata_tables`
SET `label` = 'Permissions',
    `singular_label` = 'Permission',
    `title_column` = 'permission_name',
    `search_columns` = JSON_ARRAY('permission_name'),
    `version` = `version` + 1
WHERE `table_name` = 'admin_permissions';

UPDATE `metadata_tables`
SET `label` = 'Role assignments',
    `singular_label` = 'Assignment',
    `search_columns` = JSON_ARRAY('role_id', 'permission'),
    `version` = `version` + 1
WHERE `table_name` = 'admin_role_permissions';

COMMIT;
