---
id: end-to-end-project-tutorial
title: End-to-end feature tutorial
track: build
group: Tutorials
order: 4
eyebrow: From migration to production page
audience: Full-stack developers
readTime: 30 min
summary: Build a Projects feature through schema, metadata, ACL, provider configuration, page composition, forms, tables, and verification.
---

## Feature delivery path

:::flow
- Migration
- Metadata
- ACL resources
- Permissions
- UI resource
- Browser route
- Table + form page
- Tests
- Documentation
:::

## 1. Database and metadata

1. **Create projects** — Use the migration from Backend tutorials and apply it through npm run migrate.
2. **Describe the table** — Settings › Data model › Describe. Check the guessed types: status becomes a select from the ENUM, timestamps read-only, id the primary key.
3. **Add a lookup if needed** — For owner_id, create a lookup (source admin, value custom_id, label name) and point the field at it.

```json What the builder saves
[
  { "column_name": "name", "col_real_name": "Project name", "type": "text", "required": 1, "rank": 1 },
  { "column_name": "code", "col_real_name": "Reference code", "type": "text", "required": 1, "rank": 2,
    "config": { "rules": [{ "rule": "pattern", "value": "^[A-Z0-9-]{3,30}$" }] } },
  { "column_name": "status", "col_real_name": "Status", "type": "select", "rank": 3,
    "config": { "options": [{ "value": "active", "label": "Active" }, { "value": "archived", "label": "Archived" }], "display": "chips" } }
]
```

## 2. Access control

1. **Register endpoints** — Create API_RESOURCE rows for GET /api/projects/table, POST /api/projects, PUT /api/projects/:id, and DELETE /api/projects/:id.
2. **Register the page** — Create a BROWSER_ROUTE for /admin/projects with icon, category, order, show_in_nav=1, and is_public=0.
3. **Map permissions** — Map read/create/update/delete:projects to their endpoints and read:projects to the browser route.
4. **Assign roles** — Give project managers the required permissions, then verify a baseline User cannot access the page.

```jsx 3. Register the UI resource
// main.jsx: one entry of <FrameworkApp resources={[...]}>
{
  name: 'projects',
  label: 'Projects',
  permissions: {
    list: 'read:projects',
    create: 'create:projects',
    edit: 'update:projects',
    delete: 'delete:projects',
  },
  meta: {
    mysql: { tableConfig: { searchable: ['name', 'code'] } },
  },
}
```

```jsx 4. Compose the page
export default function Projects() {
  // Columns, search, add/edit/delete and permission checks come from the
  // metadata and the user's create/update/delete:projects permissions.
  return (
    <PageHeader title="Projects" description="Manage active and archived projects.">
      <MetadataTable
        table="projects"
        columns={{ status: { render: (value) => <Tag>{value}</Tag> } }}
      />
    </PageHeader>
  );
}
```

## 5. Register and verify the browser route

1. **Add the route** — In main.jsx, import Projects and add <Route path="projects" element={<Projects />} /> to the routes you pass to <FrameworkApp>; they render inside /admin.
2. **Refresh bootstrap** — Sign out/in or invalidate bootstrap after inserting admin_resources metadata.
3. **Verify navigation** — The link appears by display_order only for authorized users when show_in_nav=1.
4. **Verify direct access** — show_in_nav=0 hides the link but the route still works for an assigned user.

## 6. Acceptance checklist

| Scenario | Expected result |
| --- | --- |
| Project manager opens /admin/projects | Page and list load |
| Baseline User opens the path | Guard denies the private route |
| Create valid project | Record saved, modal resets, list refetches |
| Duplicate code | Friendly conflict message; technical details in Network/logs |
| Edit project | Only metadata-writable, non-primary fields are sent |
| Role removed during session | Authorization event refreshes access and route is removed |
| Mobile viewport | Header actions, table overflow, form modal remain usable |

:::note Definition of done
A feature is not complete when its page renders. It is complete when schema, metadata, server authorization, UI permission behavior, loading/error/empty states, cache invalidation, tests, operations, and documentation agree.
:::
