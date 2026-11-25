---
id: create-project
title: Create a project
track: build
group: Start a project
order: -1
eyebrow: npm init @msql-antd
audience: Developers starting a new system
readTime: 4 min
summary: One command writes a new project on the two framework packages: a server, a UI, their .env files and a migrations folder. You add your tables, pages and routes; the framework stays in the packages.
---

## One-time setup: access to the packages

The packages are published privately to GitHub Packages under @msql-antd. npm needs a GitHub token to read them, even to run the starter:

1. **Create a token** — GitHub › Settings › Developer settings › Personal access tokens (classic), with the read:packages scope. You need access to the msql-antd organization.
2. **Put it in your environment** — set GITHUB_TOKEN to it (Windows: setx GITHUB_TOKEN <token>, then open a new terminal). Never commit it.
3. **Point the scope at GitHub** — add these two lines to the .npmrc in your home folder:

```text ~/.npmrc
@msql-antd:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

## Create it

```shell New project
npm init @msql-antd acme-invoices
cd acme-invoices
npm install
```

The project gets its own .npmrc with the same two lines, so a teammate or a build server only needs GITHUB_TOKEN set.

To try framework changes that are not released yet, link a local checkout instead of a released version:

```shell From a local checkout
node ../msql_antd_architecture/packages/create/index.js acme-invoices --framework ../msql_antd_architecture/packages
```

## What you get

| Path | What it is |
| --- | --- |
| package.json | An npm workspace (server, ui) with dev, build, migrate and db:setup |
| .npmrc | Reads @msql-antd packages from GitHub Packages with GITHUB_TOKEN |
| server/index.js | createServer({ routes, origins, paths }): CLIENT_URL is the allowed origin; logs, backups and uploads stay in server/resources |
| server/route | Your route classes (a README shows one) |
| server/migrations | Your tables and rows as numbered SQL files, applied after the framework's |
| server/.env | Copied from .env.example: database, secrets, email, first administrator |
| ui/src/main.jsx | <FrameworkApp config resources routes> with one Home page |
| ui/.env | VITE_API_URL and the optional Google and map keys |
| scripts/dev.js | npm run dev: the API and the UI together, Ctrl+C stops both |

## First run

1. **Fill in server/.env** — DATABASE_*, the four secrets and ENCRYPTION_KEY, and SETUP_ADMIN_EMAIL.
2. **Prepare the database** — npm run db:setup on an empty database loads the framework's tables and rows and prints the first administrator's temporary password once.
3. **Start** — npm run dev, then sign in at http://localhost:5173/login and change the password.
4. **Build your system** — add tables with the data-model builder (it writes migrations into server/migrations), pages in ui/src/pages listed in routes, and routes in server/route listed in createServer.

## Upgrading the framework

Releases are listed on the repository's Packages page on GitHub.

Change the two package versions, npm install, then npm run migrate: it applies the new framework migrations, then any of yours. Read the release notes first; a new minor or major version can change an option.
