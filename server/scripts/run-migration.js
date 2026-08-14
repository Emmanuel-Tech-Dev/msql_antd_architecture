require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mysql = require("mysql2/promise");

const migrationName = process.argv[2];
const migrationsPath = path.resolve(__dirname, "../resources/migrations");

if (
  migrationName &&
  (path.basename(migrationName) !== migrationName || !migrationName.endsWith(".sql"))
) {
  console.error("Usage: node scripts/run-migration.js [migration-file.sql]");
  process.exitCode = 1;
  return;
}

const checksum = (contents) =>
  crypto.createHash("sha256").update(contents, "utf8").digest("hex");

async function migrationFiles() {
  if (migrationName) {
    const selectedPath = path.join(migrationsPath, migrationName);
    await fs.promises.access(selectedPath, fs.constants.R_OK);
    return [migrationName];
  }

  const files = (await fs.promises.readdir(migrationsPath))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right, "en"));

  const sequences = new Map();
  for (const file of files) {
    const sequence = file.match(/^(\d+)_/)?.[1];
    if (!sequence) {
      throw new Error(`Migration must start with a numeric sequence: ${file}`);
    }
    if (sequences.has(sequence)) {
      throw new Error(
        `Duplicate migration sequence ${sequence}: ${sequences.get(sequence)}, ${file}`,
      );
    }
    sequences.set(sequence, file);
  }

  return files;
}

async function run() {
  const files = await migrationFiles();
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS framework_schema_migrations (
        migration_name VARCHAR(255) NOT NULL PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    for (const file of files) {
      const migrationPath = path.join(migrationsPath, file);
      const sql = await fs.promises.readFile(migrationPath, "utf8");
      const fileChecksum = checksum(sql);
      const [rows] = await connection.execute(
        "SELECT checksum FROM framework_schema_migrations WHERE migration_name = ?",
        [file],
      );

      if (rows.length > 0) {
        if (rows[0].checksum !== fileChecksum) {
          throw new Error(`Applied migration has changed: ${file}`);
        }
        console.log(`Skipped migration: ${file}`);
        continue;
      }

      await connection.query(sql);
      await connection.execute(
        "INSERT INTO framework_schema_migrations (migration_name, checksum) VALUES (?, ?)",
        [file, fileChecksum],
      );
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
