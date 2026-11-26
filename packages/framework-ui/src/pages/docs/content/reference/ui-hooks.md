---
id: ui-hooks
title: UI hooks
track: reference
group: Package reference
order: 0.1
eyebrow: Hooks from @msql-antd/framework-ui
audience: Frontend developers
readTime: 14 min
summary: Every hook the UI package exports: what to pass, what you get back, and where its full guide is. Data, sign-in, access, metadata, forms, tables, overlays, storage, charts and the editor.
---

## Import

```jsx Any page or component
import { useList, useCreate, useCan, useRecordForm } from '@msql-antd/framework-ui'
```

Hooks follow React's rules: call them at the top of a component, never inside a condition or loop. All of them must run inside <FrameworkApp> (or FrameworkProvider), because they read its providers and cache.

## Data hooks

These talk to the data provider (mysqlOrmProvider by default) through React Query. Reads are cached for 30 seconds and retried once; window focus does not refetch. Writes refresh the matching lists by themselves.

| Hook | Pass | You get |
| --- | --- | --- |
| useList({ resource, pagination, filters, sorters, meta, cacheKey, queryOptions }) | resource: the table; pagination { current, pageSize }; filters; sorters; meta.mysql.tableConfig for a custom endpoint or search | A React Query result: data = { data: rows, total }, isLoading, isFetching, error, refetch |
| useOne({ resource, id, meta, queryOptions }) | Waits until id is set | data = { data: record } |
| useMany({ resource, ids, meta, queryOptions }) | Waits until ids has items | data = { data: rows } |
| useCreate({ resource, meta, mutationOptions }) | — | mutate(values) / mutateAsync(values), isPending, error. Refreshes resource's lists |
| useUpdate({ resource, meta, mutationOptions }) | — | mutate({ id, variables }). Refreshes the lists and that record |
| useDeleteOne({ resource, meta, mutationOptions }) | — | mutate(id). Refreshes the lists and forgets that record |
| useCustom({ url, method = "get", payload, headers, unwrap, meta, queryOptions }) | Any endpoint, relative to config.apiUrl. unwrap: true returns the body's data | A cached query |
| useCustomMutation({ mutationOptions }) | — | mutate({ url, method = "post", payload, headers, unwrap }) for any endpoint |

```jsx Read, then save
const { data, isLoading } = useList({ resource: 'invoices', pagination: { current: 1, pageSize: 20 }, filters: { status: 'open' } })
const createInvoice = useCreate({ resource: 'invoices', mutationOptions: { onSuccess: () => message.success('Saved') } })

createInvoice.mutate({ customer_id: 7, total: 450 })
```

The query contract (filters, sorting, paging) and the normalized responses are on Tables and data access; a worked example of each hook is in the Core hooks tutorial.

## Sign-in hooks

All are mutations (call mutate or mutateAsync) except useIdentity and usePermissions.

| Hook | mutate with | Does |
| --- | --- | --- |
| useLogin() | { identifier or email, password } as the sign-in page sends | Signs in and loads the user's roles and permissions |
| useGoogleLogin() | { idToken } from Google | Signs in with Google |
| useLogout() | nothing | Signs out and clears the session |
| useRegister() | the new account's fields | Creates an account (when sign-up is enabled) |
| useForgotPassword() | { email } | Sends the reset email |
| useResetPassword() | { token, password } | Sets a new password from the email's link |
| useChangePassword() | the current and new password, as the profile page sends | Changes the signed-in user's password |
| usePermissions() | — | Returns { user, roles, permissions, resources } for the signed-in user, straight from the store (no request) |
| useIdentity() | — | { user, isLoading, error }: the signed-in user from the auth provider, read again when someone signs in or out; user is null while signed out |

Every mutation accepts { mutationOptions } (onSuccess, onError…) like the data hooks.

## Access hooks

| Hook | Pass | You get |
| --- | --- | --- |
| useCan(request) | A permission name ("update:invoices"), or { resource, action } | true or false. False until the access registry has loaded; always true for privileged roles (SuperAdmin, dev) |
| useRouteGuard(loginPath = "/login") | — | { isAllowed, isReady, target }, and redirects to target when the page is not allowed. AppLayout already uses it for /admin |
| useFramework() | — | { dataProvider, authProvider, accessProvider, resourceProvider, queryClient }: the framework's services in one object. Throws outside FrameworkProvider |
| useDataProvider() / useAuthProvider() / useAccessProvider() | — | The provider objects themselves, for calls outside the hooks above |
| useResource(name) | A resource name | That resource's entry from <FrameworkApp resources> |
| useBrowserRoutes() / useNavigationRoutes() | — | The signed-in user's pages from BROWSER_ROUTE rows / the ones shown in the sidebar |
| useResourcesReady() | — | true once the user's pages and permissions have loaded |
| useResourceProvider() | — | { getResource(name), getBrowserRoutes(), isReady() }: reads the registry when called (not reactive). In components, useResource, useBrowserRoutes and useResourcesReady re-render on changes |
| isRouteVisibleInNav(route) | A BROWSER_ROUTE row | true when its show_in_nav is on (a plain function, not a hook) |

useCan with a name is the usual form. The { resource, action } form looks the permission up in <FrameworkApp resources>, so it is false for a resource that is not listed there.

## Metadata hooks

| Hook | Pass | You get |
| --- | --- | --- |
| useTableMetadata(table) | A table name | The table's metadata (table settings, sections, fields), cached |
| useLookupOptions(lookupKey, { dependsOn, parent }) | A metadata lookup; with dependsOn, waits until parent has a value | data = [{ value, label }], cached for a minute |

Registries for your own field types and form layouts (registerFieldType, getFieldType, registerFormLayout, getFormLayout) are on App setup and registries.

## Form and table hooks

| Hook | Pass | You get | Full guide |
| --- | --- | --- | --- |
| useRecordForm() | — | openCreate(table, initialValues), openEdit(table, record), and recordModal({ createTitle, editTitle, okText, width, onSubmit, …antd Modal props }) which returns the modal to render; plus mode, isEditing and save | Metadata-driven forms |
| useDynamicForm(formName, itemToCreate, submitBtnDetails, onFinish, showFormAddBtn = true, type = "default") | The older form builder from field descriptions | Its form, fields and submit wiring | Filters, feedback, storage, and utility hooks |
| useTableApi(initParams, reqOptions, rowKey = "id", tableConfig) | Starting paging, filters and sorting; { manual } to wait; the table and its options | Everything CustomTable needs: record, loading, tableProps, search, filters, selection, runRequest, setRecord for offline data | Application hooks cookbook |
| useDynamicFilter(config) | The filters to show | A filter bar and its current values | Filters, feedback, storage, and utility hooks |
| useGlobalSelect(column, table, multi = false, groupBy = null) | A column and table to offer as choices | A select bound to that column's values | Filters, feedback, storage, and utility hooks |
| useDelete({ resource }) | The table | confirm(id, title, element, callback) renders a Popconfirm around element that deletes on Yes; deleteRecord(id, callback) deletes straight away; loading. Lists refresh after a delete | Filters, feedback, storage, and utility hooks |
| useUpload() | — | Upload state and handlers for antd Upload | Filters, feedback, storage, and utility hooks |
| useApi(method = "get", url, options) | Any endpoint | { data, loading, error, run }: for "get", run() refetches; for other methods, run(payload) sends the request | Filters, feedback, storage, and utility hooks |

## Overlay, feedback and layout hooks

| Hook | You get | Full guide |
| --- | --- | --- |
| useModal(config) | A modal you open and close from code, and its element to render | Layout and overlay hooks |
| useDrawer(config) | The same for a side drawer | Layout and overlay hooks |
| useNotification() | Success, error, warning and info messages in the framework's style | Filters, feedback, storage, and utility hooks |
| useTheme() | { isDark, mode, toggle, preference, followsSystem, clearPreference, scope, isWorkspace, appearance }: light/dark state and the saved Appearance settings | Layout and overlay hooks |
| useIcons(extraIcons) | The icon set used for sidebar and section icons, as name → component | Filters, feedback, storage, and utility hooks |

## Storage, charts, calendar and editor

| Hook | You get | Full guide |
| --- | --- | --- |
| useLocalForage(storeConfig) | A key-value store in the browser (IndexedDB through localforage) | Filters, feedback, storage, and utility hooks |
| useChart(defaultOptions) | Chart helpers built on recharts | Charts, calendars, and masonry |
| useCalendar(variant = "basic", options) | A calendar view in several variants | Charts, calendars, and masonry |
| useTextEditor(options) | The rich-text editor as a hook, when you need the editor instance yourself | Filters, feedback, storage, and utility hooks |

For most pages the RichTextEditor component is simpler than useTextEditor (see UI components).

## Layout, table parts and other hooks

| Hook | Pass | You get |
| --- | --- | --- |
| useSider(initConfig, liveConfig) | The sidebar's menu and layout settings | { collapsed, toggle, onCollapse, setCollapsed, setHeaderItems, layoutJSX }: the layout AppLayout is built from; see Layout and overlay hooks |
| useMap({ provider, center, zoom, markers, route, behaviors, providerOptions }) | The same options as MapView | { containerRef, actions, status, isReady, error, provider }: put containerRef on your own element; MapView is this hook with a ready-made box |
| useMasonry(variant = "basic", options) | A masonry grid variant | { items, loading, error, selectedItem, layout, setItems, … }; see Charts, calendars, and masonry |
| useDraggable() | — | { drag, draggableTitleProps }: wrap a modal with modalRender={drag} and put draggableTitleProps on a div in its title, so people can drag it by the title |
| useScrollToTop() | — | Nothing: every new page opens at the top. Call it once in a layout |
| useTableState(initParams) | Starting paging, search, filters, sorting | { tableParams, updateParams, resetParams, setPage, setSearch, setFilters, setSorter } |
| useTableQuery({ tableParams, tableConfig, queryOptions }) | The state above and { table } or { endpoint } (neither: the rows you give are paged in the browser) | { record, pagination, meta, isLoading, error, refetch, isClientSide } |
| useTableColumns({ isClientSide, tableParams, updateParams }) | — | getColumnSearchProps(dataIndex), getColumnFilterProps(dataIndex, table, offlineData), setColFilters, clearAllFilters |
| useRowSelection() | — | selectedRowKeys, selectedRows and their setters, selectionType, allowSelection |

useTableApi combines the four table parts; use them one by one only when you build an unusual table.

## Not exported

useBootstrap (deprecated: FrameworkProvider loads startup data), useAccessControl (internal to the role and permission screens) and useStatistics (an empty file) stay inside the package.
