/*
  Generate ACL seed SQL from a MySQL schema dump.

  Usage:
    node scripts/generate-acl-seed-from-schema.js "F:\\Downloads\\mysql_orm.sql"

  Output:
    server/resources/seeds/generated_acl_seed.sql
*/

const fs = require("fs");
const path = require("path");

const schemaPath = process.argv[2];

if (!schemaPath) {
  console.error(
    "Missing schema path. Example: node scripts/generate-acl-seed-from-schema.js \"F:\\\\Downloads\\\\mysql_orm.sql\"",
  );
  process.exit(1);
}

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found: ${schemaPath}`);
  process.exit(1);
}

const outputPath = path.resolve(
  __dirname,
  "..",
  "resources",
  "seeds",
  "generated_acl_seed.sql",
);

const raw = fs.readFileSync(schemaPath, "utf8");

const tableMatches = [...raw.matchAll(/CREATE TABLE IF NOT EXISTS `([^`]+)`/g)];
const allTables = tableMatches.map((m) => m[1]);

// Exclude infrastructure and ACL tables already used to store access control itself.
const excludedTables = new Set([
  "admin_permissions",
  "admin_permission_resources",
  "admin_resources",
  "admin_roles",
  "admin_role_permissions",
  "admin_user_roles",
  "admin_credentials",
  "system_settings",
  "tables",
  "tables_metadata",
  "token_blacklist",
  "user_activity_logs",
]);

const defaultTables = allTables.filter((t) => !excludedTables.has(t));

const permissionRows = [];
const resourceRows = [];
const permissionResourceRows = [];
const rolePermissionRows = [];

function esc(value) {
  return String(value).replace(/'/g, "''");
}

function addPermission(permissionName, description) {
  permissionRows.push(
    `('${esc(permissionName)}', '${esc(description)}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  );
}

function addApiResource(resource, resourcePath, method, description) {
  resourceRows.push(
    `('${esc(resource)}', 'API_ENDPOINT', '${esc(resourcePath)}', '${esc(method)}', '${esc(description)}', NULL, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)`,
  );
}

function mapPermissionToResource(permission, resource) {
  permissionResourceRows.push(
    `('${esc(permission)}', '${esc(resource)}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  );
}

function assignRole(permission, role = "SuperAdmin") {
  rolePermissionRows.push(
    `('${esc(role)}', '${esc(permission)}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  );
}

for (const table of defaultTables) {
  const permRead = `read:${table}`;
  const permCreate = `create:${table}`;
  const permUpdate = `update:${table}`;
  const permDelete = `delete:${table}`;

  addPermission(permRead, `Read access for ${table}`);
  addPermission(permCreate, `Create access for ${table}`);
  addPermission(permUpdate, `Update access for ${table}`);
  addPermission(permDelete, `Delete access for ${table}`);

  assignRole(permRead);
  assignRole(permCreate);
  assignRole(permUpdate);
  assignRole(permDelete);

  const defs = [
    {
      permission: permRead,
      resource: `read:${table}:list`,
      path: `/api/${table}`,
      method: "GET",
      description: `List ${table}`,
    },
    {
      permission: permRead,
      resource: `read:${table}:table`,
      path: `/api/${table}/table`,
      method: "GET",
      description: `Table view for ${table}`,
    },
    {
      permission: permRead,
      resource: `read:${table}:filters`,
      path: `/api/${table}/filters`,
      method: "GET",
      description: `Filter metadata for ${table}`,
    },
    {
      permission: permRead,
      resource: `read:${table}:query`,
      path: `/api/${table}/query`,
      method: "POST",
      description: `Query ${table}`,
    },
    {
      permission: permCreate,
      resource: `create:${table}:one`,
      path: `/api/${table}`,
      method: "POST",
      description: `Create ${table} record`,
    },
    {
      permission: permCreate,
      resource: `create:${table}:bulk`,
      path: `/api/${table}/bulk`,
      method: "POST",
      description: `Bulk create ${table} records`,
    },
    {
      permission: permCreate,
      resource: `create:${table}:file`,
      path: `/api/${table}/file`,
      method: "POST",
      description: `Create ${table} with file`,
    },
    {
      permission: permCreate,
      resource: `create:${table}:upload_bulk`,
      path: `/api/${table}/upload_bulk`,
      method: "POST",
      description: `Bulk upload files for ${table}`,
    },
    {
      permission: permUpdate,
      resource: `update:${table}:by_id`,
      path: `/api/${table}`,
      method: "PUT",
      description: `Update ${table} by id`,
    },
    {
      permission: permDelete,
      resource: `delete:${table}:by_id`,
      path: `/api/${table}`,
      method: "DELETE",
      description: `Delete ${table} by id`,
    },
  ];

  for (const d of defs) {
    addApiResource(d.resource, d.path, d.method, d.description);
    mapPermissionToResource(d.permission, d.resource);
  }
}

const sql = `-- Auto-generated ACL seed from schema
-- Source schema: ${schemaPath}
-- Generated at: ${new Date().toISOString()}

START TRANSACTION;

-- 1) Permissions
INSERT IGNORE INTO admin_permissions
  (permission_name, description, createdAt, updatedAt)
VALUES
${permissionRows.join(",\n")};

-- 2) API resources
INSERT IGNORE INTO admin_resources
  (resource, resource_type, resource_path, http_method, description, icon, is_public, \`order\`, createdAt, updatedAt, category)
VALUES
${resourceRows.join(",\n")};

-- 3) Permission -> Resource mapping
INSERT IGNORE INTO admin_permission_resources
  (permission, resource, createdAt, updatedAt)
VALUES
${permissionResourceRows.join(",\n")};

-- 4) Optional: assign generated permissions to SuperAdmin role
INSERT IGNORE INTO admin_role_permissions
  (role_id, permission, createdAt, updatedAt)
VALUES
${rolePermissionRows.join(",\n")};

COMMIT;
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, sql, "utf8");

console.log(`Detected tables: ${allTables.length}`);
console.log(`Default target tables: ${defaultTables.length}`);
console.log(`Wrote seed SQL: ${outputPath}`);
