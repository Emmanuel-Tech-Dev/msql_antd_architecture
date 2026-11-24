---
id: architecture
title: System architecture
track: learn
group: Get oriented
order: 3
eyebrow: High-level design
audience: Everyone
readTime: 14 min
summary: The runtime layers, sources of truth, trust boundaries, and request lifecycle.
---

The architecture has four cooperating layers: the browser experience, the framework runtime, the HTTP service, and MySQL. Each layer owns a different kind of decision. Keeping those responsibilities separate is the main reason the system can be configurable without becoming unsafe.

## Layer ownership

| Layer | Owns | Must not own |
| --- | --- | --- |
| Pages and components | Presentation, interaction, accessible feedback | Database access rules or permission truth |
| UI framework runtime | Providers, server state, auth state, route registry, metadata interpretation | Unvalidated SQL or server authorization |
| Express service | Authentication, authorization, validation, orchestration, safe response envelopes | Browser-only display assumptions |
| MySQL | Records, ACL mappings, metadata, settings, audit-supporting state | Whether a caller is trusted |

## Authenticated request lifecycle

:::flow
- React hook calls the data provider
- Axios adds the bearer access token
- Express authenticates the token
- Authorization resolves roles, permissions, and endpoint resources
- validateTable resolves physical schema and removes sensitive and permission-guarded columns
- Metadata rules check the record: types, required fields, rules, lookups, field access
- BaseService builds the allowed operation
- Model and QueryBuilder execute a parameterized query
- The response is normalized and cached by React Query
- The page rerenders from server state
:::

## Sources of truth

| Concern | Authoritative source | Runtime consumer |
| --- | --- | --- |
| Identity and credential state | admin + admin_credentials | AuthService and auth middleware |
| Roles and permissions | admin_user_roles, admin_role_permissions, admin_permission_resources | Authorization middleware and auth store |
| Browser routes and navigation | admin_resources | FrameworkProvider, route guard, useSider |
| Forms, lists and their rules | metadata_tables, tables_metadata, metadata_versions | GET /api/v1/metadata/:table → MetadataForm and MetadataTable; metadataSchema on every generic write |
| Field-level access | tables_metadata.config readPermission / writePermission | validateTable, metadataSchema, getTableMetadata |
| Startup data | framework_bootstrap_profiles and framework_bootstrap_datasets | bootstrapService and FrameworkProvider |
| Appearance | ui_settings/layout.sider | ThemeProvider, useTheme, AppLayout |
| Server settings | system_settings plus environment | SettingsManager and server services |
| Lookup sources | metadata_lookups (the browser sends only a key) | metadataService.getLookupOptions |

:::warning Trust boundary
A table name received from the browser is never sufficient authority. Generic CRUD passes through authentication, endpoint authorization, physical-table validation, sensitive-table blocking, and column allowlisting before a query is executed.
:::

## Runtime state model

- React Query owns remote server state and invalidation.
- Zustand stores identity, roles, permissions, and the resource registry.
- The ValuesStore holds the bootstrap datasets: admin_resources, permissions, ui_settings and metadata_lookups. Table metadata is fetched per table and cached by React Query under ['metadata', table].
- LocalForage is an optional browser persistence layer for offline-oriented use cases; it is not authorization state.
- Ant Design ConfigProvider and CSS custom properties expose the resolved appearance consistently to Ant Design, Tailwind, and vanilla CSS.

:::note Architecture decision
Bootstrap is registry-driven. The browser asks for a profile (authenticated_startup) and never names a table; framework_bootstrap_datasets decides the tables, columns, filters, row limits, environment and required permission. Adding startup data is a migration, not a UI change.
:::
