// Migrations from two sources: the framework's own (resources/migrations,
// shipped with the framework) and the project's (MIGRATIONS_PATH). Numbers
// are unique within a source; pending framework migrations run first, then
// the project's, each in number order. framework_schema_migrations records
// each one with its source and checksum; a recorded migration whose file
// later changes stops the run.

const fs = require("fs");
const path = require("path");
const utils = require("../../shared/utils/functions");

const FRAMEWORK_MIGRATIONS = path.resolve(__dirname, "../../resources/migrations");
const SOURCES = ["framework", "project"];

const checksum = (contents) => utils.sha256(contents);

// The project's folder, when it has one (in this repository, it does not).
function projectMigrationsDir() {
  const dir = process.env.MIGRATIONS_PATH;
  return dir && path.resolve(dir) !== FRAMEWORK_MIGRATIONS ? path.resolve(dir) : null;
}

function filesIn(dir, source) {
  if (!dir || !fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".sql")).sort((a, b) => a.localeCompare(b, "en"));
  const numbers = new Map();
  for (const file of files) {
    const number = file.match(/^(\d+)_/)?.[1];
    if (!number) throw new Error(`${source} migration must start with a number: ${file}`);
    if (numbers.has(number)) throw new Error(`Duplicate ${source} migration number ${number}: ${numbers.get(number)}, ${file}`);
    numbers.set(number, file);
  }
  return files.map((file) => ({ source, file, path: path.join(dir, file) }));
}

// Every migration, framework first, each source in number order.
function listMigrations({ frameworkDir = FRAMEWORK_MIGRATIONS, projectDir = projectMigrationsDir() } = {}) {
  return [...filesIn(frameworkDir, "framework"), ...filesIn(projectDir, "project")];
}

// Creates the record table, or adds `source` to one from before two sources
// existed: every migration recorded until then is the framework's.
async function ensureTrackingTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS framework_schema_migrations (
      source VARCHAR(20) NOT NULL DEFAULT 'framework',
      migration_name VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (source, migration_name)
    ) ENGINE=InnoDB
  `);
  const [columns] = await connection.query(
    "SELECT column_name AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'framework_schema_migrations'",
  );
  if (!columns.some((column) => column.name === "source")) {
    await connection.query(`
      ALTER TABLE framework_schema_migrations
        ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'framework' FIRST,
        DROP PRIMARY KEY,
        ADD PRIMARY KEY (source, migration_name)
    `);
    return { upgraded: true };
  }
  return { upgraded: false };
}

async function recordMigration(connection, { source, file, path: filePath }) {
  await connection.execute(
    "INSERT INTO framework_schema_migrations (source, migration_name, checksum) VALUES (?, ?, ?)",
    [source, file, checksum(fs.readFileSync(filePath, "utf8"))],
  );
}

// Applies what is pending; `only` limits the run to one migration
// ("file.sql", or "project:file.sql" when both sources have that name).
async function runMigrations(connection, { migrations = listMigrations(), only, log = console.log } = {}) {
  await ensureTrackingTable(connection);
  let selected = migrations;
  if (only) {
    const [source, file] = only.includes(":") ? only.split(":") : [null, only];
    selected = migrations.filter((migration) => migration.file === file && (!source || migration.source === source));
    if (!selected.length) throw new Error(`No migration named ${only}`);
    if (selected.length > 1) throw new Error(`${file} exists in both sources; use framework:${file} or project:${file}`);
  }

  const [rows] = await connection.query("SELECT source, migration_name, checksum FROM framework_schema_migrations");
  const recorded = new Map(rows.map((row) => [`${row.source}:${row.migration_name}`, row.checksum]));
  const applied = [];
  for (const migration of selected) {
    const sql = fs.readFileSync(migration.path, "utf8");
    const known = recorded.get(`${migration.source}:${migration.file}`);
    if (known) {
      if (known !== checksum(sql)) throw new Error(`Applied ${migration.source} migration has changed: ${migration.file}`);
      log(`Skipped ${migration.source} migration: ${migration.file}`);
      continue;
    }
    await connection.query(sql);
    await recordMigration(connection, migration);
    applied.push(migration);
    log(`Applied ${migration.source} migration: ${migration.file}`);
  }
  return applied;
}

module.exports = {
  FRAMEWORK_MIGRATIONS, SOURCES, checksum, ensureTrackingTable, listMigrations, projectMigrationsDir, recordMigration, runMigrations,
};
