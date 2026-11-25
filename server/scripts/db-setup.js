require("dotenv").config();

// A fresh install: builds the framework in an EMPTY database. It loads
// resources/schema/framework_schema.sql (framework tables and rows), records
// the migrations that snapshot already includes, runs any newer ones, and
// creates the first superadmin from SETUP_ADMIN_EMAIL with a one-time
// temporary password (changed at first sign-in). An existing database is
// never touched: it refuses if any framework table exists. Existing installs
// use npm run migrate.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const mysql = require("mysql2/promise");

const SNAPSHOT = path.resolve(__dirname, "../resources/schema/framework_schema.sql");
const MIGRATIONS = path.resolve(__dirname, "../resources/migrations");
const SENTINEL_TABLES = ["admin", "admin_roles", "tables_metadata", "framework_schema_migrations"];

const checksum = (contents) => crypto.createHash("sha256").update(contents, "utf8").digest("hex");

async function main() {
  const email = String(process.env.SETUP_ADMIN_EMAIL ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Set SETUP_ADMIN_EMAIL in .env to the first administrator's email address.");
  }
  const snapshot = fs.readFileSync(SNAPSHOT, "utf8");
  const included = JSON.parse(snapshot.match(/^-- @migrations (.*)$/m)?.[1] ?? "[]");

  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    multipleStatements: true,
  });
  try {
    const [existing] = await connection.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?)",
      [SENTINEL_TABLES],
    );
    if (existing.length) {
      throw new Error(`${process.env.DATABASE_NAME} already has framework tables (${existing.map((row) => row.name).join(", ")}). Setup only runs on an empty database; use npm run migrate to update an existing one.`);
    }

    console.log(`Loading the framework schema into ${process.env.DATABASE_NAME}…`);
    await connection.query(snapshot);

    // The snapshot already contains these migrations' effects.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS framework_schema_migrations (
        migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    for (const file of included) {
      const migrationPath = path.join(MIGRATIONS, file);
      if (!fs.existsSync(migrationPath)) continue;
      await connection.execute(
        "INSERT INTO framework_schema_migrations (migration_name, checksum) VALUES (?, ?)",
        [file, checksum(fs.readFileSync(migrationPath, "utf8"))],
      );
    }
  } finally {
    await connection.end();
  }

  // Migrations newer than the snapshot.
  execFileSync(process.execPath, [path.join(__dirname, "run-migration.js")], { stdio: "inherit" });

  // Created the same way the Users page creates accounts.
  const AuthService = require("../core/lib/authService");
  const created = await new AuthService().createAdminUser({
    name: String(process.env.SETUP_ADMIN_NAME ?? "").trim() || "Administrator",
    email,
    role: "SuperAdmin",
  });
  console.log([
    "",
    "Framework installed.",
    `First administrator: ${created.email} (${created.custom_id}), role SuperAdmin`,
    `Temporary password:  ${created.temporary_password}`,
    "It is shown only now. Sign in with it and choose a new password.",
  ].join("\n"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`Setup failed: ${error.message}`);
    process.exit(1);
  });
