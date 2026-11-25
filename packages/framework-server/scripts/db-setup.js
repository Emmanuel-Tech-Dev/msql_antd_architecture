#!/usr/bin/env node
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
const mysql = require("mysql2/promise");
const { FRAMEWORK_MIGRATIONS, ensureTrackingTable, recordMigration, runMigrations } = require("../core/lib/migrationRunner");

const SNAPSHOT = path.resolve(__dirname, "../resources/schema/framework_schema.sql");
const SENTINEL_TABLES = ["admin", "admin_roles", "tables_metadata", "framework_schema_migrations"];

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

    // The snapshot already contains these framework migrations' effects.
    await ensureTrackingTable(connection);
    for (const file of included) {
      const migrationPath = path.join(FRAMEWORK_MIGRATIONS, file);
      if (fs.existsSync(migrationPath)) await recordMigration(connection, { source: "framework", file, path: migrationPath });
    }

    // Framework migrations newer than the snapshot, then the project's.
    await runMigrations(connection);
  } finally {
    await connection.end();
  }

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
