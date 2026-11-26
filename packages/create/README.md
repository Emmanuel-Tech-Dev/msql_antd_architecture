# @msql-antd/create

Creates a new project on the msql-antd framework: a server on [@msql-antd/framework-server](../framework-server) and a UI on [@msql-antd/framework-ui](../framework-ui).

## Use

The packages are private on GitHub Packages, so set this up once. Create a GitHub token (classic) with `read:packages`, set it as `GITHUB_TOKEN`, and add this to the `.npmrc` in your home folder:

```
@msql-antd:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Then:

```bash
npm init @msql-antd acme-invoices
cd acme-invoices
npm install
# fill in server/.env: database, secrets, SETUP_ADMIN_EMAIL
npm run db:setup     # first time, on an empty database
npm run dev          # API on :3000, UI on :5173
```

## What you get

| Path | What it is |
| --- | --- |
| `package.json` | An npm workspace (`server`, `ui`) with `dev`, `build`, `migrate` and `db:setup` |
| `.npmrc` | Reads `@msql-antd` packages from GitHub Packages with `GITHUB_TOKEN` |
| `server/index.js` | `createServer({ routes, origins, paths })` |
| `server/route`, `server/migrations` | Your route classes and your SQL migrations |
| `ui/src/main.jsx` | `<FrameworkApp config resources routes>` with one Home page |
| `server/.env`, `ui/.env` | Copied from their `.env.example` files |

To try framework changes that aren't released yet, link a local checkout:

```bash
node path/to/msql_antd_architecture/packages/create/index.js acme-invoices --framework path/to/msql_antd_architecture/packages
```
