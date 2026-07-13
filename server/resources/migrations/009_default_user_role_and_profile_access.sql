START TRANSACTION;

-- The framework must always have a baseline role for newly provisioned users.
-- Match normalized names so this remains compatible with older data containing
-- accidental whitespace such as `User `.
INSERT INTO `admin_roles`
  (`role_name`, `description`, `is_system_role`, `createdAt`, `updatedAt`)
SELECT
  'User',
  'Regular user with baseline authenticated access',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM `admin_roles`
  WHERE LOWER(TRIM(`role_name`)) = 'user'
);

-- Repair existing roleless accounts so they follow the same invariant as new
-- accounts. The exact stored role name is selected to preserve FK compatibility.
INSERT IGNORE INTO `admin_user_roles`
  (`user_id`, `role_id`, `createdAt`, `updatedAt`)
SELECT
  admin_user.`custom_id`,
  default_role.`role_name`,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `admin` AS admin_user
INNER JOIN `admin_roles` AS default_role
  ON LOWER(TRIM(default_role.`role_name`)) = 'user'
LEFT JOIN `admin_user_roles` AS existing_role
  ON existing_role.`user_id` = admin_user.`custom_id`
WHERE existing_role.`user_id` IS NULL;

-- In browser-route policy, is_public=1 means every authenticated user receives
-- the route without a role-specific route assignment. The endpoint itself stays
-- protected by auth middleware.
UPDATE `admin_resources`
SET
  `is_public` = 1,
  `show_in_nav` = 1,
  `updatedAt` = CURRENT_TIMESTAMP
WHERE `resource_type` = 'BROWSER_ROUTE'
  AND `resource_path` = '/admin/profile';

COMMIT;
