# Changelog

All three packages (`@msql-antd/framework-server`, `@msql-antd/framework-ui`, `@msql-antd/create`) share one version. After upgrading, run `npm run migrate`.

## 0.2.1 — 2026-11-26

### Fixed
- The generic list routes (GET /api/<table>, GET /api/<table>/table, POST /api/<table>/query) did not limit the page size, so ?limit=100000 returned the whole table in one request. Limits are now capped at 100 (or the table config's maxLimit, at most 500); the default is 20.

### Docs
- Reference › Query builder: every Model method and the forms it accepts (chained where, where with an array, orWhere groups, joins and aliases, paging, aggregates, writes, transactions, full-text search), the SQL each produces, the errors it throws, and the list URL syntax.

No migrations.

## 0.2.0 — 2026-11-26

### New
- **Grant table access** (Permissions page): choose registered tables and actions; each permission is created with the API endpoints it needs, in one transaction, with a preview. Needs `manage:permissions` (given to SuperAdmin and dev).
- **System tables**: `metadata_tables.is_system`, set in the data-model builder's table settings. System tables are never offered for grants.
- **Row selection in `MetadataTable`**: `tableSelection`, `onSelectionChange(rows, keys)`, `bulkActions(...)`, and a built-in Delete selected.
- **Bulk delete**: `DELETE /api/<table>` with `{ ids }` (up to 500, all or none). Covered by `delete:<table>`.
- **`DirectionsMap`** works with any record: `destination`, `getPosition`, `title`, `description`, `origin`, `travelMode`, `loading`, `emptyMessage`, `onRoute`.
- **Newly exported hooks**: `useSider`, `useMap`, `useMasonry`, `useDraggable`, `useScrollToTop`, `useTableState`, `useTableQuery`, `useTableColumns`, `useRowSelection`.
- **CORS**: `createServer({ origins })` (URLs or regular expressions), added to `ALLOWED_ORIGINS`.
- **Package reference docs** in `/docs` (hooks, components, utilities, server API, app setup), with tests that fail when something exported is undocumented. A README for each package.

### Changed
- `useFramework` returns the framework's services (it used to throw). `useIdentity` returns `{ user, isLoading, error }` (it used to return a Promise). `useResourceProvider` returns `getResource`, `getBrowserRoutes` and `isReady`.
- `MapView` follows `config.mapProvider`.
- A project's own data or auth provider is checked for missing methods in every build, not only in development.
- The builder's new-table migrations use the same endpoints and names as Grant table access, and cover list, query, bulk create and bulk delete.
- **CORS defaults**: the placeholder production domains are no longer allowed. With no origins set, development allows `localhost:5173` and `:3001`; production allows none. Set `ALLOWED_ORIGINS` or `createServer({ origins })`.

### Removed (they could not run or used the wrong secrets)
- UI: `utils.bootstrap`. Startup data comes from the bootstrap profiles.
- Server `utils`: `generateToken`, `generateAuthTokens`, `generateStudentTokens`, `verifyToken`, `verifyRefreshToken`, `generateOtpSecret`, `generateOtpCode`, `verifyOtp`. Sign-in and one-time codes are handled by the framework's `AuthService` and `otpService`.
- The `node-cache` dependency.

### Fixed
- Required `multiSelect`, `multiLookup` and `checkboxGroup` fields could not be saved in a metadata form.
- `ValidationFactory.validateTelephoneNumber` rejected every real number; `validateSoftListData` failed on validators with arguments.
- `limitRange(offset, count)` and `getSql()` on the query builder had no effect.

### Migrations
- `029_table_access_grants.sql`: `is_system`, `manage:permissions`, the `grantable_tables` lookup and the Grant table access form.
- `030_bulk_delete_endpoints.sql`: the bulk delete endpoint for every existing `delete:<table>` permission.

## 0.1.0 — 2026-11-25

First release: the framework as three packages on GitHub Packages.
