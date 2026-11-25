---
id: application-hooks-cookbook
title: Application hooks cookbook
track: build
group: Tutorials
order: 7
eyebrow: Higher-level UI behavior
audience: Frontend developers
readTime: 38 min
summary: Use cases and examples for the hooks in src/hooks, including tables, forms, overlays, persistence, layout, uploads, and visualization.
---

## Which hook should I choose?

| Need | Preferred hook | Notes |
| --- | --- | --- |
| Online or offline table | useTableApi | Composes state, query, columns, selection, and Ant Table props |
| List plus create/edit for a table | MetadataTable / MetadataForm | Built from the table's metadata; useRecordForm wraps MetadataForm for imperative pages |
| Repeatable JSON form fields | useDynamicForm | Standalone; a metadata repeater field type is planned |
| Reusable filter bar/drawer | useDynamicFilter | Builds values, controls, active count, and request filters |
| Controlled modal or drawer | useModal / useDrawer | Use when content is not a metadata record form |
| Upload field | useUpload | Metadata image/file fields upload through /api/v1/uploads instead |
| Permission administration | useAccessControl | Loads and saves users/permissions/routes by entity |
| Browser persistence | useLocalForage | IndexedDB-backed cache or offline data |
| Workspace shell | useSider | AppLayout owns the production instance |
| Theme values | useTheme | Never parse layout.sider independently in a page |
| Charts/calendar/masonry | useChart / useCalendar / useMasonry | Presentation helpers for dashboards |
| Icons and feedback | useIcons / useNotification | Registry icon resolution and consistent messages |
| Legacy direct request | useApi / useDelete | Prefer core provider hooks for new code |

```jsx Tutorial: online useTableApi
const table = useTableApi(
  { pagination: { current: 1, pageSize: 20 } },
  { manual: false },
  'id',
  {
    table: 'projects',
    searchable: ['name', 'code'],
  },
);
const columns = [
  { title: 'Project', dataIndex: 'name', sorter: true },
  { title: 'Status', dataIndex: 'status' },
];

return <>
  <Input.Search onSearch={table.handleGlobalSearch} />
  <Table {...table.tableProps} columns={columns} />
</>;

// Server mode sends pagination/filter/sort state through the provider.
```

```jsx Tutorial: offline useTableApi
const table = useTableApi({}, { manual: true }, 'id');

useEffect(() => {
  table.setRecord(cachedRows); // any array activates offline processing
}, [cachedRows]);

// Search, filters, sorting, and pagination now run in memory.
// table.setRecord(null) returns the hook to API mode.
```

```jsx Tutorial: a complete metadata page
// List, search, add, edit and delete, all from the table's metadata.
<PageHeader title="Projects">
  <MetadataTable table="projects" />
</PageHeader>

// Imperative variant when the page owns its own table:
const form = useRecordForm();
const create = () => form.openCreate('projects', { status: 'active' });
const edit = (row) => form.openEdit('projects', row, row.id);
{form.recordModal({ createTitle: 'Add project', editTitle: 'Edit project', onOk: () => form.save() })}
```

```jsx Tutorial: reusable dynamic filters
const filters = useDynamicFilter({
  variant: 'horizontal',
  filters: [
    { key: 'status_in', type: 'select', label: 'Status', options: statusOptions },
    { key: 'created_at', type: 'dateRange', label: 'Created' },
    { key: 'amount', type: 'range', label: 'Amount', range: [0, 10000] },
  ],
  onChange: (requestFilters) => table.setFilters(requestFilters),
});

return <>{filters.horizontalBarJSX}<Table {...table.tableProps} /></>;

// Use filters.sidebarJSX for a trigger + drawer, or inlineSidebarJSX for a panel.
```

```jsx Tutorial: modal and drawer composition
const modal = useModal({ title: 'Review changes', width: 640 });
const drawer = useDrawer({ title: 'Project details', width: 520 });

<Button onClick={() => modal.openModal({ content: <Review /> })}>Review</Button>
<Button onClick={() => drawer.openDrawer({ content: <ProjectDetails /> })}>Details</Button>
{modal.modalJSX()}
{drawer.drawerJSX()}

// Keep business state in the page; overlays own visibility and framing.
```

```jsx Tutorial: LocalForage cache
const cache = useLocalForage({ name: 'budget-manager', storeName: 'projects' });

await cache.setItem('recent', rows);
const recent = await cache.getItem('recent');
await cache.updateItem('preferences', { pageSize: 50 });
await cache.deleteItem('recent');

// Handle cache.loading/cache.error. Never store access tokens or assume cached ACL data is authoritative.
```

## Specialized hook catalog

| Hook | Typical use | Important output |
| --- | --- | --- |
| useNotification | Messages, alerts, confirmations | message plus AlertJsx/notification helpers |
| useIcons | Database icon names | resolveIcon, iconMap, iconNames |
| useTheme | Current resolved public/workspace design | appearance, mode, isDark, toggle |
| useGlobalSelect | Legacy database-backed select | Select JSX/options; prefer structured lookups in new metadata forms |
| useTextEditor | Rich-text field | editor, content, getContent, setContent, editorChanged/isDirty, markClean, reset, editorRef |
| useDraggable | Draggable Ant modal | drag(modal), draggableTitleProps |
| useScrollToTop | Reset scroll on navigation | Side effect only |
| useChart | Recharts dashboard composition | Chart factories/config helpers |
| useCalendar | Ant calendar variants | calendar JSX/config and selected value state |
| useMasonry | Responsive card/image grids | grid JSX, item helpers, layout options |
| useStatistics | Not implemented | The file is currently empty; do not import it until an API and tests are added |
| useBootstrap | Compatibility shim | Bootstrap is now owned by FrameworkProvider |

:::note Stable versus specialized
Core hooks, MetadataForm/MetadataTable and useTableApi are framework contracts. Visualization, legacy request, and domain hooks are conveniences whose API may evolve. Wrap specialized behavior in your own feature component when multiple pages depend on it.
:::
