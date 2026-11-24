---
id: ui
title: UI architecture
track: learn
group: Deep dives
order: 4
eyebrow: React framework runtime
audience: Developers
readTime: 22 min
summary: Providers, server state, stores, routes, design tokens, hooks, pages, and component boundaries.
---

The UI is a Vite and React 19 application. Ant Design supplies accessible primitives, Tailwind supplies utility composition, and a small vanilla CSS layer provides product-specific identity. FrameworkProvider is the runtime seam that makes the application reusable.

## UI initialization

:::flow
- BrowserRouter establishes route state
- ThemeProvider selects public or workspace appearance
- FrameworkProvider installs QueryClient, data, auth, access, and resource contexts
- Public routes render without bootstrap
- Authenticated routes load auth_user and bootstrap in parallel
- FrameworkProvider merges code resources with database browser routes
- AppLayout and route guards render the authorized workspace
:::

## Provider contracts

| Provider | Contract | Primary consumers |
| --- | --- | --- |
| mysqlOrmProvider | getList, getOne, getMany, create, update, deleteOne, custom | Core data hooks, useTableApi, MetadataForm, MetadataTable, settings pages |
| mysqlOrmAuthProvider | login, OTP, logout, identity, permissions, refresh, password flows | Auth hooks and FrameworkProvider |
| AccessProvider | can(action, resource) | useCan and conditional UI |
| ResourceProvider | Merged resources, browser routes, nav visibility, readiness | AppLayout, route guard, page hooks |
| ThemeProvider | Resolved appearance, mode, toggle, Ant tokens, CSS variables | All Ant Design components and custom CSS |

## State ownership

| State type | Owner | Examples |
| --- | --- | --- |
| Remote server state | TanStack React Query | Lists, records, bootstrap, auth metadata |
| Authentication state | authStore (Zustand) | User, token presence, roles, permissions, authorized resources |
| Resource registry | ResourceProvider Zustand store | Resource definitions, browser routes, readiness |
| Bootstrap values | values-store | admin_resources, permissions, ui_settings (table metadata is cached per table by React Query) |
| Persistent browser data | useLocalForage | Optional offline caches and preferences |
| Component interaction | Local React state | Drawers, forms, selections, filters |

## Hook families

| Family | Hooks | Use |
| --- | --- | --- |
| Core data | useList, useOne, useMany, useCreate, useUpdate, useDelete, useCustom | Provider-aligned CRUD with React Query |
| Core auth/access | useLogin, useLogout, useIdentity, usePermissions, useCan, useRouteGuard | Identity and permission-aware experiences |
| Records | MetadataForm, MetadataTable, MetadataFields, useTableMetadata, useRecordForm (thin wrapper), useDynamicForm, useUpload, useTextEditor | Metadata-driven lists, create/edit forms and specialized fields |
| Tables | useTableApi plus useTableState/useTableQuery/useTableColumns/useRowSelection | Online/offline listing, filters, sorting, columns, selections |
| Layout | useSider, useTheme, useDrawer, useModal, useDraggable | Workspace composition and interaction containers |
| Utilities | useBootstrap, useLocalForage, useNotification, useIcons, useStatistics, useChart | Startup data, persistence, feedback, and presentation |

## Route policy

- App.jsx declares the React component for each browser path.
- admin_resources declares whether the route exists in the runtime registry, whether it is public, and whether it appears in navigation.
- auth_user returns the current user’s allowed resources. FrameworkProvider intersects private browser routes with that response.
- SuperAdmin and dev receive all registered routes. Authenticated-public routes such as Profile are available without a role-resource assignment.
- show_in_nav controls visibility only; it does not grant or revoke access.

:::note Appearance scope
Public pages use the public appearance scope. /admin pages use the database-managed workspace appearance. ThemeProvider maps the resolved document into both Ant Design tokens and CSS variables so AntD, Tailwind, and vanilla CSS remain visually consistent.
:::

```jsx Provider-first list example
const query = useList({
  resource: 'admin_roles',
  pagination: { current: 1, pageSize: 20 },
  filters: { status: 'active' },
});

if (query.isLoading) return <Spin />;
return <CustomTable dataSource={query.data?.data} />;
```
