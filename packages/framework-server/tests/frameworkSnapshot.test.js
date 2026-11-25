const fs = require("fs");
const path = require("path");

const SNAPSHOT = path.resolve(__dirname, "../resources/schema/framework_schema.sql");
const MIGRATIONS = path.resolve(__dirname, "../resources/migrations");

describe("framework schema snapshot (npm run db:setup)", () => {
  const snapshot = fs.readFileSync(SNAPSHOT, "utf8");
  const included = JSON.parse(snapshot.match(/^-- @migrations (.*)$/m)?.[1] ?? "null");

  test("lists the migrations it already contains, and each one exists", () => {
    expect(Array.isArray(included)).toBe(true);
    for (const file of included) expect(fs.existsSync(path.join(MIGRATIONS, file))).toBe(true);
  });

  test("creates the framework tables setup checks for", () => {
    for (const table of ["admin", "admin_credentials", "admin_roles", "tables_metadata", "metadata_tables", "metadata_uploads", "system_settings"]) {
      expect(snapshot).toContain(`CREATE TABLE \`${table}\``);
    }
  });

  test("holds no accounts, private settings or unreadable values", () => {
    expect(snapshot).not.toMatch(/INSERT INTO `(admin|admin_credentials|admin_user_roles|token_blacklist|user_activity_logs)` /);
    expect(snapshot).not.toContain("auth.dev_accounts");
    expect(snapshot).not.toContain("[object Object]");
  });
});
