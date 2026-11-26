# @msql-antd/framework-server

The Express and MySQL side of the msql-antd framework. It includes:
- sign-in, ACL and ABAC permissions;
- generic CRUD routes and the metadata engine;
- uploads, logs, backups, realtime events, and the framework's migrations.

It pairs with [@msql-antd/framework-ui](../framework-ui).

## Install

The packages are private on GitHub Packages. Create a GitHub token (classic) with `read:packages`, set it as `GITHUB_TOKEN`, and add this to the `.npmrc` in your home folder or project:

```
@msql-antd:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

To start a new project with everything set up, run `npm init @msql-antd my-project`. To add the package to an existing server:

```bash
npm install @msql-antd/framework-server dotenv
```

## Use

```js
// server/index.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createServer } = require("@msql-antd/framework-server");

const resources = (name) => path.join(__dirname, "resources", name);

createServer({
  routes: [require("./route/InvoiceRoute")],     // your route classes
  origins: [process.env.CLIENT_URL],             // the UI's address (CORS)
  paths: {
    logs: resources("logs"),
    backups: resources("backups"),
    uploads: resources("uploads"),
    migrations: path.join(__dirname, "migrations"),
  },
}).start();
```

A route is a class whose constructor registers endpoints. It runs after sign-in and the permission check:

```js
const { Model, AppError } = require("@msql-antd/framework-server");

module.exports = class InvoiceRoute {
  constructor(app) {
    app.get("/api/v1/invoices/:id", async (req, res) => {
      const invoice = await new Model().select("*", "invoices").where("id", "=", req.params.id).first();
      if (!invoice) throw new AppError("ERR_RECORD_NOT_FOUND");
      res.json({ data: invoice });
    });
  }
};
```

## Commands

| Command | Does |
| --- | --- |
| `msql-antd-db-setup` | Prepares an empty database: the framework's tables and rows, and the first administrator from `SETUP_ADMIN_EMAIL` |
| `msql-antd-migrate` | Applies pending framework migrations, then the project's (`MIGRATIONS_PATH`) |

Both read the `.env` in the folder they run from. Put them in your `package.json` scripts as `db:setup` and `migrate`.

## What it exports

`createServer`, `Model` (query builder and transactions), `db`, `AppError` and `ERROR_CODES`, `validateRequest` (zod), `validateTable`, `BaseService`, `authorization`, `abac`, `authorizationEvents`, `logger`, `CacheManager`, `SettingsManager`, `realtime`, `uploads`, `metadata`, `schemaCache`, `migrations` and `utils`.

Every export, method and error code is documented in the framework UI's in-app documentation at `/docs`, under **Reference › Server API** and **Server utilities**.

## Required environment

`DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` and `DATABASE_PASSWORD`; `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`; `ENCRYPTION_KEY` (32 bytes); `CLIENT_URL`; `EMAIL_USER` and `EMAIL_PASS`. The optional settings are listed in the in-app docs under **Operate › Operations and deployment**.

## Develop

This package lives in the [msql_antd_architecture](https://github.com/msql-antd/msql_antd_architecture) workspace. From the repository root, `npm run dev` runs the example API and UI, and `npm test` runs the tests.
