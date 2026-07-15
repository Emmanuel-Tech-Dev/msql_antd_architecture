-- Hybrid RBAC authority layer.
-- Roles remain the baseline. Per-user ALLOW/DENY rows provide narrowly scoped
-- exceptions without copying or mutating a role.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS `admin_user_permission_overrides` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `permission` VARCHAR(100) NOT NULL,
  `effect` ENUM('ALLOW', 'DENY') NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `granted_by` VARCHAR(255) NULL,
  `valid_from` DATETIME NULL,
  `valid_until` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_permission_override` (`user_id`, `permission`),
  KEY `idx_permission_override_validity` (`user_id`, `valid_from`, `valid_until`),
  CONSTRAINT `fk_permission_override_user`
    FOREIGN KEY (`user_id`) REFERENCES `admin` (`custom_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permission_override_permission`
    FOREIGN KEY (`permission`) REFERENCES `admin_permissions` (`permission_name`) ON DELETE CASCADE,
  CONSTRAINT `fk_permission_override_grantor`
    FOREIGN KEY (`granted_by`) REFERENCES `admin` (`custom_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `admin_user_browser_route_overrides` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` VARCHAR(255) NOT NULL,
  `resource` VARCHAR(100) NOT NULL,
  `effect` ENUM('ALLOW', 'DENY') NOT NULL,
  `reason` VARCHAR(500) NOT NULL,
  `granted_by` VARCHAR(255) NULL,
  `valid_from` DATETIME NULL,
  `valid_until` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_browser_route_override` (`user_id`, `resource`),
  KEY `idx_route_override_validity` (`user_id`, `valid_from`, `valid_until`),
  CONSTRAINT `fk_route_override_user`
    FOREIGN KEY (`user_id`) REFERENCES `admin` (`custom_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_route_override_resource`
    FOREIGN KEY (`resource`) REFERENCES `admin_resources` (`resource`) ON DELETE CASCADE,
  CONSTRAINT `fk_route_override_grantor`
    FOREIGN KEY (`granted_by`) REFERENCES `admin` (`custom_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `alias`, `createdAt`, `updatedAt`)
VALUES
  ('manage:user_authority',
   'Manage explicit per-user permission and browser-route overrides',
   'Manage user authority',
   CURRENT_TIMESTAMP,
   CURRENT_TIMESTAMP);

INSERT IGNORE INTO `admin_resources`
  (`resource`, `resource_type`, `resource_path`, `http_method`, `description`,
   `icon`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`)
VALUES
  ('read:access:user_authority', 'API_ENDPOINT', '/access/user_authority/:user', 'GET',
   'Read inherited and direct authority for one user', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API'),
  ('manage:access:user_authority', 'API_ENDPOINT', '/access/user_authority/save', 'POST',
   'Replace explicit permission and browser-route authority for one user', NULL, 0, 0,
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'System API');

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
VALUES
  ('manage:user_authority', 'read:access:user_authority', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('manage:user_authority', 'manage:access:user_authority', 'API_ENDPOINT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Privileged system roles remain the only initial authority managers. The
-- permission may later be delegated explicitly, but it never grants the
-- SuperAdmin/dev bypass itself.
INSERT IGNORE INTO `admin_role_permissions`
  (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT
  role.`role_name`,
  'manage:user_authority',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `admin_roles` AS role
WHERE LOWER(TRIM(role.`role_name`)) IN ('superadmin', 'dev');

COMMIT;
