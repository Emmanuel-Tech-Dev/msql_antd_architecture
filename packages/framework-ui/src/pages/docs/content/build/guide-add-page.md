---
id: guide-add-page
title: Add a page to the sidebar
track: build
group: Pages and navigation
order: 0.71
eyebrow: Guide
audience: Developers and administrators
readTime: 6 min
summary: Put your own page inside the signed-in area, give it a sidebar link, and decide which roles can open it.
---

## When to use this

Use this guide for any page behind sign-in, such as /admin/invoices: a list, a dashboard, a report. The page appears in the sidebar for the roles you choose, and anyone else who types its address sees the 404 page ("The page does not exist or is not available for your account.").

| You want | Use instead |
| --- | --- |
| A page anyone can open without signing in (pricing, a public form) | Add a public page |
| A page that opens from a link or button but has no sidebar entry (a detail page) | This guide, with Show in navigation set to Hide |
| To hide a button, not a whole page | Hide or show buttons by permission |

## Before you begin

- A project running locally (Create a project).
- You are signed in as SuperAdmin or dev, or a role that may edit Resources and Roles.
- Decide the page's address. It must start with /admin/; this guide uses /admin/invoices.

## Steps

1. **Create the page component** — In ui/src/pages, add the React component. A list page from a table's metadata is one line inside PageHeader.
2. **Add the route** — In ui/src/main.jsx, add a Route to the routes you pass to FrameworkApp. Its path is relative to /admin, so "invoices" serves /admin/invoices.
3. **Register the page** — In the app, open Resources › Resource catalogue › Add resource and create a BROWSER_ROUTE row (the fields are in the table below), then save.
4. **Give it to a role** — Open Roles, choose Configure access on the role, open the Navigation access tab, switch the page on, and press Save role policy.
5. **Give the role the page's data** — The page and its API calls are granted separately. If the page reads a table, give the same role read access to it (Give a role access to a table).

```jsx 1. ui/src/pages/Invoices.jsx
import { PageHeader, MetadataTable } from '@msql-antd/framework-ui'

export default function Invoices() {
  return (
    <PageHeader title="Invoices" description="Issued, paid and overdue invoices.">
      <MetadataTable table="invoices" />
    </PageHeader>
  )
}
```

```jsx 2. ui/src/main.jsx
import { lazy } from 'react'
import { Route } from 'react-router-dom'

const Invoices = lazy(() => import('./pages/Invoices.jsx'))

const routes = (
  <>
    <Route path="invoices" element={<Invoices />} />
  </>
)

// <FrameworkApp config={config} routes={routes} />
```

| Field in Add resource | Value | What it does |
| --- | --- | --- |
| Resource Name | Invoices | The label in the sidebar and on the Navigation access tab. Must be unique |
| Type | BROWSER_ROUTE | A page (API_ENDPOINT is for server routes) |
| Path | /admin/invoices | Exactly the address from step 2, with /admin in front |
| HTTP Method | ALL | Not used for pages; leave ALL |
| Icon | FileTextOutlined | The sidebar icon (any Ant Design icon name) |
| Sidebar Order | 20 | Lower numbers come first |
| Show in navigation | Show | Hide keeps the page reachable by address but out of the sidebar |
| Public Access | No | Yes gives the page to every signed-in user, without a role |
| category | Billing | Groups pages in the sidebar when grouping is on in Appearance; Administration is always placed last |

## Check that it works

1. **As the administrator** — Reload: Invoices is in the sidebar (SuperAdmin and dev see every registered page).
2. **As a member of the role** — Sign in with a user who has the role. The link appears without signing out if they were already signed in, because access changes are pushed to open browsers.
3. **As someone without the role** — The link is missing, and typing /admin/invoices shows the 404 page.

## Common problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| The link appears but the page is blank or shows a 403 error | The role can open the page but not its data | Give the role read access to the table (Give a role access to a table) |
| The 404 page for a user who has the role | The Path in Resources does not match the route exactly | Make the Path /admin/ plus the route's path, with no trailing slash |
| The page opens but has no sidebar link | Show in navigation is Hide | Edit the resource and set Show |
| Only SuperAdmin sees the page | The page is not switched on for any role | Roles › Configure access › Navigation access, then Save role policy |
| A blank screen even for SuperAdmin | The route is missing from main.jsx, or the component failed to load | Check the routes passed to FrameworkApp and the browser console |
| Opening /admin goes to another page | /admin opens the user's first permitted page by Sidebar Order | Give the page a lower Sidebar Order to make it the first |

## Related

- Show a table as a list page: MetadataTable, its columns and its form.
- Give a role access to a table: the data permissions this page needs.
- Protect your own API route: for pages that call your own server routes.
- Use the UI package: routes, publicRoutes and the other FrameworkApp props.
