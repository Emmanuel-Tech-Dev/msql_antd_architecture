---
id: operations
title: Operations and deployment
track: operate
group: Run the system
order: 1
eyebrow: Production runbook
audience: Operators and DevOps
readTime: 24 min
summary: Environment configuration, migrations, deployment, logging, backup, monitoring, and incident handling.
---

## Required server environment

| Variable | Purpose | Production guidance |
| --- | --- | --- |
| NODE_ENV | Runtime behavior | Set to production |
| PORT | HTTP port | Default 3000; place behind a reverse proxy |
| DATABASE_HOST/PORT/USER/PASSWORD/NAME | MySQL pool and migrations | Use a least-privilege application account |
| ACCESS_TOKEN_SECRET | Signs access tokens | Long random secret; rotate deliberately |
| REFRESH_TOKEN_SECRET | Signs refresh tokens | Different from access-token secret |
| ENCRYPTION_KEY | Encryption and OTP-related utilities | Provide valid key material; never commit it |
| CLIENT_URL | Password-reset destination | Canonical HTTPS UI origin |
| EMAIL_USER / EMAIL_PASS | Email OTP and reset delivery | Use an application credential or mail provider |

## Optional environment

| Variable | Purpose |
| --- | --- |
| OTP_CHALLENGE_SECRET / OTP_CHALLENGE_TTL | Separate OTP signing key and lifetime |
| GOOGLE_CLIENT_ID | Google identity verification |
| CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET | Cloud-hosted uploads |
| LOG_LEVEL/PATH/RETENTION/MAX_SIZE/CONSOLE | Logging volume, destination, and rotation |
| LOG_QUERY_MAX_DAYS/LIMIT/BYTES_PER_FILE | Log-viewer safety bounds |
| BACKUP_PATH/TIMEOUT_MS | Default backup destination and execution timeout |
| MYSQLDUMP_PATH | Explicit mysqldump executable |
| SERVICE_NAME | OTP/service display name |
| RATE_LIMIT_PER_IP / RATE_LIMIT_PER_USER | Requests per 15 minutes per address (all traffic, including sign-in; default 3000) and per signed-in user (default 500). Refusals are 429 ERR_TOO_MANY_REQUESTS |
| TRUST_PROXY | Behind nginx or a load balancer: how many proxies to trust (e.g. 1), so limits and logs see the visitor's address instead of the proxy's |
| MIGRATIONS_PATH | The project's own migrations folder (its tables, its rows). Unset: the project has none |
| SETUP_ADMIN_EMAIL / SETUP_ADMIN_NAME | Fresh install only: the first administrator that npm run db:setup creates |

## Fresh install

1. **Create an empty database** — Create the database (utf8mb4) and a least-privilege account, then set DATABASE_* in server/.env.
2. **Name the first administrator** — Set SETUP_ADMIN_EMAIL (and optionally SETUP_ADMIN_NAME) in server/.env.
3. **Run npm run db:setup** — It loads resources/schema/framework_schema.sql (the framework tables and their rows: roles, permissions and resources for the framework's pages and APIs, the bootstrap registry, settings and the admin tables' metadata), records the migrations the snapshot already includes, runs any newer ones, and creates the administrator with the SuperAdmin role.
4. **Sign in once** — Use the temporary password it prints (shown only once) and choose a new password.
5. **Add your project** — Your own tables, migrations and roles go on top; describe tables in Settings › Data model.

:::warning Setup never touches an existing database
db:setup refuses to run if the database already has framework tables. Existing installs update with npm run migrate. After adding framework migrations, refresh the snapshot with npm run db:snapshot (it copies only framework rows: no users, logs, backups, private settings or project tables) and commit it with the migrations.
:::

## Migrations

| Source | Folder | Numbered | Recorded as |
| --- | --- | --- | --- |
| Framework | server/resources/migrations (ships with the framework) | 001, 002, … | framework |
| Project | MIGRATIONS_PATH (the project's own folder) | 001, 002, … independently of the framework | project |

:::note How npm run migrate works
Pending framework migrations run first, then the project's, each in number order, and each is recorded in framework_schema_migrations with its source and checksum. The same number may appear in both sources. A recorded migration whose file has changed stops the run. To run one migration: node scripts/run-migration.js 012_invoices.sql, or project:012_invoices.sql when both sources have that name. An install from before two sources is upgraded by the first run: its records become framework.
:::

## Deployment sequence

1. **Back up** — Create and verify a database backup before schema or ACL changes.
2. **Build artifacts** — Run server tests and the UI production build in a clean environment.
3. **Apply migrations** — npm run migrate: pending framework migrations first, then the project's, each recorded with its source.
4. **Deploy server** — Load secrets from the environment, start under a process manager, and wait for the startup log.
5. **Deploy UI** — Serve Vite’s dist directory behind HTTPS with history fallback to index.html.
6. **Smoke test** — Test login, refresh, the first authorized route, a list, a form lookup, an ACL change, logs, and backup metadata.
7. **Observe** — Watch 4xx/5xx rate, request latency, database pool health, disk space, log rotation, and backup success.

## Logging policy

- Log lifecycle events, authentication outcomes, authorization denials, writes, operational failures, and unexpected errors.
- Do not log every successful data fetch at high severity; use bounded HTTP/request logs and metrics for volume.
- Never log passwords, tokens, secrets, entire cookies, raw credentials, or unrestricted request bodies.
- Use requestId to connect a UI network failure to server logs.
- Audit events and diagnostic logs have different retention and access requirements.

## Backup policy

- A user can request the managed server backup directory or an allowed server-side destination.
- A browser cannot silently write to an arbitrary local folder; browser folder access requires an explicit picker and support varies by browser.
- The backend owns provisioning, mysqldump execution, timeout, result validation, and SHA-256 metadata.
- Regularly perform a restore drill. A backup is not proven until it restores successfully.

:::danger Production gate
Replace development CORS origins with environment-managed origins, use HTTPS, secure cookies, a supervised Node process, restricted MySQL credentials, protected log/backup directories, and an external backup copy before exposing the service.
:::

```shell Release verification
cd server && npm test
cd ../ui && npm run lint && npm run build
```
