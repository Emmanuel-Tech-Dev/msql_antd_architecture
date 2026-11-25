-- The resource Icon field becomes an icon picker (field type `icon`), so only
-- names the UI icon registry can draw are offered. Fixes the one stored name
-- that is not an antd icon (`SettingsOutlined` -> `SettingOutlined`).

START TRANSACTION;

UPDATE `tables_metadata`
SET `type` = 'icon', `updatedAt` = CURRENT_TIMESTAMP
WHERE `table_name` = 'admin_resources' AND `column_name` = 'icon' AND `type` = 'text';

UPDATE `admin_resources`
SET `icon` = 'SettingOutlined', `updatedAt` = CURRENT_TIMESTAMP
WHERE `icon` = 'SettingsOutlined';

COMMIT;
