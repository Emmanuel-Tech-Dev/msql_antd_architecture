-- Database backup history and automatic backups.
-- Every backup (made by a person or by the schedule, kept on the server or
-- downloaded, done or failed) is recorded so the page can show when the last
-- one was made. The schedule lives in its own settings row, outside the
-- application settings, so only people who may back up can change it.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `database_backups` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `file_name` VARCHAR(160) NULL,
  `destination` ENUM('SERVER', 'DOWNLOAD') NOT NULL,
  `trigger_type` ENUM('MANUAL', 'AUTOMATIC') NOT NULL,
  `status` ENUM('DONE', 'FAILED') NOT NULL,
  `size_bytes` BIGINT UNSIGNED NULL,
  `sha256` CHAR(64) NULL,
  `error_message` VARCHAR(500) NULL,
  -- NULL for automatic backups.
  `created_by` VARCHAR(255) COLLATE utf8mb4_general_ci NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Set when a server copy is deleted; the row stays as history.
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_database_backup_created` (`createdAt`),
  KEY `idx_database_backup_kept` (`destination`, `status`, `deletedAt`),
  CONSTRAINT `fk_database_backup_creator` FOREIGN KEY (`created_by`) REFERENCES `admin` (`custom_id`) ON DELETE SET NULL
);

INSERT IGNORE INTO `ui_settings` (`setting_key`, `setting_value`, `description`) VALUES
  (
    'system.backup_schedule',
    JSON_OBJECT('enabled', FALSE, 'frequency', 'daily', 'hour', 2, 'keep', 14, 'startedAt', NULL),
    'Automatic database backups: how often, at what hour, and how many to keep'
  );

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`, `show_in_nav`)
VALUES
  ('read:system:database_backups', 'API_ENDPOINT', '/api/v1/system/backups', 'GET', 'Backup history, status and schedule', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0),
  ('download:system:database_backup', 'API_ENDPOINT', '/api/v1/system/backups/:backupId/download', 'GET', 'Download a backup kept on the server', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0),
  ('delete:system:database_backup', 'API_ENDPOINT', '/api/v1/system/backups/:backupId', 'DELETE', 'Delete a backup kept on the server', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0),
  ('update:system:backup_schedule', 'API_ENDPOINT', '/api/v1/system/backups/schedule', 'PUT', 'Change the automatic backup schedule', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API', 0);

INSERT IGNORE INTO `admin_permission_resources` (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`) VALUES
  ('create:database_backup', 'read:system:database_backups', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('create:database_backup', 'download:system:database_backup', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('create:database_backup', 'delete:system:database_backup', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('create:database_backup', 'update:system:backup_schedule', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
