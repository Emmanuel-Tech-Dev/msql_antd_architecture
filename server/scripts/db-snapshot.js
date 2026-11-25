require("dotenv").config();

// Writes resources/schema/framework_schema.sql from this database: the
// structure of the framework's own tables and only the framework's rows
// (roles, permissions and resources of its pages and APIs, the bootstrap
// registry, settings, and the metadata describing its admin tables). No
// users, logs, backups or project data. npm run db:setup loads it into an
// empty database. Run it after adding migrations: npm run db:snapshot.

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const OUTPUT = path.resolve(__dirname, "../resources/schema/framework_schema.sql");
const MIGRATIONS = path.resolve(__dirname, "../resources/migrations");

// Structure and the framework's rows.
const SEEDED_TABLES = [
  "admin_roles", "admin_permissions", "admin_resources", "admin_permission_resources",
  "admin_role_permissions", "admin_role_browser_routes", "system_resources",
  "framework_bootstrap_profiles", "framework_bootstrap_datasets", "framework_bootstrap_profile_datasets",
  "system_settings", "ui_settings", "metadata_tables", "tables_metadata", "metadata_lookups",
];
// Structure only: people, sessions, history and files of one install.
const EMPTY_TABLES = [
  "admin", "admin_credentials", "admin_user_roles", "admin_user_permission_overrides",
  "admin_user_browser_route_overrides", "token_blacklist", "user_activity_logs",
  "metadata_versions", "metadata_uploads", "database_backups",
];
const FRAMEWORK_TABLES = new Set([...SEEDED_TABLES, ...EMPTY_TABLES]);

const FRAMEWORK_ROLES = new Set(["superadmin", "dev", "admin", "user"]);
// Browser routes that are project pages or have no page.
const PROJECT_ROUTES = new Set(["/admin/testing", "/admin/settings/api"]);
// Settings that hold one install's private values.
const PRIVATE_SETTINGS = new Set(["auth.dev_accounts"]);
// Columns that point at a user of the source install.
const USER_COLUMNS = new Set(["created_by", "updated_by", "changed_by"]);

// JSON columns come back parsed; they go back in as JSON text.
function storedValue(column, value) {
  if (USER_COLUMNS.has(column)) return null;
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) return JSON.stringify(value);
  return value;
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  try {
    const query = async (sql, params) => (await connection.query(sql, params))[0];
    const tableNames = new Set((await query("SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()")).map((row) => row.name));
    const missing = [...FRAMEWORK_TABLES].filter((table) => !tableNames.has(table));
    if (missing.length) throw new Error(`This database lacks framework tables: ${missing.join(", ")}`);

    // Tables that are not the framework's are the project's: their
    // permissions, resources and metadata stay out.
    const projectTables = [...tableNames].filter((table) => !FRAMEWORK_TABLES.has(table) && table !== "framework_schema_migrations");
    const mentionsProjectTable = (text) => projectTables.some((table) => new RegExp(`(^|[:/])${table}s?($|[:/])`).test(String(text ?? "")));

    const rows = {};
    for (const table of SEEDED_TABLES) rows[table] = await query(`SELECT * FROM \`${table}\` ORDER BY 1`);

    rows.admin_roles = rows.admin_roles.filter((role) => FRAMEWORK_ROLES.has(String(role.role_name).trim().toLowerCase()));
    const roles = new Set(rows.admin_roles.map((role) => role.role_name));
    rows.admin_permissions = rows.admin_permissions.filter((permission) => !mentionsProjectTable(permission.permission_name));
    const permissions = new Set(rows.admin_permissions.map((permission) => permission.permission_name));
    rows.admin_resources = rows.admin_resources.filter((resource) => !mentionsProjectTable(resource.resource)
      && !mentionsProjectTable(resource.resource_path) && !PROJECT_ROUTES.has(String(resource.resource_path).trim()));
    const resources = new Set(rows.admin_resources.map((resource) => resource.resource));
    rows.admin_permission_resources = rows.admin_permission_resources.filter((link) => permissions.has(link.permission) && resources.has(link.resource));
    rows.admin_role_permissions = rows.admin_role_permissions.filter((link) => roles.has(link.role_id) && permissions.has(link.permission));
    rows.admin_role_browser_routes = rows.admin_role_browser_routes.filter((link) => roles.has(link.role_id) && resources.has(link.resource));
    rows.system_settings = rows.system_settings.filter((setting) => !PRIVATE_SETTINGS.has(setting.key));
    const described = (table) => FRAMEWORK_TABLES.has(table) || table === "system_resources";
    rows.metadata_tables = rows.metadata_tables.filter((row) => described(row.table_name));
    rows.tables_metadata = rows.tables_metadata.filter((row) => described(row.table_name));
    rows.metadata_lookups = rows.metadata_lookups.filter((row) => described(row.source_table));

    const applied = new Set((await query("SELECT migration_name AS name FROM framework_schema_migrations")).map((row) => row.name));
    const included = fs.readdirSync(MIGRATIONS).filter((file) => file.endsWith(".sql") && applied.has(file)).sort();

    const lines = [
      "-- Framework schema snapshot: structure of the framework tables and the",
      "-- framework's own rows. Generated by npm run db:snapshot; loaded by",
      "-- npm run db:setup into an empty database. Do not edit by hand.",
      `-- Generated: ${new Date().toISOString()}`,
      `-- @migrations ${JSON.stringify(included)}`,
      "",
      "SET FOREIGN_KEY_CHECKS = 0;",
      "SET NAMES utf8mb4;",
      "",
    ];
    for (const table of [...SEEDED_TABLES, ...EMPTY_TABLES]) {
      const [{ "Create Table": create }] = await query(`SHOW CREATE TABLE \`${table}\``);
      lines.push(`-- ${table}`, `${create.replace(/ AUTO_INCREMENT=\d+/, "")};`);
      for (const row of rows[table] ?? []) {
        const record = Object.fromEntries(Object.entries(row).map(([column, value]) => [column, storedValue(column, value)]));
        lines.push(mysql.format("INSERT INTO ?? SET ?;", [table, record]));
      }
      lines.push("");
    }
    lines.push("SET FOREIGN_KEY_CHECKS = 1;", "");

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, lines.join("\n"));
    const counts = SEEDED_TABLES.map((table) => `${table} ${rows[table].length}`).join(", ");
    console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}: ${FRAMEWORK_TABLES.size} tables, ${included.length} migrations included.\nRows: ${counts}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Snapshot failed: ${error.message}`);
  process.exitCode = 1;
});
