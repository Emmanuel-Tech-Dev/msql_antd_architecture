# Plan: install the framework with npm

Status: **approved** 2026-11-24 with the recommendations in section 6 (D1 Git tags, D3 one repo with workspaces, D4 CommonJS). D2 decided 2026-11-25: `@msql-antd/framework-server`, `@msql-antd/framework-ui`.
Scope: `msql_antd_architecture`. viLuxeInvoice is rebuilt on the packages as the proof (phase 6).
Read first: `docs/architecture.md`.

## 1. Why

Today a new system starts as a copy of this repository, and the project then edits framework files. Every framework fix has to be copied into every project by hand: the viLuxeInvoice → framework sync showed how slow and error-prone that is.

The goal is for a new project to start with one command and take framework fixes with `npm update`, without ever editing framework files.

## 2. Target

```bash
npx create-<framework> my-system      # once: makes a project wired to the packages
cd my-system && npm run migrate && npm run dev

npm update @<scope>/framework-server @<scope>/framework-ui   # later: take fixes
```

Two packages plus a starter:

| Package | Contains | A project uses it like |
|---|---|---|
| `@<scope>/framework-server` | Express app factory, middleware (auth, authorization, ABAC, validateTable, errors, logging), generic API, metadata engine and builder API, auth routes, access management, settings, backups, uploads, realtime, migration runner, the framework's own migrations. | `createServer({ routes, policies, migrations, settings }).listen()` |
| `@<scope>/framework-ui` | Providers (`FrameworkProvider`, data and auth providers), stores, hooks (`useList`, `useCan`, …), `AppLayout`, route guard, auth pages, admin pages (users, roles, permissions, resources), settings pages (appearance, backups, logs, data model), `MetadataForm`/`MetadataTable`, field type and layout registries, theme. | `<FrameworkApp routes={[...]} menu={[...]} />`, plus imports of components and hooks |
| `create-<framework>` | A small CLI that copies a project template (server + ui folders that *depend on* the packages), writes `.env` from questions, and runs `npm install`. | `npx create-<framework> my-system` |

**What stays in the project:** its business routes, services and pages, its own migrations, its ABAC policies, extra field types, `.env` and theme choices.
**What never changes in the project:** anything inside `node_modules/@<scope>/…`.

## 3. Extension points the packages must offer

Every place where a project edits framework code today needs an option instead.

| Today a project edits… | Instead it will… |
|---|---|
| `server/index.js` to add routes | `createServer({ routes: [InvoiceRoute] })`. Route classes keep the same `constructor(app)` shape. |
| `server/index.js` to add middleware | `createServer({ beforeAuth: [...], afterAuth: [...] })`. |
| `coreAbacPolicies.js` to add a rule | `createServer({ policies: [branchPolicy] })`, registered in the existing `AbacPolicyRegistry`. |
| `resources/migrations` to add tables | Its own `migrations/` folder, passed to the runner (section 4). |
| `ui/src/App.jsx` to add pages | `<FrameworkApp routes={[{ path: 'invoices', element: <Invoices /> }]} />`. The framework keeps its own routes (auth, admin, settings). |
| `fieldTypes.jsx` / `formLayouts.js` | `registerFieldType` / `registerFormLayout`, called from the project. These already exist. |
| Theme files | Appearance settings (already database-driven) plus an optional `theme` prop. |
| `main.jsx` resource list | `<FrameworkApp resources={[...]} />`. |

## 4. The hard part: migrations from two sources

Today there's one folder and one sequence (`001`–`025`), and the runner refuses duplicate numbers. With packages there are two sources: the framework's migrations (inside the package, growing with each release) and the project's own.

Proposal:
- Record each migration with a **source** (`framework` or `project`) in `framework_schema_migrations`. Numbers only need to be unique within a source.
- `npm run migrate` applies pending **framework** migrations first, then pending **project** migrations, each in number order.
- Existing installs: a one-off migration marks `001`–`025` as `framework`. viLuxeInvoice's own migrations are renumbered into its project folder, recorded as `project`.
- Framework migrations must stay safe to run on any install: `IF NOT EXISTS`, `INSERT IGNORE`, no business tables.

## 5. Phases

Each phase ends with the server tests, UI tests and build passing, and a commit.

### Phase 1: Clean-up (no behaviour change) (done 2026-11-24)
Done: removed `components/programmes/`, `components/pageDrawer/`, `pages/Analytics/`, `Test2.jsx` and the `/admin/test`–`test3` routes; tidied `server/index.js` (same middleware order, verified against the running server); one `server/core/config/sensitiveData.js` for sensitive tables and columns; one `isPrivilegedRole` in the UI (`AccessProvider.js`); migration 026 stops loading `tables_metadata` at start-up.
Kept on purpose: `/admin/home` ("Dashboard") still renders the legacy playground `pages/Test.jsx` until a real framework home page is designed; the owner's `/admin/testing` page stays. Found: the browser route `/admin/settings/api` has no page in `App.jsx`.

- Move leftover business code out of the framework: `components/programmes/`, `components/pageDrawer/BeneficiaryInfo.jsx`, `pages/Analytics/`, test pages (`Test.jsx`, `Test2.jsx`, `pages/admin/Test.jsx`, `/admin/test*` routes). The `/admin/testing` route is the owner's work in progress: ask before moving it.
- Tidy `server/index.js`: remove commented-out code, the duplicate body parsers and the misleading rate-limit message.
- One `SENSITIVE_COLUMNS` list; one place for the privileged role names.
- Remove `tables_metadata` from bootstrap (nothing reads it any more).

### Phase 2: Server app factory (done 2026-11-25)
Done: `server/createServer.js` exports `createServer({ routes, publicRoutes, beforeAuth, afterAuth, policies, paths, port })` returning `{ app, server, start }`; `index.js` is a three-line caller. Verified: 16 read-only requests (public, signed in, 400/401/403/404, OPTIONS, /ws) compared before and after, 4,075 fields, 0 differences. Paths: `LOG_PATH`, `BACKUP_PATH` and the new `MIGRATIONS_PATH` (also read by the migration runner and the builder), settable through `paths`.

- Turn `index.js` into `createServer(options)` (section 3), with today's `index.js` becoming a three-line caller. Behaviour must be identical: compare the responses of the main endpoints before and after.
- Resolve file paths (migrations, backups, logs, uploads) from options or the project folder, not from `__dirname` inside the package.

### Phase 3: Migrations from two sources (section 4) (done 2026-11-25)
Done: `core/lib/migrationRunner.js` lists framework (`resources/migrations`) and project (`MIGRATIONS_PATH`) migrations, numbers unique per source, framework first; `framework_schema_migrations` gained `source` with primary key `(source, migration_name)`, added by the runner itself on first run (existing records become `framework`). `migrate`, `db:setup`, `db:snapshot` and the builder use it. Rehearsed on `zz_*` scratch databases (an existing install with 001–028 recorded, and a fresh setup), each with a project migration; then run on the development database (44 records marked framework, nothing applied).
- Done first (2026-11-25): a fresh install no longer needs a database dump. `npm run db:setup` loads `server/resources/schema/framework_schema.sql` (framework tables and rows, generated by `npm run db:snapshot`) into an empty database, records the migrations it contains, runs newer ones and creates the first superadmin. Verified on a scratch database: identical columns to an existing install.
- Rehearse on a scratch database (`zz_*`), including an existing install with `001`–`025` already applied.

### Phase 4: UI package (done 2026-11-25)
Done: the framework UI is `@msql-antd/framework-ui` in `packages/framework-ui` (files moved with `git mv`, history kept). `src/index.js` exports the providers, data/auth/access hooks, metadata components and registries, layout and table components, UI hooks, `apiClient`, `queryClient`, `queryKeys`, `useAuthStore` and `utils`. `<FrameworkApp config resources routes publicRoutes dataProvider authProvider>` holds today's provider stack and framework routes; Users and Roles resources are built in. `config` replaces `import.meta.env` inside the package (a library build would bake those values in): `apiUrl`, `socketUrl`, `googleClientId`, map settings; `configureFramework()` for code outside React. Vite library mode builds `dist/framework-ui.js` (pages stay lazy chunks) and `dist/framework-ui.css`; peers and dependencies stay external (checked in the output). `ui/` is the example app: `main.jsx` plus the two sample pages, running the package from source through a Vite alias. The root `package.json` is an npm workspace (`packages/framework-ui`, `ui`); its lockfile keeps every version of the old `ui` lockfile (567 of 567). Unused dependencies were not carried into the package: `@xyflow/react`, `react-confirm-alert`, `react-csv`, `react-detect-offline`, `react-to-print`.
Verified: 56 UI tests (52 before plus 4 for `FrameworkApp`, `configureFramework` and the entry), 178 server tests, lint, the package build, the example app build from source and a second build against `dist`.
- Export the providers, hooks, components and pages; add `<FrameworkApp>`.
- `react`, `react-dom`, `antd`, `react-router-dom` and `@tanstack/react-query` become **peer dependencies**, so a project has exactly one copy of each.
- Build with Vite library mode (ES modules + CSS). Today's `ui/` becomes the example app that uses the package.

### Phase 5: Starter and publishing
- Done first (2026-11-25): the server as `@msql-antd/framework-server` in `packages/framework-server` (files moved with `git mv`). `index.js` exports `createServer` and, loaded on first use, `Model`, `db`, `BaseService`, `metadata`, `AppError`, `validateRequest`, `authorization`, `abac`, `logger`, `utils`, `CacheManager`, `SettingsManager`, `realtime`, `migrations` and the rest. Commands `msql-antd-migrate` and `msql-antd-db-setup`. Logs, backups and uploads default to the project's folder (`paths.uploads`/`UPLOAD_PATH` added); `server/` is the example project (`index.js` passes its folders). The workspace has four members; server dependency versions kept from the old server lockfile (0 changed). Root `npm run dev` starts the API and the UI together (`scripts/dev.js`). Verified: 179 server tests, 56 UI tests; the old and new layouts answered 16 read-only requests side by side, 4,075 fields, only stack-trace file paths differ.
- `create-<framework>` CLI and project template.
- Versioning: semantic versions. A framework migration or a breaking option change means a new minor/major version with release notes.
- Publish as decided in section 6.

### Phase 6: Proof
- Rebuild viLuxeInvoice on the packages: its business code stays, its framework copies are deleted.
- Start an empty project with the starter and sign in.

## 6. Decisions (taken 2026-11-24, except D2)

| # | Question | Options | Recommendation |
|---|---|---|---|
| D1 | Where are the packages published? | (a) Install from the Git repo by tag (`github:you/framework#v1.2.0`). (b) GitHub Packages (private, free for private repos within limits). (c) Private npm organisation (paid). (d) Public npm. | **(a) to start**: no registry and no cost; move to (b) when there are several projects. |
| D2 | Name and scope | `@<scope>/framework-server`, `@<scope>/framework-ui`, `create-<framework>` | The owner chooses. |
| D3 | One repository or several? | Keep one repo with `packages/server`, `packages/ui`, `packages/create` (npm workspaces), or split. | **One repo with workspaces**: one place for issues, tests and releases. |
| D4 | Server language | Stay CommonJS, or move to ES modules. | **Stay CommonJS** for now; moving is a separate change. |

## 7. Risks

| Risk | Mitigation |
|---|---|
| Behaviour changes while restructuring | Phase 2 compares endpoint responses before and after; the existing tests run in every phase. |
| A framework migration breaks a project's data | Framework migrations never touch business tables; rehearse on scratch databases; backups before `migrate`. |
| Two copies of React or antd in a project | Peer dependencies (phase 4). |
| Projects still patch `node_modules` | Every patch request becomes a missing extension point, added in a framework release. |
| viLuxeInvoice diverges during the work | Rebuild it only in phase 6, after the packages are stable. |
