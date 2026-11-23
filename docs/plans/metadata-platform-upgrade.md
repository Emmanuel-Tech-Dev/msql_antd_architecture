# Framework upgrade plan: metadata platform, form builder and bootstrap

Status: **approved** (decisions taken 2026-11-23, section 7). Phases 0–3 done (2026-11-23); phase 4 in progress (runtime built, Permissions moved).
Scope: `msql_antd_architecture` only. Business projects built on the framework (for example viLuxeInvoice) adopt it later, as a separate step.

## 1. Why

The framework calls itself metadata-driven, and the database is meant to describe forms and tables. In practice, the metadata is too thin to describe real forms, nothing enforces it on the server and nobody can edit it without SQL. So projects built on the framework hand-code their forms and define the same fields twice.

### Gaps found

| # | Gap | Evidence |
|---|-----|----------|
| G1 | **The bootstrap registry is never used.** The screen names the tables, columns and filters it wants at startup. | `framework_bootstrap_*` tables (migration 001) are read by nothing; `FrameworkProvider.jsx` sends `tables: [...]`; `baseService.bootstrap()` validates that list instead of reading the registry. |
| G2 | **Metadata rules are not enforced on the server.** `validator` runs only in the browser, and generic writes check only that the columns exist. | `validateEmptyString` exists only in `ui/src/utils/function_utils.js`; `BaseService.validateWriteRecord` checks column names only. The README says "the server is authoritative for validation". |
| G3 | **Select options are stored as SQL text.** The browser parses that SQL with a regular expression. | `options: {"sql":"SELECT role_name FROM admin_roles",...}`; cascades in `extra_options` use `... where resource_type='this.value'`; `legacySqlToLookup()` only understands a simple `SELECT ... FROM ... WHERE a = 'b'`; lookups are allowed by a hard-coded JS list (`lookupRegistry.js`). |
| G4 | **The metadata is too thin for real forms.** | One validator (`validateEmptyString`). No required/min/max/pattern, default, placeholder, help text, sections, column width or "show when". No money/percent/switch/colour/phone types. `extra_options` is `varchar(255)`. Visibility flags have confusing names (`backend_visible` means "in the form"; `fieldPolicy.js` already plans `form_visible`). No unique key on `(table_name, column_name)`. The `type` option list in the metadata's own metadata is missing types the engine supports (`sqlSelect`, `jsonRadio`, `textEditor`, ...). No table-level settings at all (title, title column, default sort, layout). |
| G5 | **There is no screen for managing metadata.** | `tables_metadata` describes itself (17 rows) so it could be edited, but no page does. |
| G6 | **Projects duplicate field definitions.** | viLuxeInvoice's reference lists (units, taxes, payment terms, ...) have `tables_metadata` rows, yet define their columns again in JavaScript with types the metadata lacks (`money`, `percent`, `days`, `status`, `lookup`, `color`). |
| G7 | **The form engine is hard to extend.** | `useRecordForm.jsx` is 1,125 lines that push JSX into an array inside a big `switch`, with about 25 `useState` calls. Adding a field type means editing it in several places. |
| G8 | **Bootstrap can silently cut off metadata.** | Bootstrap loads every table's metadata for every user, capped by the default row limit of 1,000 (`normalizeLimit` in `validateTable.js`; the registry's `max_rows 2000` is not used). Past 1,000 fields, forms would lose fields with no error. 120 rows today (2026-11-23). |
| G9 | **Dead and leftover code.** | `ui/src/store/settings-store.js` (old bootstrap entries, unused). The temporary-password UI still needs merging into `Users.jsx` and `Login.jsx` (the server is done; see the README of the `framework-update` bundle). |

## 2. Goals and non-goals

**Goals**

1. The metadata can describe any ordinary form and list fully, including layout, rules, lookups and conditions, so simple screens need no hand-written form.
2. The same metadata rules are enforced in the browser and on the server.
3. No SQL in metadata. Lookups are named, server-owned definitions.
4. A builder screen to describe tables, design their forms and lists, and preview them, without SQL.
5. Startup data is decided by the server (the bootstrap registry).
6. Existing metadata and admin pages keep working throughout. Each phase ships on its own.

**Non-goals**

- Replacing hand-built workflow screens (multi-table documents with line items, live previews, several tables saved in one transaction) with generated forms. Instead they can **mix**: a hand-built screen can render metadata-driven field groups, and a metadata form can host a custom component (section 3.4).
- Letting the builder change the database schema (create or alter tables). Schema changes stay in reviewed migrations. The builder describes tables that exist.
- Changing any business project in this work.

## 3. Target design

### 3.1 Data model

Evolve `tables_metadata` in place (so existing rows, `useRecordForm` and bootstrap keep working), and add two tables. All changes are additive migrations with backfills.

**`tables_metadata` (one row per field): added columns**

| Column | Purpose |
|--------|---------|
| `form_visible`, `list_visible` | Clear names. Backfilled from `backend_visible` / `frontend_visible`; old columns kept until phase 4 is complete. |
| `required` | Replaces the `validateEmptyString` convention (backfilled from it). |
| `default_value` | Value for new records. |
| `placeholder`, `help_text` | Shown with the field. |
| `section_key`, `col_span` | Which form section the field belongs to and how wide it is (1–24 grid, like antd). |
| `config` JSON | Type-specific settings, validated by a schema per type, e.g. `{min, max, step, precision}`, `{currency: true}`, `{options: [{value,label}]}`, `{lookup: "roles"}`, `{accept, maxSizeMb}`, `{rows}`. |
| `rules` JSON | Extra validation: `[{rule:"pattern", value:"^[A-Z]{3}$", message:"..."}, {rule:"minLength", value:3}]`. |
| `visible_when`, `required_when` JSON | Conditions on other fields: `{field:"status", in:["SENT"]}`, with `all`/`any` groups. |
| `version` | Raised on every change, for caching. |

Also: a unique key on `(table_name, column_name)` (after removing duplicates), and `extra_options` is kept read-only until its cascades move to lookups (phase 2).

**`metadata_tables` (new, one row per described table)**

`table_name` (unique), `label`, `singular_label`, `description`, `icon`, `title_column` (what to show when the record is referenced), `default_sort`, `search_columns` JSON, `form_layout` (`modal` / `drawer` / `page`), `form_columns` (1 or 2), `sections` JSON (`[{key, title, description, collapsed}]`, ordered), `enabled`, `version`, audit columns.

**`metadata_lookups` (new; replaces SQL in options and the JS `LOOKUP_REGISTRY`)**

`lookup_key` (unique), `source_table`, `value_column`, `label_column`, `extra_columns` JSON (e.g. an avatar), `base_filters` JSON (fixed, e.g. `is_active = 1`), `depends_on` (the field whose value filters this lookup: replaces the `'this.value'` cascade), `filter_column`, `sort`, `max_rows`, `required_permission`, `enabled`.

The server answers `GET /api/v1/lookups/:key?parent=<value>` using only these definitions. A field refers to a lookup by key: `config: {lookup: "roles"}`.

### 3.2 Field type catalogue

Each type has one definition shared by the server schema builder, the form renderer, the list cell renderer and the builder's settings panel.

| Group | Types |
|-------|-------|
| Text | `text`, `textarea`, `richText`, `email`, `phone`, `url`, `password` |
| Numbers | `integer`, `number`, `money`, `percent`, `duration` (days/hours) |
| Dates | `date`, `dateTime`, `time`, `dateRange` |
| Choice | `switch`, `select`, `multiSelect`, `radio`, `checkboxGroup` (static options in `config.options`) |
| Lookup | `lookup`, `multiLookup` (via `metadata_lookups`) |
| Media | `file`, `image`, `color` |
| System | `primaryKey`, `generatedId` (was `customGenerateString`), `readonly`, `computed` (display only, formula over other fields) |
| Extension | `custom` (a named component registered in code: `registerFieldType("signaturePad", ...)`), `repeater` (child rows in a related table; phase 6) |

Old type names (`jsonSelect`, `csvSelect`, `sqlSelect`, `csvMultiSelect`, ...) map to the new ones in the phase 2 migration. A reader accepts both names until phase 4 is complete.

### 3.3 Server enforcement

- `metadataSchema(table)` builds a zod schema from the field rows: type coercion, required, `required_when`, min/max/pattern, allowed static options, that a lookup value exists, and stripping of non-writable and read-only fields. It's cached per table and cleared when that table's metadata `version` changes.
- Generic `POST`/`PUT`/`bulk` on `/api/:resources` run it whenever the table is described. Undescribed tables behave as today (column check only), so nothing breaks.
- Errors come back per field (`{ errors: { rate: "Must be between 0 and 100" } }`) and the form shows them under the fields.
- Hand-written routes can reuse `metadataSchema(table)` and extend it with `.extend()`/`.superRefine()`, so their rules don't drift from the metadata.

### 3.4 UI runtime

- **`<MetadataForm table="taxes" />`** on antd `Form`: sections, the 24-column grid (responsive), conditions, defaults, lookups, and antd rules generated from the **same rule definitions** as the server. Props for `initialValues`, `onSaved`, `fields` (subset), `readOnly`, and `slots` (insert a custom component before/after a section or field).
- **`<MetadataFields table="..." section="..." />`**: renders a group of fields inside a hand-built form. This is how complex screens use metadata for their simple parts.
- **`<MetadataTable table="..." />`**: list columns, cell formatting by type, search and filters from `metadata_tables` and `list_visible` fields, built on the existing `CustomTable`.
- **Field registry**: `registerFieldType(type, { input, cell, settings, toZod })`. The built-in types are registered the same way projects add their own.
- **Metadata loading**: per table through `GET /api/v1/metadata/:table`, cached by React Query with the `version` as part of the key. This replaces bootstrapping every table's metadata at startup (fixes G8). Bootstrap keeps only what every screen needs.
- `useRecordForm` stays working through an adapter until the admin pages are moved over (phase 4), then it's deprecated.

### 3.5 Metadata builder (new screen)

Settings › **Data model**, available to `superadmin`/`dev` only (new permission `manage:metadata`; every change written to the audit log).

1. **Tables list**: every table in the database, marked described or not described, with field counts and the last change.
2. **Describe a table**: scaffolds rows from `INFORMATION_SCHEMA`, guessing the types (`tinyint(1)` → `switch`, `decimal` → `number`/`money`, `date` → `date`, `text` → `textarea`, a foreign key → `lookup`, with a suggested lookup definition). The admin reviews before saving.
3. **Form designer**: the fields in sections, drag to reorder or move between sections, set the width, and a **live preview** of the real `MetadataForm` with sample data at desktop and phone width.
4. **Field inspector**: label, type, required, default, placeholder, help, then the settings for that type (from the field registry), then rules and conditions with a small rule editor (no JSON typing).
5. **List designer**: which columns, their order, the default sort and the search columns, with a live preview of `MetadataTable`.
6. **Lookups**: create and edit `metadata_lookups` and test them (shows the first rows).
7. **Versions**: each save raises the version and keeps the previous definition. Shows the difference and can restore it.
8. **Export / import**: a table's metadata as JSON, and **"Export as migration"** producing a `.sql` file for the project's `resources/migrations`. This is how metadata designed in one database reaches another (development → production, framework → new project).

The screen is designed in a Claude artifact first and approved before any code.

### 3.6 Bootstrap registry

- `POST /api/v1/bootstrap` takes `{ profile: "authenticated_startup" }`. The server reads the profile's enabled datasets for the current environment, in `load_order`, and for each one selects the registered columns, applies `base_filters_json`, `default_sort_json` and `max_rows`, and redacts sensitive columns.
- **Core datasets** (`admin_resources`, `admin_permissions`, the appearance row of `ui_settings`) have no `required_permission`: every signed-in user needs them. `required_permission` applies only to datasets added later.
- An `OPTIONAL` dataset that fails is left out of the response and reported in it (`unavailable: ["..."]`). A `REQUIRED` dataset that fails fails the request.
- A migration registers the `ui_settings` (`layout.sider`, active) dataset. `tables_metadata` leaves bootstrap once per-table loading (3.4) is in place.
- Rows can be cached per dataset with `cache_ttl_seconds`, but `ui_settings` has caching off (0) so a saved appearance shows at once.
- The old request shape (`tables: [...]`) is removed in the same release, together with the `CORE_BOOTSTRAP_TABLES` and the bootstrap branches in `validateTable.js`.

## 4. Phases

Each phase is shippable on its own, keeps existing screens working, and ends with the server tests (`npx jest`), the UI tests (`npm test`), the UI lint and build passing.

### Phase 0: Housekeeping and a safety net (done 2026-11-23)
- Remove `ui/src/store/settings-store.js` once a search confirms nothing imports it.
- Merge the temporary-password UI into `Users.jsx` and `Login.jsx` (after the uncommitted work in them is committed).
- Add characterisation tests: for the admin tables (`admin`, `admin_roles`, `admin_permissions`, `admin_resources`), what the current form renders and what the generic routes accept and reject. Later phases must keep these passing.

**Done when:** the safety-net tests pass and pin today's behaviour.

**Result:** `settings-store.js` removed; the temporary-password UI arrived with the viLuxeInvoice sync. Safety net: `server/tests/genericCrudCharacterisation.test.js` (generic routes; the "until phase 3" case changes on purpose), `server/tests/bootstrapCharacterisation.test.js` (what sign-in loads; phase 1 must match it), `server/tests/fixtures/adminTablesMetadata.json` (the admin tables' metadata rows, input for the phase 2 conversion), and `ui/src/hooks/useRecordForm.characterisation.test.jsx` with snapshots of each admin form (Vitest added to the UI). Quirks the snapshots record: the generated User ID is a hidden field; "is system role" is disabled even when adding; roles show Description before Role (equal ranks); editing shows only the fields present in the record.

### Phase 1: Connect the bootstrap registry (G1) (done 2026-11-23)
- Server: `bootstrap({ profile })` as in 3.6, the migration for the `ui_settings` dataset, and removal of the old request shape.
- UI: `FrameworkProvider.jsx` sends the profile key, and the stores are filled exactly as before.
- Tests: profile resolution, environment filter, column whitelist, required vs optional failure, unknown profile refused, disabled dataset skipped.

**Done when:** sign-in loads the same data as today, and a request naming tables is refused.

**Result:** `server/core/lib/bootstrapService.js` reads the registry; `validateTable.js` lost its bootstrap branches; migration 019 completes the dataset column lists (adds `show_in_nav` and timestamps, so the data matches the old `*` requests) and registers `ui_settings` as OPTIONAL. Row caching (`cache_ttl_seconds`) is not implemented: the registry value is kept for later, and every sign-in reads fresh rows as before. Tests: `bootstrapService.test.js` and the updated `bootstrapCharacterisation.test.js`.

### Phase 2: Metadata data model v2 (G3, G4) (done 2026-11-23)
- Migrations: the new `tables_metadata` columns with backfills, a duplicate clean-up plus the unique key, `metadata_tables` (one row per currently described table, backfilled), `metadata_lookups`.
- A conversion step: every `sqlSelect` option and `extra_options` cascade becomes a `metadata_lookups` row, and the field's `config.lookup` points at it. Anything that can't be converted is listed in the migration output, never dropped silently. `LOOKUP_REGISTRY` entries become lookup rows.
- Old type names are mapped (3.2). Readers accept both.
- `GET /api/v1/metadata/:table` and `GET /api/v1/lookups/:key`.

**Done when:** all existing metadata is expressed in the new columns, no SQL is left in `options`, and the old admin forms still work.

**Result:** migrations 020 and 021. `backend_visible` and `frontend_visible` were renamed to `form_visible` and `list_visible` (021); `required` became the field's own flag and `validator` was dropped in phase 3 (migration 022). Optional input settings live in `config` rather than columns (021): `placeholder`, `helpText`, `default`, `rules`, `visibleWhen`, `requiredWhen`, next to the type settings (`options`, `lookup`, ...). Columns keep what every field has and the layout the designer moves in bulk (`rank`, `section_key`, `col_span`). Select options moved to `config.options`; the six SQL selects and the `resource_type` → `resource` cascade became five lookups (`roles`, `permissions`, `users`, `resource_types`, `resources_by_type`), each with a `required_permission`. Type names moved to the v2 catalogue; `ui/src/core/metadata/legacyField.js` maps them back for `useRecordForm`, which now reads `config.options`, loads lookups from `GET /api/v1/lookups/:key` and refreshes dependent lookups. Startup also loads `metadata_lookups` (keys and dependencies only). New: `GET /api/v1/metadata/:table` (`metadataService.js`, `MetadataRoute.js`); both endpoints are open to every signed-in user, lookups check their own permission. Proof: the migration was run on a scratch copy of the database (no SQL left, generated columns match all rows), and `useRecordForm.characterisation.test.jsx` renders every admin form from the converted rows (`adminTablesMetadata.v2.json`) identically. Deferred to phase 4: `LOOKUP_REGISTRY` and `/api/v1/extra_meta_options` stay for the ad-hoc callers `useGlobalSelect` and `useDynamicForm`, which move to named lookups with the new runtime.

### Phase 3: Server enforcement (G2) (done 2026-11-23)
- `metadataSchema(table)` and the type definitions on the server side, wired into the generic write routes for described tables, with field-level error responses.
- Tests per type and per rule, conditions, lookup existence, non-writable stripping, cache invalidation on a version change, and undescribed tables unchanged.

**Done when:** a write that breaks a metadata rule is refused by the server with a field error, even when sent without the UI.

**Result:** `server/core/lib/metadataSchema.js`: `metadataSchema(table, { mode, existing })` builds a zod schema from the field rows (types and coercion, static options, `config.min`/`max`, `config.rules`, `required`, `config.visibleWhen`/`requiredWhen` evaluated against the stored record on update), and `validateRecordAgainstMetadata` adds lookup existence (a dependent lookup is filtered by the record's own parent value). Primary keys and disabled fields are dropped; fields that are not editable can be set on create but are dropped on update. Generic create, bulk and update run it for described tables (an enabled `metadata_tables` row) and refuse with `ERR_VALIDATION_FAILED` and `details.errors = { column: message }`, all problems at once; undescribed tables behave as before. Migration 022 makes `required` a real flag (from `validator = 'validateEmptyString'`) and drops `validator`; `legacyField.js` maps it back for `useRecordForm`. No schema cache: the field rows are read per write (writes are not a hot path; the cache can come with the builder). Tests: `metadataSchema.test.js`, and the characterisation group now shows a described table refusing what an undescribed one accepts.

### Phase 4: UI runtime (G7)
- The field registry with all built-in types, `MetadataForm`, `MetadataFields`, `MetadataTable`, and per-table metadata loading.
- Move Users, Roles, Permissions and Resources onto them, with the safety-net tests passing.
- Deprecate `useRecordForm` (an adapter keeps any remaining callers working), and remove `tables_metadata` from bootstrap.

**Done when:** the admin pages run on the new runtime, look and behave the same or better, and adding a field type means one `registerFieldType` call.

**Progress (2026-11-23):** runtime in `ui/src/core/metadata/` (`fieldTypes.jsx` registry with all built-in types, `fieldRules.js` with the server's rules and messages, `useTableMetadata.js`) and `ui/src/components/metadata/` (`MetadataForm`, `MetadataFields`, `MetadataTable`, `LookupSelect`). Built on antd `Form`, so typing re-renders only the field (tested). Permissions page moved; migration 023 describes its two tables (`list_visible`, labels, search columns). Look kept as today (user decision: no separate design round). One form engine (user decision): `useRecordForm` is now a ~100-line wrapper over `MetadataForm` keeping the members pages use (`openCreate`, `openEdit`, `recordModal`, `save`, `saveCompleted`, `setFields`, `setChildrenTop`); the previous 1,156-line engine, `legacyField.js` and `fieldPolicy.js` were deleted. Compared field by field with the old engine: Roles, Permissions and Resources identical; editing now shows every form field (the old engine hid fields absent from the record); the user form shows the generated User ID read-only instead of hidden. Known gap: `file`/`image` fields are plain text inputs until an upload field type is registered (no live screen uses them through the generic form). Next: stepper (`form_layout: steps`, `registerFormLayout`), designed as a Claude artifact first; Resources, Roles, Users onto `MetadataTable`; removing `tables_metadata` from bootstrap (nothing reads it from the store any more).

### Phase 5: Metadata builder (G5)
- Design the Data model screens in a Claude artifact (tables list, form designer, field inspector, list designer, lookups, versions) with empty, loading, error and permission states, at desktop and phone width. **Get approval.**
- Build it on the phase 4 runtime (the preview is the real form), with versions, export/import and "Export as migration".
- `manage:metadata` permission and ACL migration, and audit entries.

**Done when:** a new table can be described, its form and list designed and previewed, and the result exported as a migration, all without SQL.

### Phase 6: Mixing with hand-built screens (G6)
- The `repeater` type (child rows in a related table, saved in one transaction with the parent), `computed` fields, `custom` field slots.
- A worked example in `/docs`: a hand-built screen using `MetadataFields` for its simple sections.
- A written rule (in `/docs` and the README) for when to use metadata versus a hand-built form.

**Done when:** a form with a child table works from metadata alone, and the rule is documented.

### Phase 7: Documentation and handover
- Update `/docs` (metadata, forms, tables, bootstrap, lookups, builder) and the README's claims.
- Prepare the change for business projects: a `framework-update` bundle and an adoption checklist (what to migrate, in what order, how to move reference lists like viLuxeInvoice's onto metadata). Adopting it in a project is separate work.

## 5. When to use metadata and when to hand-build

Use **metadata** (`MetadataForm` / `MetadataTable`) when the screen edits one record of one table (plus, from phase 6, simple child rows). Examples: reference lists (units, taxes, payment methods, categories), admin records, settings lists.

**Hand-build** when the screen is a workflow: several tables changing together with business rules in between, live calculation or preview, steps that depend on server state (sending, payment, freezing), or an unusual interaction. Examples: sales documents with line items, the document layout builder. Use `MetadataFields` inside them for their plain sections, and reuse `metadataSchema(table)` in their routes.

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| Breaking existing forms while changing the metadata | Additive migrations, readers accept old and new names, safety-net tests from phase 0, one phase at a time. |
| Some SQL options can't be converted to lookups | The conversion lists them. They're fixed by hand before the old path is removed. |
| Metadata edited in production without review | `manage:metadata` for superadmin/dev only, the audit log, versions with restore, and "Export as migration" so changes can go through git. |
| The server and browser disagreeing on rules | One rule format, one type definition per type, tests that run the same cases through both. |
| A bigger metadata payload | Per-table loading with version caching instead of one bootstrap list. |

## 7. Decisions (taken 2026-11-23)

1. **Evolve `tables_metadata` in place.** Additive migrations with backfills; every phase ships on its own.
2. **Metadata may be edited in production** by superadmin/dev, with every change versioned (restorable), audited, and exportable as a migration.
3. **`repeater` (child tables) comes after the builder,** in phase 6.
4. **The builder permission is `manage:metadata`.**
