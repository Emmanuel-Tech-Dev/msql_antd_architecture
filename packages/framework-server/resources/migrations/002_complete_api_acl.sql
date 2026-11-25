-- Phase 2: complete permission -> API resource mappings.
-- Idempotent and safe to re-run.

START TRANSACTION;

CREATE TEMPORARY TABLE `phase2_acl_tables` (
  `table_name` varchar(100) NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO `phase2_acl_tables` (`table_name`) VALUES
  ('achievements'),
  ('admin'),
  ('admin_permission_resources'),
  ('admin_permissions'),
  ('admin_resources'),
  ('admin_role_permissions'),
  ('admin_roles'),
  ('admin_settings'),
  ('admin_user_roles'),
  ('file_folder'),
  ('tables_metadata'),
  ('transaction'),
  ('volunteer');

CREATE TEMPORARY TABLE `phase2_acl_operations` (
  `permission_action` varchar(20) NOT NULL,
  `resource_suffix` varchar(30) NOT NULL,
  `path_suffix` varchar(30) NOT NULL,
  `http_method` enum('GET','POST','PUT','DELETE','PATCH','ALL') NOT NULL,
  `description_action` varchar(100) NOT NULL,
  PRIMARY KEY (`permission_action`, `resource_suffix`)
) ENGINE=MEMORY;

INSERT INTO `phase2_acl_operations` VALUES
  ('read',   'list',        '',             'GET',    'List'),
  ('read',   'table',       '/table',       'GET',    'Read table view for'),
  ('read',   'filters',     '/filters',     'GET',    'Read filter metadata for'),
  ('read',   'query',       '/query',       'POST',   'Query'),
  ('create', 'one',         '',             'POST',   'Create one'),
  ('create', 'bulk',        '/bulk',        'POST',   'Bulk create'),
  ('create', 'file',        '/file',        'POST',   'Create with file for'),
  ('create', 'upload_bulk', '/upload_bulk', 'POST',   'Bulk upload files for'),
  ('update', 'by_id',       '/:id',         'PUT',    'Update by id for'),
  ('delete', 'by_id',       '/:id',         'DELETE', 'Delete by id for');

-- CRUD permissions for every table intentionally exposed through BaseRoute.
INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `createdAt`, `updatedAt`)
SELECT DISTINCT
  CONCAT(operation.`permission_action`, ':', target.`table_name`),
  CONCAT(
    UPPER(LEFT(operation.`permission_action`, 1)),
    SUBSTRING(operation.`permission_action`, 2),
    ' access for ',
    target.`table_name`
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `phase2_acl_tables` AS target
CROSS JOIN `phase2_acl_operations` AS operation;

-- Convert legacy update/delete resources to explicit parameterized routes.
UPDATE `admin_resources` AS resource
JOIN `phase2_acl_tables` AS target
  ON resource.`resource` = CONCAT('update:', target.`table_name`, ':by_id')
SET resource.`resource_path` = CONCAT('/api/', target.`table_name`, '/:id'),
    resource.`http_method` = 'PUT';

UPDATE `admin_resources` AS resource
JOIN `phase2_acl_tables` AS target
  ON resource.`resource` = CONCAT('delete:', target.`table_name`, ':by_id')
SET resource.`resource_path` = CONCAT('/api/', target.`table_name`, '/:id'),
    resource.`http_method` = 'DELETE';

-- Insert missing generic API resources. Legacy resources occupying the same
-- path/method are retained and mapped in the next statement.
INSERT IGNORE INTO `admin_resources` (
  `resource`,
  `resource_type`,
  `resource_path`,
  `http_method`,
  `description`,
  `icon`,
  `is_public`,
  `display_order`,
  `createdAt`,
  `updatedAt`,
  `category`
)
SELECT
  CONCAT(
    operation.`permission_action`,
    ':',
    target.`table_name`,
    ':',
    operation.`resource_suffix`
  ),
  'API_ENDPOINT',
  CONCAT('/api/', target.`table_name`, operation.`path_suffix`),
  operation.`http_method`,
  CONCAT(operation.`description_action`, ' ', target.`table_name`),
  NULL,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'Generic API'
FROM `phase2_acl_tables` AS target
CROSS JOIN `phase2_acl_operations` AS operation;

-- Map each CRUD permission to whichever resource owns the exact method/path.
-- This also repairs legacy resources such as "Get Users" and "Get Roles".
INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
SELECT
  CONCAT(operation.`permission_action`, ':', target.`table_name`),
  resource.`resource`,
  'API_ENDPOINT',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `phase2_acl_tables` AS target
CROSS JOIN `phase2_acl_operations` AS operation
JOIN `admin_resources` AS resource
  ON resource.`resource_type` = 'API_ENDPOINT'
 AND resource.`resource_path` = CONCAT(
   '/api/', target.`table_name`, operation.`path_suffix`
 )
 AND resource.`http_method` = operation.`http_method`;

-- Permissions for non-generic operational endpoints.
INSERT IGNORE INTO `admin_permissions`
  (`permission_name`, `description`, `createdAt`, `updatedAt`)
VALUES
  ('read:system_logs', 'Read application log data and log file metadata', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('read:system_cache', 'Read system cache analytics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('create:file_upload', 'Upload files through the framework upload endpoint', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TEMPORARY TABLE `phase2_explicit_resources` (
  `permission` varchar(100) NOT NULL,
  `resource` varchar(100) NOT NULL,
  `resource_path` varchar(255) NOT NULL,
  `http_method` enum('GET','POST','PUT','DELETE','PATCH','ALL') NOT NULL,
  `description` varchar(255) NOT NULL,
  PRIMARY KEY (`resource`)
) ENGINE=MEMORY;

INSERT INTO `phase2_explicit_resources` VALUES
  ('read:admin',             'read:access:users_by_role',       '/access/users/:role_name',       'GET',  'Read users assigned to a role'),
  ('read:admin_permissions', 'read:access:role_permissions',   '/access/permissions/:role_name', 'GET',  'Read permissions assigned to a role'),
  ('read:admin_resources',   'read:access:role_routes',        '/access/routes/:role_name',      'GET',  'Read browser routes assigned to a role'),
  ('read:admin',             'read:access:user_info',          '/access/user_info/:user',        'GET',  'Read user access-control details'),
  ('update:admin_permissions','manage:access:role_permissions','/access/permissions/save',       'POST', 'Save permissions assigned to a role'),
  ('update:admin_roles',     'manage:access:role_routes',      '/access/routes/save',            'POST', 'Save browser routes assigned to a role'),
  ('update:admin',           'manage:access:user_status',      '/access/user/toggle_status',     'POST', 'Enable or disable an administrator'),
  ('update:admin_user_roles','manage:access:user_roles',       '/access/assign/roles',            'POST', 'Assign a role to an administrator'),
  ('read:system_logs',       'read:system:logs',               '/api/v1/logs',                    'GET',  'Read application logs'),
  ('read:system_logs',       'read:system:log_files',          '/api/v1/logs/files',              'GET',  'List application log files'),
  ('read:system_cache',      'read:system:cache',              '/api/v1/cache',                   'GET',  'Read cache analytics'),
  ('create:file_upload',     'create:system:file_upload',      '/api/v1/upload',                  'POST', 'Upload framework files'),
  ('create:admin',           'create:auth:admin_user',         '/auth/create_user',               'POST', 'Create an administrator account');

INSERT IGNORE INTO `admin_resources` (
  `resource`,
  `resource_type`,
  `resource_path`,
  `http_method`,
  `description`,
  `icon`,
  `is_public`,
  `display_order`,
  `createdAt`,
  `updatedAt`,
  `category`
)
SELECT
  explicit.`resource`,
  'API_ENDPOINT',
  explicit.`resource_path`,
  explicit.`http_method`,
  explicit.`description`,
  NULL,
  0,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'System API'
FROM `phase2_explicit_resources` AS explicit;

INSERT IGNORE INTO `admin_permission_resources`
  (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`)
SELECT
  explicit.`permission`,
  resource.`resource`,
  'API_ENDPOINT',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `phase2_explicit_resources` AS explicit
JOIN `admin_resources` AS resource
  ON resource.`resource_type` = 'API_ENDPOINT'
 AND resource.`resource_path` = explicit.`resource_path`
 AND resource.`http_method` = explicit.`http_method`;

-- Privileged roles bypass enforcement, but assigning every declared
-- permission keeps frontend useCan() and permission-management UIs consistent.
INSERT IGNORE INTO `admin_role_permissions`
  (`role_id`, `permission`, `createdAt`, `updatedAt`)
SELECT
  role.`role_name`,
  permission.`permission_name`,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `admin_roles` AS role
CROSS JOIN `admin_permissions` AS permission
WHERE LOWER(TRIM(role.`role_name`)) IN ('superadmin', 'dev');

DROP TEMPORARY TABLE `phase2_explicit_resources`;
DROP TEMPORARY TABLE `phase2_acl_operations`;
DROP TEMPORARY TABLE `phase2_acl_tables`;

COMMIT;
