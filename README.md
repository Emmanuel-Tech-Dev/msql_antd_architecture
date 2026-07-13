# MySql ORM Framework

MySql ORM Framework is a metadata-driven administrative platform built with React, Ant Design, Tailwind CSS, Express, and MySQL. It combines a reusable UI runtime with a custom backend so teams can manage routine application behavior from the product while keeping security-sensitive decisions behind reviewed server code.

The complete public product documentation is available at `/docs` when the UI is running. It covers the architecture, server, UI, authentication, authorization, metadata-driven forms, tables, operations, extension playbooks, API families, repository structure, and troubleshooting.

## Architecture at a glance

```text
Browser pages and components
        ↓
React framework runtime
(providers, hooks, stores, route registry, theme)
        ↓
Express trust pipeline
(authentication, authorization, validation, services)
        ↓
Model + QueryBuilder
        ↓
MySQL
```

The database is authoritative for records, ACL mappings, table metadata, browser resources, and UI settings. The server is authoritative for identity, authorization, validation, safe table/column exposure, lookups, backups, and errors. The UI is authoritative for presentation and interaction only.

## Repository

```text
.
├── server/       Express API, MySQL query layer, security, migrations, operations
├── ui/           React application, providers, hooks, pages, components, design system
└── README.md     Repository entry point
```

Important server locations:

- `server/index.js` — middleware order, routes, startup, and graceful shutdown.
- `server/core/middleware` — authentication, authorization, request validation, table validation, logging, and errors.
- `server/core/lib` — auth, generic data services, settings, uploads, backup, and authorization policy.
- `server/core/model` — schema discovery, parameterized query execution, search, filters, sorting, and pagination.
- `server/route` — authentication, generic CRUD, ACL, logs, backup, and UI-settings endpoints.
- `server/resources/migrations` — ordered database changes.
- `server/tests` — authorization and lookup-registry regression tests.

Important UI locations:

- `ui/src/main.jsx` — application provider composition.
- `ui/src/App.jsx` — public and protected browser routes.
- `ui/src/core/provider` — framework, data, auth, access, bootstrap, and resource contracts.
- `ui/src/core/hooks` — provider-aligned data, auth, and access hooks.
- `ui/src/hooks` — record forms, tables, layout, persistence, uploads, and UI utilities.
- `ui/src/components` — layout, page headers, access-management, tables, and shared UI.
- `ui/src/pages` — authentication, administration, settings, analytics, and public documentation.
- `ui/src/utils/ThemeProvider.jsx` — public/workspace appearance scopes and shared design tokens.

## Requirements

- Node.js 20 or newer.
- MySQL 8 or a compatible MySQL service.
- npm.
- `mysqldump` for database backup operations.
- An SMTP/mail account for email OTP and password recovery.

## Configure the server

Create `server/.env`. Values below are names only; generate secure values for every secret.

```env
NODE_ENV=development
PORT=3000

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=application_user
DATABASE_PASSWORD=replace_me
DATABASE_NAME=application_database

ACCESS_TOKEN_SECRET=replace_with_a_long_random_value
REFRESH_TOKEN_SECRET=replace_with_a_different_long_random_value
ENCRYPTION_KEY=replace_with_valid_key_material

CLIENT_URL=http://localhost:5173
EMAIL_USER=mail_account
EMAIL_PASS=mail_application_password
```

Optional configuration includes `OTP_CHALLENGE_SECRET`, `OTP_CHALLENGE_TTL`, `GOOGLE_CLIENT_ID`, Cloudinary credentials, log controls, backup controls, and `MYSQLDUMP_PATH`. See `/docs#operations` for the complete operational reference.

Never commit `.env`, database exports, tokens, credentials, private logs, or production backups.

## Configure the UI

Create `ui/.env`:

```env
VITE_API_URL=http://localhost:3000
```

## Install and run

Server:

```bash
cd server
npm install
npm run migrate
npm run dev
```

UI:

```bash
cd ui
npm install
npm run dev
```

Open:

- Application: `http://localhost:5173/login`
- Public documentation: `http://localhost:5173/docs`
- API: `http://localhost:3000`

## Database changes

All shared schema changes must be migrations. Do not rely on a developer’s local database state.

```bash
cd server
npm run migrate
```

Migration files are ordered in `server/resources/migrations`. Back up the target database before applying production migrations, and record which release applied each migration.

## Verification

```bash
cd server
npm test

cd ../ui
npm run lint
npm run build
```

Before release, smoke-test password login, OTP login if enabled, token refresh, first-route resolution, a restricted role, a metadata-driven form lookup, create/edit invalidation, appearance settings, log querying, and backup creation.

## Core operating concepts

### Authentication and authorization

Authentication establishes identity. Authorization separately maps roles to permissions and permissions to API/browser resources. SuperAdmin and `dev` are privileged system roles. All other roles need explicit permission/resource mappings. UI visibility is never a substitute for server authorization.

### Bootstrap

After authentication, the UI requests startup-critical datasets such as `tables_metadata`, `admin_resources`, `admin_permissions`, and active `ui_settings`. The server resolves physical tables and columns, removes sensitive fields, applies bounded filters/limits, and requires `read:<table>` for non-core bootstrap datasets unless the caller is privileged.

### Metadata-driven forms

`tables_metadata` describes field labels, types, rank, validation, visibility, write policy, and options. `useRecordForm` interprets it for both create and edit flows. Lookup metadata is converted into a structured request and checked against `server/core/config/lookupRegistry.js`; metadata alone cannot authorize database access.

### Tables and server state

The MySQL data provider normalizes CRUD responses for TanStack React Query. Table hooks translate pagination, search, filters, and sorting into validated query parameters. Mutations must invalidate every affected resource so visible lists refetch the server’s final state.

### Appearance

The active `ui_settings` document controls workspace layout, density, colors, brand, content, and header behavior. ThemeProvider validates and maps it into Ant Design tokens and CSS variables. Public pages use an independent public appearance scope.

## Safe extension rules

1. Add schema through a migration.
2. Add form-managed fields to `tables_metadata`.
3. Register API and browser resources in the ACL tables.
4. Map permissions to roles and resources.
5. Use provider contracts and core hooks from pages.
6. Register only necessary lookup columns in code.
7. Keep sensitive tables outside generic CRUD and bootstrap.
8. Add positive and negative tests for security-boundary changes.
9. Update `/docs` and this README when architecture or operations change.

## Production baseline

- Serve both UI and API over HTTPS.
- Use secure, independent, rotated secrets.
- Restrict CORS to environment-managed origins.
- Run Node under a supervised process manager.
- Use a least-privilege MySQL account.
- Keep logs and backups outside public web roots.
- Forward structured logs or metrics to monitored storage.
- Perform scheduled backups and regular restore drills.
- Remove sample credentials, development shortcuts, and private data from browser bundles.
- Review SuperAdmin and `dev` membership regularly.

## Troubleshooting

Start with the browser Network entry and capture the HTTP status, `errorCode`, and `requestId`. Find the same request ID in server logs, then identify whether the failure belongs to authentication, endpoint authorization, table validation, service behavior, or database execution. The public guide at `/docs#troubleshooting` contains symptom-specific paths.

When escalating, include environment, role, time, route, safe reproduction steps, expected behavior, actual behavior, status, error code, and request ID. Never share passwords or live tokens.
