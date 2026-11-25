const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const create = (...args) => spawnSync(process.execPath, [path.join(__dirname, "index.js"), ...args], { encoding: "utf8" });

test("creates a project with the names, package versions and files filled in", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "create-msql-antd-"));
  const target = path.join(root, "acme-invoices");
  const result = create(target);
  assert.equal(result.status, 0, result.stderr);

  const read = (file) => fs.readFileSync(path.join(target, file), "utf8");
  assert.equal(JSON.parse(read("package.json")).name, "acme-invoices");
  assert.equal(JSON.parse(read("server/package.json")).dependencies["@msql-antd/framework-server"], "^0.1.0");
  assert.equal(JSON.parse(read("ui/package.json")).dependencies["@msql-antd/framework-ui"], "^0.1.0");
  assert.match(read("server/.env"), /DATABASE_NAME=acme_invoices/);
  assert.match(read("ui/index.html"), /<title>Acme Invoices<\/title>/);
  assert.ok(fs.existsSync(path.join(target, ".gitignore")));
  assert.ok(!fs.existsSync(path.join(target, "_gitignore")));
  assert.match(read(".npmrc"), /@msql-antd:registry=https:\/\/npm.pkg.github.com/);
  assert.match(read(".npmrc"), /_authToken=\$\{GITHUB_TOKEN\}/);
  const files = fs.readdirSync(target, { recursive: true }).filter((file) => fs.statSync(path.join(target, file)).isFile());
  assert.deepEqual(files.filter((file) => read(file).includes("{{")), []);
  assert.equal(fs.existsSync(path.join(target, "_npmrc")), false);
});

test("links a local checkout with --framework, and refuses a folder that is not empty", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "create-msql-antd-"));
  const packages = path.resolve(__dirname, "..");
  assert.equal(create(path.join(root, "linked"), "--framework", packages).status, 0);
  const spec = JSON.parse(fs.readFileSync(path.join(root, "linked", "server", "package.json"), "utf8")).dependencies["@msql-antd/framework-server"];
  const expected = "file:" + path.join(packages, "framework-server").split(path.sep).join("/");
  assert.equal(spec, expected);

  const refused = create(path.join(root, "linked"));
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /is not empty/);
  assert.equal(create(path.join(root, "x"), "--framework", root).status, 1);
});
