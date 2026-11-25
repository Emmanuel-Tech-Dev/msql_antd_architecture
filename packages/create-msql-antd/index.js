#!/usr/bin/env node
// Creates a new project on the msql-antd framework:
//
//   npx create-msql-antd my-project
//   node create-msql-antd/index.js my-project --framework ../msql_antd_architecture/packages
//
// --framework <folder> links the two packages from a local checkout instead of
// installing a released version (for trying unreleased framework changes).
const fs = require("fs");
const path = require("path");

const TEMPLATE = path.join(__dirname, "template");
const VERSION = `^${require("./package.json").version}`;
// npm leaves .gitignore out of published packages, so the template stores it as _gitignore.
const RENAMED = { _gitignore: ".gitignore" };

function parseArgs(argv) {
  const args = { target: null, framework: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--framework") args.framework = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") args.help = true;
    else if (!args.target) args.target = argv[i];
  }
  return args;
}

function frameworkSpecs(framework) {
  if (!framework) return { serverSpec: VERSION, uiSpec: VERSION };
  const folder = path.resolve(framework);
  for (const name of ["framework-server", "framework-ui"]) {
    if (!fs.existsSync(path.join(folder, name, "package.json"))) {
      throw new Error(`--framework: ${path.join(folder, name)} is not a framework package folder`);
    }
  }
  const link = (name) => `file:${path.join(folder, name).replace(/\\/g, "/")}`;
  return { serverSpec: link("framework-server"), uiSpec: link("framework-ui") };
}

function copyTemplate(from, to, values) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const destination = path.join(to, RENAMED[entry.name] || entry.name);
    if (entry.isDirectory()) {
      copyTemplate(source, destination, values);
      continue;
    }
    const text = fs.readFileSync(source, "utf8").replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match);
    fs.writeFileSync(destination, text);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.target) {
    console.log("Usage: create-msql-antd <project-folder> [--framework <local packages folder>]");
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const target = path.resolve(args.target);
  if (fs.existsSync(target) && fs.readdirSync(target).length) {
    console.error(`${target} is not empty. Choose a new folder.`);
    process.exitCode = 1;
    return;
  }

  const name = path.basename(target).toLowerCase().replace(/[^a-z0-9-_.]+/g, "-");
  const title = path.basename(target).replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const values = { name, title, dbName: name.replace(/[^a-z0-9_]/g, "_"), ...frameworkSpecs(args.framework) };

  copyTemplate(TEMPLATE, target, values);
  fs.copyFileSync(path.join(target, "server", ".env.example"), path.join(target, "server", ".env"));
  fs.copyFileSync(path.join(target, "ui", ".env.example"), path.join(target, "ui", ".env"));

  const relative = path.relative(process.cwd(), target) || ".";
  console.log(`Created ${title} in ${target}

Next:
  cd ${relative}
  npm install
  Fill in server/.env (database, secrets, SETUP_ADMIN_EMAIL), then:
  npm run db:setup      first time, on an empty database
  npm run dev           API on :3000, UI on :5173
`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
