const fs = require("fs");
const os = require("os");
const path = require("path");
const { checksum, listMigrations, runMigrations } = require("../core/lib/migrationRunner");

function folder(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migrations-"));
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), sql);
  return dir;
}

// A connection that records statements and keeps framework_schema_migrations in memory.
function fakeConnection({ recorded = [], hasSource = true } = {}) {
  const rows = recorded.map((row) => ({ source: "framework", ...row }));
  const statements = [];
  return {
    statements,
    rows,
    async query(sql) {
      statements.push(sql.trim().split(/\s+/).slice(0, 4).join(" "));
      if (sql.includes("information_schema.columns")) return [hasSource ? [{ name: "source" }] : [{ name: "migration_name" }]];
      if (sql.startsWith("SELECT source")) return [rows];
      if (sql.includes("ALTER TABLE framework_schema_migrations")) hasSource = true;
      return [[]];
    },
    async execute(sql, [source, name, sum]) {
      rows.push({ source, migration_name: name, checksum: sum });
      return [{ affectedRows: 1 }];
    },
  };
}

describe("migrations from two sources", () => {
  const frameworkDir = folder({ "001_users.sql": "CREATE TABLE a (id INT);", "002_roles.sql": "CREATE TABLE b (id INT);" });
  const projectDir = folder({ "001_invoices.sql": "CREATE TABLE invoices (id INT);" });

  test("framework migrations come first, each source in number order, and numbers repeat across sources", () => {
    expect(listMigrations({ frameworkDir, projectDir }).map(({ source, file }) => `${source}:${file}`))
      .toEqual(["framework:001_users.sql", "framework:002_roles.sql", "project:001_invoices.sql"]);
    expect(listMigrations({ frameworkDir, projectDir: null })).toHaveLength(2);
  });

  test("a number used twice within one source is refused", () => {
    const clash = folder({ "003_a.sql": "", "003_b.sql": "" });
    expect(() => listMigrations({ frameworkDir: clash, projectDir: null })).toThrow("Duplicate framework migration number 003");
  });

  test("only pending migrations run, recorded with their source", async () => {
    const connection = fakeConnection({ recorded: [{ migration_name: "001_users.sql", checksum: checksum("CREATE TABLE a (id INT);") }] });
    const applied = await runMigrations(connection, { migrations: listMigrations({ frameworkDir, projectDir }), log: () => {} });
    expect(applied.map(({ source, file }) => `${source}:${file}`)).toEqual(["framework:002_roles.sql", "project:001_invoices.sql"]);
    expect(connection.rows.map((row) => `${row.source}:${row.migration_name}`)).toEqual([
      "framework:001_users.sql", "framework:002_roles.sql", "project:001_invoices.sql",
    ]);
  });

  test("an install from before two sources gets the source column; its records count as framework", async () => {
    const connection = fakeConnection({ hasSource: false, recorded: [{ migration_name: "001_users.sql", checksum: checksum("CREATE TABLE a (id INT);") }] });
    await runMigrations(connection, { migrations: listMigrations({ frameworkDir, projectDir: null }), log: () => {} });
    expect(connection.statements).toContain("ALTER TABLE framework_schema_migrations ADD");
    expect(connection.rows.map((row) => row.migration_name)).toEqual(["001_users.sql", "002_roles.sql"]);
  });

  test("a recorded migration whose file changed stops the run", async () => {
    const connection = fakeConnection({ recorded: [{ migration_name: "001_users.sql", checksum: "different" }] });
    await expect(runMigrations(connection, { migrations: listMigrations({ frameworkDir, projectDir }), log: () => {} }))
      .rejects.toThrow("Applied framework migration has changed: 001_users.sql");
  });

  test("one migration by name, with the source when both have it", async () => {
    const both = folder({ "001_users.sql": "CREATE TABLE p (id INT);" });
    const migrations = listMigrations({ frameworkDir, projectDir: both });
    await expect(runMigrations(fakeConnection(), { migrations, only: "001_users.sql", log: () => {} })).rejects.toThrow("exists in both sources");
    const applied = await runMigrations(fakeConnection(), { migrations, only: "project:001_users.sql", log: () => {} });
    expect(applied.map(({ source }) => source)).toEqual(["project"]);
  });
});
