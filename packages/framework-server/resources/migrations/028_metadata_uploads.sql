-- Every file uploaded to a metadata file or image field, so a replaced,
-- removed or abandoned file can be deleted from storage. The field itself
-- still stores only the file's URL.
--   PENDING   uploaded, not yet saved with a record (deleted after 24 hours)
--   ATTACHED  saved in table_name.column_name of record_id
--   REMOVED   replaced, cleared or its record deleted; waiting to be deleted
--   DELETED   gone from storage

CREATE TABLE IF NOT EXISTS `metadata_uploads` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(100) NOT NULL,
  `column_name` VARCHAR(100) NOT NULL,
  `record_id` VARCHAR(255) NULL,
  `url` VARCHAR(768) NOT NULL,
  `public_id` VARCHAR(255) NOT NULL,
  `mimetype` VARCHAR(100) NOT NULL,
  `size_bytes` BIGINT UNSIGNED NULL,
  `status` ENUM('PENDING', 'ATTACHED', 'REMOVED', 'DELETED') NOT NULL DEFAULT 'PENDING',
  `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `last_error` VARCHAR(500) NULL,
  `uploaded_by` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_metadata_uploads_url` (`url`),
  KEY `idx_metadata_uploads_record` (`table_name`, `record_id`),
  KEY `idx_metadata_uploads_status` (`status`, `createdAt`),
  CONSTRAINT `chk_metadata_uploads_table` CHECK (`table_name` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$'),
  CONSTRAINT `chk_metadata_uploads_column` CHECK (`column_name` REGEXP '^[A-Za-z_][A-Za-z0-9_]*$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
