---
id: app-setup
title: App setup and registries
track: reference
group: Package reference
order: 0.6
eyebrow: FrameworkApp, providers, registries
audience: Frontend developers
readTime: 10 min
summary: The UI package's setup surface: FrameworkApp and its config, the providers and their contracts, your own field types and form layouts, the metadata helpers, errors, and the shared clients.
---

## FrameworkApp

The whole app in one component: providers, the sign-in pages, /docs, the /admin layout and the framework's admin pages. A project renders it once from main.jsx.

| Prop | What it does |
| --- | --- |
| config | Runtime settings (below) |
| routes | Route elements inside /admin, with relative paths ("invoices" is /admin/invoices) |
| publicRoutes | Route elements outside sign-in, with full paths ("/pricing") |
| resources | Your resources for { resource, action } permission checks; Users and Roles are built in. Optional |
| dataProvider / authProvider | Replace the MySQL ORM providers (contracts below). Default: mysqlOrmProvider(config.apiUrl), mysqlOrmAuthProvider() |

How public and admin pages behave, and why an /admin page needs a BROWSER_ROUTE row, is on Use the UI package.

## config

| Key | Default | Used by |
| --- | --- | --- |
| apiUrl | the page's own address | apiClient, the data provider, the access-change stream |
| socketUrl | apiUrl | Socket.IO |
| googleClientId | — | Google sign-in |
| mapProvider | "mapbox" | MapView, LocationPicker and DirectionsMap, unless you pass their provider prop |
| mapboxAccessToken | — | Mapbox maps, routes, addresses |
| googleMapsApiKey / googleMapId | — / "DEMO_MAP_ID" | Google Maps |

FrameworkApp applies config before anything renders. Code that runs outside React before the app (a script that calls the API at start) calls configureFramework(config) itself; frameworkConfig is the current value. Unknown keys and undefined values are ignored.

## Providers

FrameworkApp mounts these for you. Mount them yourself only when you compose your own app shell.

| Export | What it is |
| --- | --- |
| FrameworkProvider | dataProvider, authProvider and resources props; loads the user's permissions and pages after sign-in and provides React Query |
| ThemeProvider | Light/dark and the saved Appearance; read it with useTheme |
| SocketProvider | Connects Socket.IO while someone is signed in |
| mysqlOrmProvider(apiUrl) | The data provider for the framework server |
| mysqlOrmAuthProvider() | The auth provider for the framework server |

## Your own data or auth provider

A provider is an object of async functions. FrameworkProvider checks the methods when it starts and throws "[Framework] dataProvider is missing required method: …" for a missing one.

| Provider | Required methods |
| --- | --- |
| dataProvider | getList({ resource, pagination, filters, sorters, meta }), getOne({ resource, id }), getMany({ resource, ids }), create({ resource, variables }), update({ resource, id, variables }), deleteOne({ resource, id }), custom({ url, method, payload, headers, unwrap }) |
| authProvider | login, logout, checkAuth, getIdentity, getPermissions, refreshToken, forgotPassword, resetPassword, changePassword |

Reuse the normalized shapes the data hooks expect: getList returns { data: rows, total }, getOne { data: record }. Wrapping mysqlOrmProvider is easier than writing one from scratch:

```jsx Log every create
const base = mysqlOrmProvider(import.meta.env.VITE_API_URL)
const dataProvider = {
  ...base,
  create: async (params) => {
    console.info('create', params.resource)
    return base.create(params)
  },
}
// <FrameworkApp config={config} dataProvider={dataProvider} />
```

## Your own field types

Every metadata field type, built-in or yours, is one definition in a registry. Register yours once, before the app renders (for example in main.jsx); then a field with that type in the metadata uses it in forms and tables.

```jsx A colour field
import { registerFieldType } from '@msql-antd/framework-ui'
import { ColorPicker } from 'antd'

registerFieldType('color', {
  input: ({ disabled }) => <ColorPicker disabled={disabled} showText />,
  fromForm: (value) => (typeof value === 'string' ? value : value?.toHexString()),
  cell: (value) => <span style={{ background: value, padding: '0 10px' }}>{value}</span>,
})
```

| Key | What it does |
| --- | --- |
| input({ field, table, disabled, placeholder, lookupDependsOn }) | The control; Form.Item gives it value and onChange |
| toForm(stored, field) / fromForm(formValue, field) | Converts between the stored value and the form value. Default: unchanged |
| cell(value, record, field) | How the value shows in MetadataTable |
| fullWidth | Always spans the whole row |
| createDefault() | Value for a new record when the field has no default |
| renderItem({ field, disabled, required }) | Renders its own Form.Item tree instead of input (list and groupList use this) |

getFieldType(type) returns a definition (text when the type is unknown). Built-in types: text, textarea, richText, email, phone, url, password, number, integer, percent, duration, money, select, radio, multiSelect, checkboxGroup, lookup, multiLookup, switch, date, dateTime, time, image, file, icon, list, groupList, generatedId. Registering a built-in name replaces it everywhere. A new type also needs the server to accept it (the builder's field types and storage); see Metadata-driven forms › Extending it.

## Your own form layout

registerFormLayout(name, Component) replaces how MetadataForm lays out its sections; getFormLayout(name) reads one. The built-in "steps" layout is StepsLayout. A layout receives { metadata, sections, renderSection, form, mode, saving, submitText, singular, onCancel, errorFields } and saves by calling form.submit().

## Metadata helpers

| Function | What it does |
| --- | --- |
| conditionMet(condition, values) | Evaluates a visibleWhen or requiredWhen condition: { field, equals }, { field, in: [...] }, { field, notEmpty: true }, { all: [...] }, { any: [...] }. No condition is true |
| isFieldRequired(field, values) | Required now: required = 1 or its requiredWhen holds, and the field is visible |
| fieldLabel(field) | The field's label (col_real_name), else its column name |
| primaryKeyOf(metadata) | The primary-key column, else "id" |

## Errors from the server

Every failed request from the data provider becomes a DataProviderError with statusCode, errorCode (the server's ERR_… code), details, isNetworkError and message.

```jsx Show a friendly message
try {
  await createInvoice.mutateAsync(values)
} catch (error) {
  message.error(getUserFacingErrorMessage(error))
}
```

getUserFacingErrorMessage({ errorCode, statusCode, isNetworkError }) returns a sentence a user can act on: a connection message for network errors, a known code's message, or a general one for 401, 403 and other statuses.

## Shared clients and access

| Export | What it is |
| --- | --- |
| apiClient | The axios instance: base URL from config.apiUrl, the access token on every request, one automatic token refresh on 401. Use it for endpoints the hooks do not cover |
| queryClient | The React Query client (30-second cache, one retry). Call queryClient.invalidateQueries after changing data outside the hooks |
| queryKeys | The cache keys the hooks use: queryKeys.lists("invoices"), queryKeys.one("invoices", id), queryKeys.custom(url, method, params) |
| useAuthStore | The signed-in user's store (zustand): useAuthStore((s) => s.user), s.roles, s.permissions, s.isAuthenticated |
| checkAccess({ resource, action, roles, permissions, resources, browserRoutes, isReady }) | The decision behind useCan, as a plain function: { can, reason } |
| isPrivilegedRole(roles) | true for SuperAdmin and dev |
| utils | The shared helpers; see UI utilities |

```jsx Refresh a list after your own request
await apiClient.post('/api/v1/invoices/close-month')
queryClient.invalidateQueries({ queryKey: queryKeys.lists('invoices') })
```
