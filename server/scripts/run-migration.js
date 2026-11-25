require("dotenv").config();

// npm run migrate: applies pending framework migrations, then the project's
// (MIGRATIONS_PATH). One migration: node scripts/run-migration.js file.sql
// (or project:file.sql when both sources have that name).

const mysql = require("mysql2/promise");
const { runMigrations } = require("../core/lib/migrationRunner");

const only = process.argv[2];
if (only && !/^((framework|project):)?[\w.-]+\.sql$/.test(only)) {
  console.error("Usage: node scripts/run-migration.js [migration-file.sql | project:migration-file.sql]");
  process.exit(1);
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    multipleStatements: true,
  });
  try {
    await runMigrations(connection, { only });
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
