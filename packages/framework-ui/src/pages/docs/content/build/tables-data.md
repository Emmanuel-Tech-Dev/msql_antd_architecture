---
id: tables-data
title: Tables and data access
track: build
group: Data and screens
order: 3
eyebrow: useTableApi + provider contracts
audience: Developers
readTime: 16 min
summary: Online/offline tables, query parameters, column policy, mutations, normalized responses, and invalidation.
---

Table behavior is split into focused hooks. useTableState owns interaction state; useTableQuery translates it into provider requests; useTableColumns builds Ant Design columns; useRowSelection owns selection; useTableApi composes the public experience and can use remote or LocalForage-backed data.

## Query contract

| UI input | HTTP representation | Server behavior |
| --- | --- | --- |
| pagination.current / pageSize | page / limit | Bounded pagination with total metadata |
| search | search | LIKE across configured searchable columns or full-text search |
| sorter.field / order | sort_by / sort_order | Validated physical column and asc/desc |
| exact filter | column=value | Validated equality |
| ranges | column_min / column_max | >= and <= |
| sets | column_in / column_not_in | IN and NOT IN |
| partial text | column_like | Parameterized LIKE |

## Normalized provider responses

- List operations return { data, total, pagination, meta, raw }.
- Record operations return { data, raw }.
- DataProviderError carries a user-facing message, statusCode, errorCode, details, technicalMessage, and original cause.
- The Axios interceptor refreshes expired access tokens once and queues concurrent 401 requests behind the same refresh.

```jsx Configured table resource
const resources = [{
  name: 'projects',
  label: 'Projects',
  permissions: {
    list: 'read:projects',
    create: 'create:projects',
    edit: 'update:projects',
    delete: 'delete:projects',
  },
  meta: {
    mysql: {
      tableConfig: { searchable: ['name', 'reference'] },
    },
  },
}];
```

:::note Online/offline boundary
Offline storage improves availability but does not replace server authorization or conflict resolution. Treat LocalForage data as a client cache. Revalidate protected changes with the server when connectivity returns.
:::

## Table production checklist

- Use stable rowKey values from the database primary key.
- Keep filters and sort fields within real, non-sensitive table columns.
- Represent loading, empty, error, and permission-denied states distinctly.
- Invalidate all affected query keys after mutations.
- Keep destructive actions explicit, confirmed, and permission-gated.
