---
id: ui-package
title: Use the UI package
track: build
group: Start a project
order: 0
eyebrow: @msql-antd/framework-ui
audience: Developers starting or upgrading a project
readTime: 6 min
summary: The whole browser side ships as one package. A project renders <FrameworkApp>, passes its settings, resources and pages, and keeps only its own screens.
---

## What the package contains

The browser side of the framework (providers, hooks, metadata forms and tables, the layout, the sign-in pages, the admin and settings pages, and these docs) is the package @msql-antd/framework-ui in packages/framework-ui. The repository's ui/ folder is now the example app that uses it: a main.jsx and two sample pages.

| Part | Where | Who changes it |
| --- | --- | --- |
| Framework source | packages/framework-ui/src | Framework releases only |
| Package entry | packages/framework-ui/src/index.js | Lists everything a project can import |
| The app shell | packages/framework-ui/src/FrameworkApp.jsx | Providers, framework routes, /admin layout |
| A project | its own main.jsx and pages | The project team |

## Start a project

```jsx main.jsx
import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Route } from 'react-router-dom'
import { FrameworkApp } from '@msql-antd/framework-ui'
import '@msql-antd/framework-ui/styles.css'

const Projects = lazy(() => import('./pages/Projects.jsx'))

const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  socketUrl: import.meta.env.VITE_SOCKET_URL,
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
}

const resources = [
  { name: 'projects', label: 'Projects', permissions: { list: 'read:projects', create: 'create:projects', edit: 'update:projects', delete: 'delete:projects' } },
]

const routes = (
  <>
    <Route index element={<Projects />} />
    <Route path="projects" element={<Projects />} />
  </>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FrameworkApp config={config} resources={resources} routes={routes} />
  </StrictMode>,
)
```

## FrameworkApp props

| Prop | What it does |
| --- | --- |
| config | Runtime settings, listed below. The package is built once, so it cannot read your .env; pass the values here |
| resources | Your resources. Users (admin) and Roles (admin_roles) are already included |
| routes | Route elements rendered inside /admin, next to the framework's pages. Give one an index route to choose the page after sign-in |
| publicRoutes | Route elements outside sign-in, next to /login and /docs |
| areas | More signed-in areas beside /admin, each with the same layout, sidebar and route guard: { finance: financeRoutes } serves /finance/… |
| dataProvider / authProvider | Replace the MySQL ORM providers. Leave them out to use mysqlOrmProvider(config.apiUrl) and mysqlOrmAuthProvider() |

## Areas beyond /admin

A page does not have to live under /admin. Name each extra area in areas, and give its pages paths relative to the area. Register each page as a BROWSER_ROUTE row with its full path (/finance/payroll); a short Path such as payroll always means /admin/payroll.

```jsx main.jsx: an /admin area and a /finance area
const adminRoutes = <Route path="invoices" element={<Invoices />} />

const financeRoutes = (
  <>
    <Route path="payroll" element={<Payroll />} />
    <Route path="budgets" element={<Budgets />} />
  </>
)

<FrameworkApp config={config} routes={adminRoutes} areas={{ finance: financeRoutes }} />
```

| Behaviour | /admin | Another area (/finance) |
| --- | --- | --- |
| Layout, sidebar, theme | AppLayout, the workspace theme | The same |
| Signed out | Sent to /login, then back to the page | The same |
| A page the user may not open | The 404 page | The same |
| The area's own address | /admin opens the user's first page by Sidebar Order | /finance opens the user's first page in /finance, or else their first page anywhere |
| The framework's own pages | Users, Roles, Settings … | Not repeated: they stay under /admin |

The sidebar lists every page the user may open, whatever its area, so one sidebar moves between /admin and /finance. Choose area names that do not clash with the framework's own paths (login, docs, 404) or your publicRoutes.

The sidebar is not a prop: it comes from the BROWSER_ROUTE rows in admin_resources, filtered by the signed-in user's permissions. Add the row, map its permission, and the link appears.

## config settings

| Key | Example app variable | Used by |
| --- | --- | --- |
| apiUrl | VITE_API_URL | apiClient, the data provider and the live access-change stream |
| socketUrl | VITE_SOCKET_URL | Socket.IO. Empty: the same address as apiUrl |
| googleClientId | VITE_GOOGLE_CLIENT_ID | Google sign-in |
| mapProvider | VITE_MAP_PROVIDER | mapbox (default) or google |
| mapboxAccessToken | VITE_MAPBOX_ACCESS_TOKEN | Mapbox maps, routes and reverse geocoding |
| googleMapsApiKey / googleMapId | VITE_GOOGLE_MAPS_API_KEY / VITE_GOOGLE_MAP_ID | Google Maps |

Code outside React can call configureFramework(config) before the first request.

## What a project can import

Everything a screen needs comes from the package root, for example:

```jsx Projects.jsx
import { PageHeader, MetadataTable, useList, useCan, utils } from '@msql-antd/framework-ui'
```

The entry exports the providers and their hooks, the data hooks (useList, useOne, useMany, useCreate, useUpdate, useDeleteOne, useCustom), the auth and access hooks, MetadataForm, MetadataFields, MetadataTable and StepsLayout, the field-type and form-layout registries, the layout and table components, the UI hooks (useRecordForm, useModal, useDrawer and the rest), apiClient, queryClient, queryKeys, useAuthStore and utils. Import nothing from packages/framework-ui/src directly: those paths are not part of the package and change between releases.

## One copy of React and antd

react, react-dom, antd, react-router-dom and @tanstack/react-query are peer dependencies. The project installs them once, and the package uses the project's copy. Two copies would break hooks, the antd theme and the shared query cache.

## Working on the framework itself

The repository is an npm workspace. From the root:

| Command | Does |
| --- | --- |
| npm install | Installs both packages and both example apps together |
| npm run dev | Starts the example API and UI together (npm run dev:ui for the UI alone). The UI runs the package from source, so framework edits reload at once |
| npm test | Runs both packages' tests |
| npm run build | Builds the package (dist/framework-ui.js and dist/framework-ui.css), then the example app |
