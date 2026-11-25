---
id: server-package
title: Use the server package
track: build
group: Start a project
order: 0.5
eyebrow: @msql-antd/framework-server
audience: Developers starting or upgrading a project
readTime: 6 min
summary: The whole API ships as one package. A project's server is an index.js that calls createServer, its .env, its own routes and policies, and its own migrations.
---

## What the package contains

Authentication, ACL and ABAC, the generic CRUD routes, the metadata engine and builder, uploads, logs, backups, realtime and the framework's migrations are the package @msql-antd/framework-server in packages/framework-server. The repository's server/ folder is now the example project: an index.js, its .env, and the folders where logs and backups are written.

| Part | Where | Who changes it |
| --- | --- | --- |
| Framework source | packages/framework-server | Framework releases only |
| Package entry | packages/framework-server/index.js | Lists everything a project can import |
| Framework migrations | packages/framework-server/resources/migrations | Framework releases only |
| A project | its own server/index.js, routes, policies, migrations and .env | The project team |

## Start a project

```js server/index.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createServer } = require("@msql-antd/framework-server");
const InvoiceRoute = require("./route/InvoiceRoute");

const resources = (name) => path.join(__dirname, "resources", name);

createServer({
  routes: [InvoiceRoute],
  paths: {
    logs: resources("logs"),
    backups: resources("backups"),
    uploads: resources("uploads"),
    migrations: path.join(__dirname, "migrations"),
  },
}).start();
```

```json server/package.json (scripts)
{
  "start": "node index.js",
  "dev": "nodemon index.js",
  "migrate": "msql-antd-migrate",
  "db:setup": "msql-antd-db-setup"
}
```

The package installs two commands. msql-antd-migrate applies the framework's pending migrations, then the project's (MIGRATIONS_PATH). msql-antd-db-setup prepares an empty database (see Operations › Fresh install). Both read the .env in the folder they run from.

## Folders the server writes

Logs, backups and temporary uploads belong to the project, never to the package (a package lives in node_modules and is replaced on every upgrade). Pass them in paths, or set LOG_PATH, BACKUP_PATH and UPLOAD_PATH. Without either, they go to resources/logs, resources/backups and resources/uploads in the folder the server runs from.

## What a project can import

```js route/InvoiceRoute.js
const { Model, AppError, utils, logger } = require("@msql-antd/framework-server");
```

| Export | What it is |
| --- | --- |
| createServer | The app factory: routes, publicRoutes, beforeAuth, afterAuth, policies, paths, port (see Server) |
| Model, db, BaseService | The query builder model, the MySQL pool, the generic CRUD service |
| metadata, schemaCache | The metadata engine (field rules, lookups) and the cached table schema |
| AppError, ERROR_CODES, validateRequest, validateTable, uploads | Errors, request validation, table column checks, Multer upload handlers |
| authorization, abac, authorizationEvents | Permission checks and caches, the ABAC engine, live access-change events |
| logger, utils, CacheManager, SettingsManager, realtime, migrations | Logging, the shared utilities, caching, system settings, Socket.IO, the migration runner |

Everything except createServer loads on first use, so the folders given to createServer are in place before the logger or the backup service start. Import nothing from packages/framework-server/core directly: those paths are not part of the package and change between releases.

## Working on the framework itself

From the repository root, npm run dev starts the example API and UI together. The API restarts when a file in server/ or packages/framework-server/ changes. npm test runs both packages' tests; npm run migrate and npm run db:setup run the example server's commands.
