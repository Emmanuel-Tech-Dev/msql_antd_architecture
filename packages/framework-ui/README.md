# @msql-antd/framework-ui

The React and Ant Design side of the msql-antd framework. It includes:
- providers and hooks for data, sign-in and access;
- metadata-driven forms and tables;
- the admin and settings pages;
- the in-app documentation.

It pairs with [@msql-antd/framework-server](../framework-server).

## Install

The packages are private on GitHub Packages. Create a GitHub token (classic) with `read:packages`, set it as `GITHUB_TOKEN`, and add this to the `.npmrc` in your home folder or project:

```
@msql-antd:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

To start a new project with everything set up, run `npm init @msql-antd my-project`. To add the package to an existing app:

```bash
npm install @msql-antd/framework-ui react react-dom antd react-router-dom @tanstack/react-query
```

`react`, `react-dom`, `antd`, `react-router-dom` and `@tanstack/react-query` are peer dependencies, so your app has exactly one copy of each.

## Use

```jsx
import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Route } from 'react-router-dom'
import { FrameworkApp } from '@msql-antd/framework-ui'
import '@msql-antd/framework-ui/styles.css'

const Invoices = lazy(() => import('./pages/Invoices.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FrameworkApp
      config={{ apiUrl: import.meta.env.VITE_API_URL }}
      routes={<Route path="invoices" element={<Invoices />} />}
    />
  </StrictMode>,
)
```

`routes` render inside `/admin` with the sidebar layout. `publicRoutes` render outside sign-in. Each admin page also needs a BROWSER_ROUTE row (Settings › Resources) and a role that holds it.

```jsx
import { PageHeader, MetadataTable, useList, useCan, utils } from '@msql-antd/framework-ui'

export default function Invoices() {
  return (
    <PageHeader title="Invoices" description="Issued, paid and overdue invoices.">
      <MetadataTable table="invoices" />
    </PageHeader>
  )
}
```

## What it exports

| Group | Exports |
| --- | --- |
| App | `FrameworkApp`, `configureFramework`, `frameworkConfig`, the providers |
| Data hooks | `useList`, `useOne`, `useMany`, `useCreate`, `useUpdate`, `useDeleteOne`, `useCustom`, `useCustomMutation` |
| Sign-in and access | `useLogin`, `useLogout`, `useIdentity`, `usePermissions`, `useCan`, `Can`, `PageLink` and more |
| Metadata | `MetadataForm`, `MetadataTable`, `MetadataFields`, `StepsLayout`, `registerFieldType`, `registerFormLayout` |
| Components | `PageHeader`, `CustomTable`, `RichTextEditor`, `MapView`, `LocationPicker`, `DirectionsMap` and more |
| UI hooks | `useRecordForm`, `useTableApi`, `useModal`, `useDrawer`, `useNotification`, `useUpload` and more |
| Shared | `apiClient`, `queryClient`, `queryKeys`, `useAuthStore`, `utils` |

Every export has its props and examples in the in-app documentation at `/docs`, under **Reference › Package reference**.

## Develop

This package lives in the [msql_antd_architecture](https://github.com/msql-antd/msql_antd_architecture) workspace. From the repository root, `npm run dev` runs the example app on the package's source, `npm test` runs the tests, and `npm run build` builds `dist/`.
