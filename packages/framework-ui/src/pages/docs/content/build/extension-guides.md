---
id: extension-guides
title: Extension playbooks
track: build
group: Tutorials
order: 5
eyebrow: Safe change patterns
audience: Developers
readTime: 20 min
summary: Repeatable procedures for new tables, pages, resources, forms, lookups, settings, endpoints, and bootstrap data.
---

## Add a managed table

1. **Create a migration** — Define the table, indexes, foreign keys, timestamps, and rollback/forward strategy.
2. **Describe it** — Open Settings › Data model, choose Describe, review the guessed fields and save. Or use New table, which writes the table, metadata and permissions in one migration.
3. **Register API resources** — Add method/path rows to admin_resources and map them to permissions.
4. **Design the form and list** — Arrange sections, widths, rules and list columns in the builder; guard sensitive fields with read/write permissions.
5. **Build the page** — Usually just <MetadataTable table="…" /> inside PageHeader. Hand-build only what metadata can't express.
6. **Test roles** — Verify SuperAdmin/dev and at least one restricted role for list, create, edit, and delete.

## Add a browser page

1. **Create the React page** — Use an existing page pattern and shared components.
2. **Declare the route** — Add the element to the routes passed to <FrameworkApp> in main.jsx. This connects the path to code.
3. **Register BROWSER_ROUTE** — Add admin_resources metadata: path, icon, category, order, is_public, and show_in_nav.
4. **Map access** — Assign the route resource through permissions unless it is intentionally authenticated-public.
5. **Validate navigation** — show_in_nav=0 must hide the link without breaking direct authorized access.

## Add a lookup

1. **Create the lookup** — Settings › Data model › Lookups: key, source table, stored value, shown label, sort, optional dependency and permission.
2. **Preview it** — Preview choices before saving; the server refuses blocked tables and unknown columns.
3. **Point fields at it** — Give lookup fields config.lookup = the key. The server checks submitted values against the same lookup.
4. **Test the form** — Verify options load once, dependent targets refresh, and user-facing errors remain generic.

## Add bootstrap data

1. **Decide if it is truly startup-critical** — Bootstrap should contain only data needed before normal pages can operate.
2. **Register the dataset** — In a migration, add a framework_bootstrap_datasets row (source, columns, filters, max rows, permission) and link it to the authenticated_startup profile.
3. **Keep validation server-side** — The browser only names the profile. Sensitive sources are blocked, and a dataset with required_permission is skipped for users without it.
4. **Consume from ValuesStore** — Read the dataset by storeName and avoid duplicate fetches in page components.

## Add a server route

1. **Write a route class** — constructor(app) registers handlers, like route/baseRoute.js. Reuse validateRecordAgainstMetadata and throwFieldErrors for described tables, and syncRecordFiles if it saves uploaded files.
2. **Pass it to createServer** — createServer({ routes: [InvoiceRoute] }) in the project's server/index.js. It is registered after authorization and before the generic /api/:resources routes.
3. **Give it a resource** — One API_ENDPOINT row per method and path in Resources › Resource catalogue, a link to a permission in Resources › Policy links, and the permission on a role; without the whole chain, authorization refuses it. The steps and matching rules (:id, a trailing *, ALL) are in Identity and access › How an API request is allowed.
4. **Call it from the UI** — dataProvider.custom or apiClient, or MetadataForm onSubmit for a form that saves through it.

## Add an appearance setting

1. **Extend defaults** — Add a safe default in siderConfig.js.
2. **Normalize** — Validate type, range, enum, string length, or safe color before use.
3. **Expose an editor** — Add an Ant Design control and live preview in Appearance Settings.
4. **Apply once** — Map the value through ThemeProvider, useTheme, Ant component tokens, or CSS variables.
5. **Persist the whole document** — Save validated layout.sider JSON, increment version, then refresh bootstrap.

:::note When code changes are still correct
A configurable framework should reduce routine code edits, not eliminate code as a safety boundary. New executable behavior, new secret handling, new trust relationships, schema migrations, and expanded data exposure should require reviewed code.
:::
