---
id: server-api
title: Server API
track: reference
group: Package reference
order: 0.5
eyebrow: Exports of @msql-antd/framework-server
audience: Backend developers
readTime: 20 min
summary: Everything a project's server code can import: the query builder, transactions, errors and codes, request validation, access policies, logging, caching, settings, realtime events, uploads and the migration runner.
---

## Import

```js A project route
const { Model, AppError, validateRequest, logger } = require("@msql-antd/framework-server");
```

| Export | What it is |
| --- | --- |
| createServer | The app factory (routes, publicRoutes, beforeAuth, afterAuth, policies, origins, paths, port); see Server architecture |
| Model | The query builder with a database connection: build, run, paginate, count, transactions |
| db | The mysql2 promise pool, for the rare statement Model cannot express |
| AppError, ERROR_CODES | Errors with an HTTP status that the error handler turns into a JSON response |
| validateRequest | Middleware that checks body, query and params with zod |
| validateTable | Middleware for /api/:resources routes: resolves the table and the fields the user may touch |
| BaseService | The generic CRUD service behind /api/:resources |
| authorization, abac, authorizationEvents | Permission middleware and caches, the ABAC engine, live access-change events |
| logger | Structured logging with rotation and redaction |
| CacheManager, SettingsManager | An in-memory cache; the system_settings reader and writer |
| realtime | Socket.IO: emit to users, emit to all, disconnect users |
| uploads | Multer upload handlers |
| metadata, schemaCache | Metadata rules and lookups; the cached table schema |
| migrations | The migration runner the migrate command uses |
| utils | The shared helpers; see Server utilities |

Everything except createServer loads the first time you read it, so the folders passed to createServer are already in place when the logger starts.

## Model: build and run a query

new Model() starts an empty query. Chain methods, then run it with execute(), first(), count(), exists() or paginate(). Values always travel as ? parameters; names are quoted and checked, so a value from a request never becomes SQL.

```js Read
const open = await new Model()
  .select(["id", "number", "total"], "invoices")
  .where("status", "=", "open")
  .whereNull("deleted_at")
  .orderBy("created_at", "DESC")
  .limit(20)
  .execute();                       // array of rows

const invoice = await new Model().select("*", "invoices").where("id", "=", req.params.id).first();   // row or null
const overdue = await new Model().select("id", "invoices").whereColumns("amount_paid", "<", "total").count();   // number
```

```js Write
const created = await new Model().insert("invoices", { number: "INV-1001", customer_id: 7, total: 450 }).execute();
// created.insertId, created.affectedRows

const changed = await new Model().update("invoices", { status: "paid" }).where("id", "=", id).execute();
if (changed.affectedRows === 0) throw new AppError("ERR_RECORD_NOT_FOUND");

await new Model().delete("invoice_lines").where("invoice_id", "=", id).execute();
await new Model().bulkInsert("invoice_lines", lines).execute();
await new Model().insert("counters", { name: "invoice", value: 1 }).onDuplicateKeyUpdate({ value: 2 }).execute();
```

:::danger Always give update and delete a where
update() and delete() without where() change every row of the table.
:::

## Model methods

| Method | What it adds or does |
| --- | --- |
| select(columns = "*", table) | SELECT columns FROM table. columns is a name, "*", an array, or an expression such as "COUNT(*) AS total" |
| from(table) | FROM table, after select(columns) without a table |
| multiSelect([{ table, columns }]) | SELECT from several tables, each column prefixed with its table; the first table is the FROM |
| where(column, operator, value) | AND condition. Operators: =, !=, <>, >, >=, <, <=, LIKE, NOT LIKE, IN, NOT IN |
| where([{ column, value, operator }], operator, "OR") | A bracketed group, e.g. one search across several columns: (name LIKE ? OR email LIKE ?) |
| orWhere(…) | The same, joined with OR |
| whereIn / whereNotIn(column, values) | IN (?, ?, …). values must be a non-empty array, or it throws |
| whereBetween(column, min, max) / whereLike(column, pattern) | BETWEEN ? AND ? / LIKE ? (pattern includes the %) |
| whereNull / whereNotNull(column) | IS NULL / IS NOT NULL |
| whereColumns(left, operator, right) | Compares two columns |
| join(type, table, left, [operator], right) | INNER, LEFT, RIGHT, FULL, CROSS join: join("LEFT", "customers", "customers.id", "invoices.customer_id") |
| orderBy(column, direction = "ASC") | Call again for a second sort column |
| groupBy(columns) / having(column, operator, value) | GROUP BY / HAVING (again: AND) |
| aggregate(func, column, alias) | Starts SELECT COUNT/SUM/AVG/MIN/MAX(column); add from(table) |
| addAggregate(func, column, alias) / selectRaw(sql) | Adds an aggregate / a raw expression to the select list of an existing select |
| limit(count) / offset(count) | LIMIT / OFFSET (whole numbers only) |
| limitRange(offset, count) | MySQL's LIMIT offset, count: limitRange(40, 20) skips 40 rows and takes 20. With one argument, the same as limit |
| forUpdate() | Locks the selected rows; use inside a transaction |
| insert(table, data) / bulkInsert(table, rows) | One row / many rows (missing fields become NULL) |
| onDuplicateKeyUpdate(data) | After insert: update these fields when the key exists |
| update(table, data) / delete(table) | UPDATE … SET / DELETE FROM; add where() |
| fullTextSearch(table, columns, term, mode) | SELECT * … WHERE MATCH(columns) AGAINST(?) in NATURAL LANGUAGE, BOOLEAN or QUERY EXPANSION mode; needs a FULLTEXT index |
| fullTextSearchWithScore(table, columns, term, mode) | The same with a relevance_score column |

| Run with | Returns |
| --- | --- |
| execute() | Rows for a SELECT; { insertId, affectedRows } for a write. The builder is reset afterwards |
| first() | The first row or null |
| count(column = "*") | A number. Joins and GROUP BY are respected (each group counts once) |
| exists() | true when count() > 0 |
| paginate(page, limit) | { result, pagination: { total, page, limit, totalPages, hasNext, hasPrev } }; secret fields such as password are redacted |
| raw(sql, params) | Runs your own SQL with ? parameters; returns rows |
| getSQL() / getSql() | { query, params } / the SQL text alone, without running it, for debugging |

Also: tableExists(name), getTableColumns(table), getTablePrimaryKey(table), getUniqueColumns(table), reset(). tableQueryParams and applyQueryParams turn a list request's query string (search, sort_by, sort_order, page, limit, and filters such as total_min, status_in, name_like) into conditions; the generic list routes use them.

## Transactions

Use a transaction when several changes must all succeed or all fail. Model.transaction runs your function with a helper bound to one connection; if the function throws, everything is rolled back and the error is re-thrown.

```js Pay an invoice
await new Model().transaction(async (tx) => {
  const [invoice] = await tx.builder().select(["id", "total", "amount_paid"], "invoices")
    .where("id", "=", id).forUpdate().executeInTransaction();
  if (!invoice) throw new AppError("ERR_RECORD_NOT_FOUND");

  await tx.builder().insert("payments", { invoice_id: id, amount }).executeInTransaction();
  await tx.builder().update("invoices", { amount_paid: invoice.amount_paid + amount })
    .where("id", "=", id).executeInTransaction();
});
```

| Helper | What it is |
| --- | --- |
| tx.builder() | A query builder; run it with executeInTransaction(), never execute() (execute() uses another connection, outside the transaction) |
| tx.query(sql, params) | Raw SQL on the transaction's connection |
| tx.connection | The connection itself, for helpers that take one |

## Errors: AppError and ERROR_CODES

Throw new AppError(code, message, details) anywhere in a route or service. The error handler answers with the code's status and { status, errorCode, message, details }. message is optional (each code has a default); details reaches the client, so never put secrets in it.

```js Refuse a request
if (invoice.status === "paid") {
  throw new AppError("ERR_BUSINESS_LOGIC_ERROR", "A paid invoice cannot be edited", { invoiceId: invoice.id });
}
```

| Status | Codes |
| --- | --- |
| 400 | ERR_BAD_REQUEST, ERR_VALIDATION_FAILED, ERR_INVALID_INPUT, ERR_MISSING_REQUIRED_FIELD, ERR_INVALID_FORMAT, ERR_INVALID_FILE_TYPE |
| 401 | ERR_UNAUTHORIZED, ERR_INVALID_CREDENTIALS, ERR_TOKEN_EXPIRED, ERR_TOKEN_REVOKED, ERR_TOKEN_INVALID, ERR_AUTH_USER_INVALID, ERR_AUTHENTICATION_REQUIRED |
| 402 | ERR_PAYMENT_FAILED, ERR_INSUFFICIENT_FUNDS |
| 403 | ERR_FORBIDDEN, ERR_ACCESS_DENIED, ERR_INSUFFICIENT_PERMISSIONS, ERR_ACCOUNT_SUSPENDED, ERR_PASSWORD_CHANGE_REQUIRED, ERR_NO_RESOURCES |
| 404 | ERR_NOT_FOUND, ERR_USER_NOT_FOUND, ERR_RECORD_NOT_FOUND, ERR_ENDPOINT_NOT_FOUND |
| 409 | ERR_CONFLICT, ERR_DUPLICATE_ENTRY, ERR_RESOURCE_ALREADY_EXISTS, ERR_EMAIL_ALREADY_EXISTS |
| 413 | ERR_FILE_TOO_LARGE |
| 422 | ERR_UNPROCESSABLE_ENTITY, ERR_BUSINESS_LOGIC_ERROR |
| 429 | ERR_RATE_LIMIT_EXCEEDED, ERR_TOO_MANY_REQUESTS |
| 500 | ERR_INTERNAL_SERVER, ERR_UNEXPECTED_ERROR, ERR_DATABASE_ERROR, ERR_QUERY_FAILED, ERR_TRANSACTION_FAILED, ERR_FILE_UPLOAD_FAILED |
| 501 | ERR_NOT_IMPLEMENTED, ERR_FEATURE_NOT_AVAILABLE |
| 502 | ERR_BAD_GATEWAY, ERR_EXTERNAL_SERVICE_ERROR, ERR_PAYMENT_GATEWAY_ERROR |
| 503 | ERR_SERVICE_UNAVAILABLE, ERR_DATABASE_UNAVAILABLE, ERR_MAINTENANCE_MODE, ERR_CONNECTION_FAILED |
| 504 | ERR_GATEWAY_TIMEOUT, ERR_REQUEST_TIMEOUT |

An unknown code throws "Invalid error code" instead; pick one from this list.

## Request validation: validateRequest

```js Check the body with zod
const { z } = require("zod");

app.post("/api/v1/invoices", validateRequest({
  body: z.object({ customer_id: z.number().int(), total: z.number().positive() }),
}), async (req, res) => { /* req.body is the parsed, typed body */ });
```

validateRequest({ body, query, params }) parses each part with its schema and replaces it with the parsed value. A failure answers 400 ERR_VALIDATION_FAILED with details.errors = [{ field, message }], which MetadataForm shows under the fields.

:::warning Use the same zod as the framework
Install zod 4 in your project. With a different major version, npm keeps two copies and the framework does not recognize your schema's errors, so they answer 500 instead of 400.
:::

## Access: authorization, abac and policies

Every route after sign-in already passes the permission check (RBAC from the ACL tables, then ABAC policies). A project adds policies through createServer({ policies }).

```js An ABAC policy: only your own branch's records
const branchPolicy = {
  id: "project.own-branch",                 // stable and unique
  priority: 100,                            // higher runs first
  appliesTo: (context) => context.resource.attributes.requestedPath.startsWith("/api/v1/invoices"),
  evaluate: async (context) => {
    const branch = await branchOf(context.subject.id);
    return branch ? "ABSTAIN" : { effect: "DENY", reason: "NO_BRANCH" };
  },
};
createServer({ policies: [branchPolicy] });
```

| evaluate may return | Means |
| --- | --- |
| "DENY", false, or { effect: "DENY", reason, details } | Refuse the request (403) |
| "ABSTAIN", "ALLOW", true, or nothing | No objection: policies can only add refusals, never grant what RBAC refused |

A policy that throws refuses the request (fail closed). The context has subject { id, roles, permissions, privileged, attributes: { accountStatus } }, action { name, method }, resource { type, id, attributes: { requestedPath, routePatterns } } and environment { occurredAt, requestId, ipAddress, userAgent }.

| Export | Use |
| --- | --- |
| authorization.clearPermissionCache(userId?) | After changing someone's roles or permissions in your own code; without userId, for everyone |
| authorization.authorization, createAuthorizationMiddleware, defaultAbacEngine, defaultPolicyRegistry, permissionCacheKey | The middleware createServer installs, and its parts |
| abac.POLICY_EFFECTS, DECISION_REASONS, AbacEngine, AbacPolicyRegistry | Effect names and the engine, for tests of your policies |
| authorizationEvents.publish(userIds, reason) | Tells those users' browsers that their access changed (they reload permissions and menus at once) |
| authorizationEvents.broadcast(event, reason) | Sends an event to every connected browser |

## Logging: logger

| Method | For |
| --- | --- |
| logger.app(message, meta) | Normal application events |
| logger.error(error, meta) | An Error object, with its stack, plus context |
| logger.security(message, meta) | Sign-in failures, refusals, suspicious input |
| logger.critical(message, meta) | Failures that need someone now |
| logger.performance(message, meta) | Timings and slow operations |
| logger.query(message, meta) / logger.access(message, meta) | Database and request logs |
| logger.startTimer(label) | Starts a timer; call the function it returns to log "<label> completed" with the duration: const done = logger.startTimer("import"); …; done({ rows }) |

Logs rotate daily in LOG_PATH (createServer paths.logs) and secret fields in meta are redacted. Logs are viewable under Settings › System logs.

## Cache and settings

```js CacheManager
const cache = new CacheManager({ ttl: 5 * 60 * 1000, maxItems: 500, cleanupInterval: 0 });
const rates = await cache.remember("fx:rates", () => loadRates(), { maxAge: 10 * 60 * 1000 });
cache.set("key", value, ttlMs); cache.get("key"); cache.has("key"); cache.delete("key"); cache.clear();
```

remember(key, load, { maxAge }) loads once, shares one load between concurrent callers, keeps the value for maxAge however often it is read, and does not keep a failed load. Plain entries expire after ttl (default 15 minutes) counted from the last read. cleanupInterval: 0 turns off the background cleanup timer (use it in scripts and tests).

```js SettingsManager
const settings = new SettingsManager();
const openRoutes = await settings.get("system.open_routes", []);   // typed value, cached; default when missing
await settings.set("invoices.prefix", "INV", req.user.sub);         // saved with who changed it
```

The server keeps one SettingsManager in app.locals.settings, preloaded at start; settings are also edited under Settings in the app.

## Realtime, uploads, metadata and migrations

| Export | Use |
| --- | --- |
| realtime.emitToUsers(userIds, event, payload) | Sends a Socket.IO event to those users' open tabs |
| realtime.emitToAll(event, payload) | To every connected user |
| realtime.disconnectUsers(userIds, reason) | Sends session:revoked and closes their sockets |
| uploads.uploadSingle / uploadMultiple | Multer, in memory, images and videos only, 10 MB per file: router.post(path, uploads.uploadSingle.single("file"), handler) |
| uploads.profileImageUpload | Images only, 5 MB |
| uploads.uploadLarge | Images and videos, 100 MB |
| uploads.metadataFieldUpload | What metadata file fields use (POST /api/v1/uploads/:table/:column) |
| metadata.getTableMetadata(table, { permissions, privileged }), getLookupOptions(key, { parent, permissions, privileged }), canReadField, canWriteField | The metadata engine, for your own routes that follow a table's field rules |
| schemaCache.tableSchema(table), clearTableCache(table) | A table's columns and primary key, cached for 5 minutes; clear after changing a table |
| migrations.runMigrations(connection, { only, log }), listMigrations(), projectMigrationsDir() | What npm run migrate runs; for your own deployment scripts |
| BaseService | new BaseService(req, res) works on the table in req.params.resources after validateTable: findOne, create, bulkCreate, updateRecord, deleteRecord, lookup. For your own tables, Model is simpler |
| validateTable | Middleware for routes with a :resources parameter: refuses unknown or hidden tables and sets req.validatedResource (table, primary key, readable and writable fields) |
| db | The mysql2 pool: await db.query(sql, params) returns [rows, fields] |
