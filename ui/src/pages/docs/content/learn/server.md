---
id: server
title: Server architecture
track: learn
group: Deep dives
order: 3
eyebrow: Express + MySQL
audience: Developers
readTime: 22 min
summary: Startup, middleware order, routes, services, the query layer, validation, settings, uploads, backup, and observability.
---

The server is a CommonJS Express application. index.js composes infrastructure and route modules; route classes translate HTTP into service calls; service classes hold business and security orchestration; Model and QueryBuilder own database execution.

## Startup sequence

:::flow
- Load environment variables
- Create Express and HTTP server
- Initialize request logging, cookies, JSON parsing, rate limiting, CORS, and Helmet
- Register public authentication routes
- Install authentication and authorization middleware
- Register logs, backup, UI settings, statistics, user directory, metadata, metadata builder, access-control, and generic data routes
- Install the not-found and central error handlers
- Initialize logging and preload system settings
- Listen on PORT and handle graceful shutdown signals
:::

## Server directories

| Path | Responsibility |
| --- | --- |
| core/config | MySQL pool, Cloudinary, Multer, allowed origins, the one list of sensitive tables and columns (sensitiveData.js), and the legacy lookup allowlist |
| core/lib | Authentication, authorization policy, ABAC engine and events, generic services, the metadata engine and builder, query building, settings, uploads, and backups |
| core/middleware | Token verification, permission enforcement, table validation, request validation, request logs, and error conversion |
| core/model | Database execution, schema discovery, filtering, sorting, search, and pagination |
| route | HTTP endpoint families for auth, generic CRUD, ACL administration, user directory, metadata, the metadata builder, logs, backup, and UI settings |
| schema | Input schemas used by request validation |
| shared/helpers | Errors, cache, logs, OTP, settings, and token blacklist services |
| resources/migrations | Ordered, repeatable database evolution |
| scripts | Migration execution and ACL seed generation |
| tests | Authorization, ABAC, generic CRUD, metadata schema and scaffold, bootstrap, backup and lookup regression coverage (Jest) |

## Core service responsibilities

| Module | What it does | Safety property |
| --- | --- | --- |
| BaseService | Generic list, one, create, bulk create, update, delete, bootstrap, and lookup operations | Uses validated resources and per-user readable/writable columns; every write passes validateRecordAgainstMetadata |
| metadataSchema | Builds a zod schema from a table's metadata and checks generic writes | Server-side required, rules, options, show-when, lookups, read-only, hidden and permission-guarded fields |
| metadataService | Serves table metadata, lookup options and field uploads | Lookups by key only; per-user field filtering; upload type and size from metadata |
| metadataAdminService | The Data model builder: describe, save versions, restore, export, lookups, new-table migrations, CSV import | manage:metadata only; never changes the schema; hidden system tables; audit log on save |
| Model | Schema discovery, query-parameter interpretation, pagination, execution | Removes sensitive filter fields and parameterizes values |
| QueryBuilder | Composes SELECT, INSERT, UPDATE, DELETE, joins, conditions, grouping, and ordering | Centralizes SQL construction and bound parameters |
| AuthService | Login, token lifecycle, profile, OTP, password recovery, Google auth, user creation | Credential separation, hashing, versioned/revocable sessions |
| SettingsManager | Loads and caches system settings | Separates runtime settings from direct ad-hoc queries |
| DatabaseBackupService | Validates destinations and runs mysqldump | Controlled executable, timeout, path policy, checksum |
| UploadService | Local or Cloudinary file processing | MIME/size middleware and managed destinations |

## Generic table endpoint behavior

- GET /api/:resources/table accepts page, limit, search, sort_by, sort_order, and validated suffix filters such as _min, _max, _in, _not_in, and _like.
- x-table-config can provide UI-level searchable/filterable/sortable hints, but it cannot redirect the physical route resource.
- Bulk create is capped at 500 records. Pagination and bootstrap limits are bounded server-side.
- Primary keys are discovered from MySQL; update payloads cannot overwrite them.
- Responses pass through sensitive-data redaction before leaving the server.

:::danger Do not bypass validateTable
Any new generic BaseService route that receives a table or resource must use resolveTableDefinition or validateTable. A client-provided identifier must never be interpolated into SQL solely because it matches an identifier regular expression.
:::

## Operational subsystems

| Subsystem | Entry point | Notes |
| --- | --- | --- |
| Structured logs | shared/helpers/logger.js | Winston transports, rotation, levels, redaction, request IDs, audit-aware events |
| Log viewer API | route/LogRoute.js | Bounded dates, limits, bytes per file, and available-file discovery |
| Backups | route/BackupRoute.js | Creates an SQL dump and returns checksum/path metadata |
| UI settings | route/UiSettingsRoute.js | Validates the complete appearance document and versions updates |
| Metadata builder | route/MetadataAdminRoute.js | Describe tables, version definitions, lookups, migrations for new tables, CSV record import |
| Authorization events | core/lib/authorizationEvents.js | Broadcasts access changes so active clients can refresh |
| Token revocation | shared/helpers/tokenBlacklist.js | Supports logout and invalidated token lifecycle |

```shell Run server checks
cd server
npm test
npm run migrate
npm run dev
```
