require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const migrationName = process.argv[2];
const migrationsPath = path.resolve(__dirname, "../resources/migrations");

if (!migrationName || path.basename(migrationName) !== migrationName || !migrationName.endsWith(".sql")) {
  console.error("Usage: node scripts/run-migration.js <migration-file.sql>");
  process.exitCode = 1;
} else {
  const migrationPath = path.join(migrationsPath, migrationName);

  (async () => {
    const sql = await fs.promises.readFile(migrationPath, "utf8");
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      multipleStatements: true,
    });

    try {
      await connection.query(sql);
      console.log(`Applied migration: ${migrationName}`);
    } finally {
      await connection.end();
    }
  })().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}
