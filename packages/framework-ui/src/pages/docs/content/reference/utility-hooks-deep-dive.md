---
id: utility-hooks-deep-dive
title: Filters, feedback, storage, and utility hooks
track: reference
group: Hooks
order: 4
eyebrow: Remaining hook reference
audience: Frontend developers
readTime: 28 min
summary: Detailed use cases for dynamic filters, notifications, icons, offline storage, global lookup selects, uploads, rich text, access assignment, route scrolling, and legacy hooks.
---

## Choose the correct utility hook

| Need | Hook | Important boundary |
| --- | --- | --- |
| Composable filters | useDynamicFilter | Emits values; the caller performs the query |
| Toast, notification, or inline alert | useNotification | User-facing feedback, not server logging |
| Database icon name to React icon | useIcons | Returns an element, not a component class |
| IndexedDB/local fallback storage | useLocalForage | Never store access tokens or secrets |
| Allowlisted lookup select | useGlobalSelect | Table and fields must be in the server lookup registry |
| Ant Design file upload | useUpload | Legacy specialized API; validate file types again on the server |
| Self-hosted rich-text editing | useTextEditor | Tiptap needs no API key; HTML must still be sanitized before storage/rendering |
| Role assignment deltas | useAccessControl | Server remains the authorization authority |
| Scroll on route transition | useScrollToTop | Must run below React Router |

```jsx Server-driven and URL-persisted filters
const filters = useDynamicFilter({
  filters: [
    { key: 'q', type: 'search', label: 'Search' },
    { key: 'status_in', type: 'select', label: 'Status', options: statusOptions },
    { key: 'amount', type: 'range', label: 'Amount', range: [0, 10000] },
    { key: 'created_at', type: 'dateRange', label: 'Created' },
    { key: 'verified', type: 'switch', label: 'Verified only' },
  ],
  persistence: 'url',
  onChange: (activeValues) => table.setFilters(activeValues),
});

return <>
  {filters.horizontalBarJSX}
  <Tag>{filters.activeCount} active</Tag>
  <CustomTable tableConfig={table} columns={columns} />
</>;
```

## Dynamic filter render choices

| Member | Use |
| --- | --- |
| horizontalBarJSX | Toolbar above a table |
| sidebarJSX | Button that opens an Ant Design filter Drawer |
| inlineSidebarJSX | Persistent filter panel in catalogue layouts |
| renderControl(filter) | Place one configured control in a custom layout |
| filteredData | Result when a local client dataset is supplied |
| activeValues / activeCount | Only non-default values and their count |
| setValue / removeFilter / reset | Imperative filter state changes |

```jsx Friendly feedback at three levels
const feedback = useNotification();
const AlertJsx = feedback.AlertJsx;

async function save() {
  try {
    await saveProfile();
    feedback.message.success('Profile saved');
    feedback.notification.success('Saved', 'Your profile is now up to date.');
  } catch {
    feedback.alert.error('Could not save', 'Review the highlighted fields and try again.');
  }
}

return <>
  <AlertJsx />
  <Button onClick={save}>Save</Button>
</>;
```

## Feedback selection

- Use message for brief completion feedback.
- Use notification when a short title plus explanation should remain visible longer.
- Use AlertJsx for feedback that must remain in the page flow and be accessible to screen readers.
- Do not show SQL errors, stack traces, method/path combinations, or permission internals to an end user.

```jsx Resolve database-managed icons
const { resolveIcon, iconNames } = useIcons();
const resourceIcon = resolveIcon(resource.icon || 'AppstoreOutlined');

return <Menu.Item icon={resourceIcon}>{resource.label}</Menu.Item>;

// iconNames can power an appearance/resource icon picker.
const options = iconNames.map((name) => ({ label: name, value: name }));
```

:::note Icon return type
resolveIcon(name) returns a React element such as <AppstoreOutlined />, not a component constructor. Pass it to icon={resourceIcon}; do not render <resourceIcon />.
:::

```jsx Offline cache with an isolated store
const cache = useLocalForage({
  name: 'mysql-orm',
  storeName: 'table-cache',
});

await cache.setItem('projects:list', {
  rows,
  cachedAt: Date.now(),
});

const snapshot = await cache.getItem('projects:list');
await cache.updateItem('projects:list', { stale: true });
await cache.deleteItem('projects:list');
```

## useLocalForage operations

| Category | Members |
| --- | --- |
| Single item | getItem, setItem, updateItem, deleteItem |
| Bulk | getItems, setItems, updateItems, deleteItems, getAll |
| Store | clear, keys, length, key, iterate, getDriver, store |
| Status | loading and error wrap every async operation |

:::warning Offline is not authorization
Cached rows are a usability feature. Reconnect operations must still pass server authentication, permission checks, validation, conflict handling, and current role policy.
:::

```jsx Lazy allowlisted lookup select
const roles = useGlobalSelect('role_name', 'admin_roles', true);

return <>
  <roles.SelectJsx
    placeholder="Assign roles"
    onChange={(values) => form.setFieldValue('roles', values)}
  />
  <Button onClick={roles.reset}>Reload options next time</Button>
</>;
```

## Global select behavior

- Options are fetched only when the dropdown first opens.
- The lookup request selects id plus the named display column and optional groupBy column.
- multi=true enables multiple selection and compact tags.
- A 403 Lookup is not registered response means the server allowlist must be reviewed; the UI must not bypass it.

```jsx Profile image upload
const upload = useUpload('tables_metadata', 'table_name');

useEffect(() => {
  upload.setUploadURL('/api/profile/avatar');
  upload.setUploaderName('avatar');
  upload.setAcceptedFiles(['image/png', 'image/jpeg', 'image/webp']);
  upload.setNumFiles(1);
}, []);

return <>
  {upload.uploader('avatar', '/api/profile/avatar', 'profile-avatar')}
  {upload.preview()}
</>;
```

:::note Upload hardening
The browser accept list is convenience only. The server must verify authentication, file signature/MIME, size, image dimensions, generated filename, storage destination, and ownership. Do not trust the uploaded extension.
:::

```jsx Rich-text editor
const text = useTextEditor({
  uploadImage: async (file) => {
    const payload = new FormData();
    payload.append('image', file);
    const response = await api.post('/api/article-images', payload);
    return response.data.url;
  },
});

return <Form onFinish={() => saveArticle({ body: text.content })}>
  {text.editor(existingArticle.body)}
  <Button htmlType="submit" disabled={!text.editorChanged}>Save article</Button>
</Form>;
```

:::warning Rich HTML safety
useTextEditor is built on the MIT-licensed, self-hosted Tiptap core and does not need an API key. It returns HTML and can insert uploaded media. Sanitize HTML on the server with an explicit allowlist, validate image signatures and ownership, and sanitize again or use a trusted renderer when displaying saved content.
:::

:::note Vite dependency cache
After installing or upgrading editor packages, stop the UI development server and run npm run dev:force once. A 504 Outdated Optimize Dep response means the browser or development server is still referencing an older node_modules/.vite pre-bundle; it is not an editor API or licensing failure.
:::

```jsx Role permission assignment
const control = useAccessControl({
  role: selectedRole,
  fetchEndpoint: '/access/permissions/' + selectedRole,
  saveEndpoint: '/access/permissions/save',
  storeKey: 'permissions',
  assignedKey: 'permission',
  entityName: 'Permissions',
});

return <>
  {control.allItems.map((item) => (
    <Switch
      key={item.permission}
      checked={control.isItemEnabled(item.permission)}
      onChange={(enabled) => control.handleToggle(item.permission, enabled)}
    />
  ))}
  <Button disabled={!control.isDirty} loading={control.saving} onClick={control.save}>Save</Button>
  <Button disabled={!control.isDirty} onClick={control.reset}>Reset</Button>
</>;
```

```jsx Route scroll reset
function RouteEffects() {
  useScrollToTop();
  return null;
}

function App() {
  return <BrowserRouter>
    <RouteEffects />
    <ApplicationRoutes />
  </BrowserRouter>;
}
```

## Legacy and migration status

| Hook | Guidance |
| --- | --- |
| useApi | Legacy imperative HTTP helper still used by several specialized hooks; new CRUD should use provider/core contracts |
| useDelete | Legacy delete helper; prefer provider delete plus query invalidation |
| useBootstrap | Deprecated application hook; bootstrap lifecycle belongs to FrameworkProvider/mysqlOrmProvider |
| useDynamicForm | Lower-level dynamic form renderer; useRecordForm is the supported record create/edit workflow |
| useUpload | Specialized upload integration; keep browser and server validation aligned |
| useTextEditor | Supported Tiptap integration with reactive HTML, dirty tracking, reset, read-only mode, and caller-owned image uploads |
