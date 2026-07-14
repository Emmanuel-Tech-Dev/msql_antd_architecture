const source = (value) => value.trim();

const integrationEntry = ({
  key,
  name = key,
  category,
  summary,
  importPath,
  example,
  method = 'GET',
  endpoint = '/api/example',
  result = 'Provider response normalized',
  status = 'Sandbox',
}) => ({
  key,
  name,
  category,
  summary,
  importPath,
  source: source(example),
  demo: 'integration',
  method,
  endpoint,
  result,
  status,
});

export const applicationHookEntries = [
  {
    key: 'useSider', name: 'useSider', category: 'Layout', status: 'Live', demo: 'sider',
    summary: 'Owns collapsed state, navigation processing, route selection, and the application shell renderer.',
    importPath: 'src/hooks/useSider.jsx',
    source: source(`
const shell = useSider({
  width: 240,
  collapsedWidth: 72,
  breakpoint: 'lg',
  collapsible: true,
  defaultCollapsed: false,
}, {
  items: navigationItems,
  appName: 'Operations Console',
  user,
});

return shell.layoutJSX({ header: <WorkspaceHeader /> });`),
  },
  {
    key: 'useModal', name: 'useModal', category: 'Overlays', status: 'Live', demo: 'modal',
    summary: 'Controls an Ant Design Modal with dynamic content, async confirmation state, and optional dragging.',
    importPath: 'src/hooks/useModal.jsx',
    source: source(`
const dialog = useModal({ width: 520, draggable: true, resetOnClose: true });

dialog.openModal({
  title: 'Review deployment',
  content: <DeploymentSummary />,
  onOk: async () => {
    await deploy();
    dialog.closeModal();
  },
});

return dialog.modalJSX();`),
  },
  {
    key: 'useDrawer', name: 'useDrawer', category: 'Overlays', status: 'Live', demo: 'drawer',
    summary: 'Controls a Drawer and supports live content updates, placement sizing, and optional resizing.',
    importPath: 'src/hooks/useDrawer.jsx',
    source: source(`
const panel = useDrawer({
  width: 480,
  resizable: true,
  minWidth: 340,
  maxWidth: 720,
  resetOnClose: true,
});

panel.openDrawer({ title: 'Project details', content: <ProjectDetails /> });
return panel.drawerJSX();`),
  },
  {
    key: 'useDraggable', name: 'useDraggable', category: 'Overlays', status: 'Live', demo: 'draggable',
    summary: 'Wraps a surface in viewport-bounded react-draggable behavior and supplies accessible title props.',
    importPath: 'src/hooks/useDraggable.jsx',
    source: source(`
const draggable = useDraggable();

<Modal
  title={<div {...draggable.draggableTitleProps}>Move this dialog</div>}
  modalRender={draggable.drag}
  open
/>`),
  },
  {
    key: 'useTheme', name: 'useTheme', category: 'Appearance', status: 'Live', demo: 'theme',
    summary: 'Reads normalized appearance, scope, and light/dark preference from ThemeProvider.',
    importPath: 'src/hooks/useTheme.jsx',
    source: source(`
const {
  appearance, isDark, mode, scope,
  toggle, clearPreference,
} = useTheme();

return <Button onClick={toggle}>
  Use {isDark ? 'light' : 'dark'} mode
</Button>;`),
  },
  {
    key: 'useChart', name: 'useChart', category: 'Visualization', status: 'Live', demo: 'chart',
    summary: 'Renders line, bar, pie, area, and composed Recharts from a normalized series contract.',
    importPath: 'src/hooks/useChart.jsx',
    source: source(`
const defaults = useMemo(() => ({ height: 300, xKey: 'month' }), []);
const chart = useChart(defaults);

return chart.renderChart({
  type: 'composed',
  data: monthlyResults,
  showLegend: true,
  series: [
    { dataKey: 'planned', chart: 'bar', color: '#9a9187' },
    { dataKey: 'actual', chart: 'line', color: '#d4570a' },
  ],
});`),
  },
  {
    key: 'useCalendar', name: 'useCalendar', category: 'Visualization', status: 'Live', demo: 'calendar',
    summary: 'Adds selected-date, notes, events, lunar data, custom cells, and statistics to Ant Design Calendar.',
    importPath: 'src/hooks/useCalender.jsx',
    source: source(`
const calendar = useCalendar('notice', {
  notes,
  maxNotesPerDay: 5,
  onNoteAdd: (date, note) => saveNote(date, note),
});

return <>
  <Calendar {...calendar.calendarProps} />
  <Button onClick={() => calendar.addNote(calendar.selectedDate, {
    title: 'Review', type: 'processing',
  })}>Add note</Button>
</>;`),
  },
  {
    key: 'useMasonry', name: 'useMasonry', category: 'Visualization', status: 'Live', demo: 'masonry',
    summary: 'Normalizes cards into responsive masonry layouts with loading, selection, mutation, and custom rendering.',
    importPath: 'src/hooks/useMasonary.jsx',
    source: source(`
const board = useMasonry('dynamic', {
  initialItems: projects,
  keyField: 'id',
  columns: { xs: 1, sm: 2, md: 3 },
  gutter: 12,
});

board.addItem({ id: crypto.randomUUID(), title: 'New card', height: 160 });
return board.masonryJSX();`),
  },
  {
    key: 'useDynamicFilter', name: 'useDynamicFilter', category: 'Data UI', status: 'Live', demo: 'filter',
    summary: 'Builds reusable search, select, range, date, tag, radio, checkbox, and switch filters.',
    importPath: 'src/hooks/useDynamicFilter.jsx',
    source: source(`
const filters = useDynamicFilter({
  filters: [
    { key: 'status', type: 'select', label: 'Status', options },
    { key: 'amount', type: 'range', label: 'Amount', range: [0, 100] },
  ],
  persistence: 'url',
  onChange: table.setFilters,
});

return filters.horizontalBarJSX;`),
  },
  {
    key: 'useTableApi', name: 'useTableApi', category: 'Data UI', status: 'Live · offline', demo: 'table',
    summary: 'Drives online or offline Ant Design tables, including search, filters, sorting, pagination, and selection.',
    importPath: 'src/hooks/useTableApi.jsx',
    source: source(`
const table = useTableApi({}, { manual: true }, 'id');

useEffect(() => {
  table.setRecord(localRows); // switches the hook to offline mode
}, [localRows]);

return <>
  <Input.Search onSearch={table.handleGlobalSearch} />
  <Table {...table.tableProps} columns={columns} />
</>;`),
  },
  {
    key: 'useNotification', name: 'useNotification', category: 'Feedback', status: 'Live', demo: 'notification',
    summary: 'Provides concise messages, richer notifications, and a controlled inline Alert surface.',
    importPath: 'src/hooks/useNotification.jsx',
    source: source(`
const feedback = useNotification();
const AlertJsx = feedback.AlertJsx;

feedback.message.success('Profile saved');
feedback.notification.info('Background job', 'The export is still running.');
feedback.alert.warning('Review required', 'Two fields need attention.');

return <AlertJsx />;`),
  },
  {
    key: 'useIcons', name: 'useIcons', category: 'Appearance', status: 'Live', demo: 'icons',
    summary: 'Resolves database-managed Ant Design icon names into React elements and exposes the supported icon catalog.',
    importPath: 'src/hooks/useIcons.jsx',
    source: source(`
const { resolveIcon, iconNames } = useIcons();
const icon = resolveIcon(resource.icon || 'AppstoreOutlined');

return <Menu.Item icon={icon}>{resource.label}</Menu.Item>;`),
  },
  {
    key: 'useLocalForage', name: 'useLocalForage', category: 'Browser storage', status: 'Live · local', demo: 'storage',
    summary: 'Wraps IndexedDB/localForage with status-aware single, bulk, iteration, and isolated-store operations.',
    importPath: 'src/hooks/useLocalForage.jsx',
    source: source(`
const cache = useLocalForage({ name: 'framework-docs', storeName: 'sandbox' });

await cache.setItem('draft', { title: 'Offline record', savedAt: Date.now() });
const draft = await cache.getItem('draft');
await cache.deleteItem('draft');`),
  },
  {
    key: 'useUpload', name: 'useUpload', category: 'Forms', status: 'Live · local', demo: 'upload',
    summary: 'Composes Ant Design Upload with file validation, preview, recalled server files, and upload metadata.',
    importPath: 'src/hooks/useUpload.jsx',
    source: source(`
const upload = useUpload('tables_metadata', 'table_name');

upload.setAcceptedFiles(['image/png', 'image/jpeg', 'image/webp']);
upload.setNumFiles(1);

return <>
  {upload.uploader('avatar', '/api/profile/avatar', 'profile-avatar')}
  {upload.preview()}
</>;`),
  },
  integrationEntry({
    key: 'useGlobalSelect', category: 'Forms',
    status: 'Live · isolated',
    summary: 'Lazy-loads a flat, grouped, or multi-select from the server lookup registry.',
    importPath: 'src/hooks/useGlobalSelect.jsx', method: 'POST', endpoint: '/api/v1/extra_meta_options',
    result: 'Allowlisted options mapped into Ant Design Select',
    example: `const roles = useGlobalSelect('role_name', 'admin_roles', true);

return <roles.SelectJsx
  placeholder="Assign roles"
  onChange={(values) => form.setFieldValue('roles', values)}
/>;`,
  }),
  integrationEntry({
    key: 'useRecordForm', category: 'Forms',
    status: 'Live · isolated',
    summary: 'Unifies metadata-driven record creation and editing, validation, files, transforms, and query invalidation.',
    importPath: 'src/hooks/useRecordForm.jsx', method: 'POST / PUT', endpoint: '/api/{resource}',
    result: 'Metadata form saved and related resources invalidated',
    example: `const recordForm = useRecordForm('tables_metadata', 'table_name');

<Button onClick={() => recordForm.openCreate('projects')}>Add project</Button>
{recordForm.recordModal({
  onOk: () => recordForm.save({
    transform: (values) => ({ ...values, source: 'admin' }),
    invalidateResources: ['projects', 'project_stats'],
  }),
})}`,
  }),
  integrationEntry({
    key: 'useDynamicForm', category: 'Forms', status: 'Live · isolated',
    summary: 'Lower-level dynamic form renderer retained for nested and repeatable legacy metadata forms.',
    importPath: 'src/hooks/useDynamicForm.jsx', method: 'LOCAL', endpoint: 'Metadata renderer',
    result: 'Dynamic fields composed; no request until the owner submits',
    example: `const fields = [
  { name: 'label', inputType: 'text', placeholder: 'Field label' },
  { name: 'type', inputType: 'select', options: fieldTypeOptions },
];

const dynamic = useDynamicForm(
  'fields', fields, { text: 'Save schema', type: 'primary' }, onFinish,
);

return dynamic.formJSX;`,
  }),
  integrationEntry({
    key: 'useTextEditor', category: 'Forms', status: 'Live · isolated',
    summary: 'Owns a self-hosted Tiptap editor with reactive HTML, dirty tracking, reset controls, and an optional image-upload adapter.',
    importPath: 'src/hooks/useTextEditor.jsx', method: 'OPTIONAL POST', endpoint: 'Caller-provided uploadImage(file)',
    result: 'Rich HTML plus text/JSON context; no editor API key required',
    example: `const text = useTextEditor({
  uploadImage: async (file) => {
    const body = new FormData();
    body.append('image', file);
    const response = await api.post('/api/article-images', body);
    return response.data.url;
  },
});

return <Form onFinish={() => save({ body: text.content })}>
  {text.editor(existingBody)}
  <Button htmlType="submit" disabled={!text.editorChanged}>Save</Button>
</Form>;`,
  }),
  integrationEntry({
    key: 'useApi', category: 'Legacy adapters', status: 'Live · isolated',
    summary: 'Compatibility wrapper over core custom queries and mutations with normalized feedback callbacks.',
    importPath: 'src/hooks/useApi.jsx', method: 'GET', endpoint: '/api/reports/summary',
    result: 'Normalized provider response passed to onSuccess',
    example: `const report = useApi('get', '/api/reports/summary', {
  manual: true,
  onSuccess: (response) => setSummary(response.data),
});

return <Button loading={report.loading} onClick={() => report.run()}>
  Load summary
</Button>;`,
  }),
  integrationEntry({
    key: 'useDelete', category: 'Legacy adapters', status: 'Live · isolated',
    summary: 'Compatibility delete hook that wraps the core delete mutation in an Ant Design confirmation.',
    importPath: 'src/hooks/useDelete.jsx', method: 'DELETE', endpoint: '/api/projects/42',
    result: 'Record deleted and list query invalidated',
    example: `const remove = useDelete({ resource: 'projects' });

return remove.confirm(
  project.id,
  'Delete this project?',
  <Button danger>Delete</Button>,
  (success) => success && closePanel(),
);`,
  }),
  integrationEntry({
    key: 'useAccessControl', category: 'Access',
    status: 'Live · isolated',
    summary: 'Tracks assigned role resources as add/remove deltas and persists the final assignment set.',
    importPath: 'src/hooks/useAccessControl.js', method: 'GET / POST', endpoint: '/access/permissions/:role',
    result: 'Permission delta persisted and assignment refetched',
    example: `const access = useAccessControl({
  role: selectedRole,
  fetchEndpoint: '/access/permissions/' + selectedRole,
  saveEndpoint: '/access/permissions/save',
  storeKey: 'permissions',
  assignedKey: 'permission',
  entityName: 'Permissions',
});

<Switch checked={access.isItemEnabled(key)} onChange={(on) => access.handleToggle(key, on)} />`,
  }),
  integrationEntry({
    key: 'useScrollToTop', category: 'Routing', status: 'Router sandbox',
    summary: 'Scrolls the document to the top whenever React Router pathname changes.',
    importPath: 'src/hooks/useScrolToTop.jsx', method: 'ROUTE', endpoint: 'location.pathname',
    result: 'window.scrollTo(0, 0) after route transition',
    example: `function RouteEffects() {
  useScrollToTop();
  return null;
}

<BrowserRouter>
  <RouteEffects />
  <ApplicationRoutes />
</BrowserRouter>`,
  }),
  integrationEntry({
    key: 'useBootstrap', category: 'Legacy adapters', status: 'Deprecated',
    summary: 'Deprecated compatibility stub; FrameworkProvider now owns bootstrap loading and refetching.',
    importPath: 'src/hooks/useBootstrap.jsx', method: 'PROVIDER', endpoint: '/api/v1/bootstrap',
    result: 'FrameworkProvider refreshes the bootstrap query',
    example: `// Do not use this deprecated hook in new pages.
// Bootstrap is initialized once by FrameworkProvider.

const queryClient = useQueryClient();
await queryClient.refetchQueries({
  queryKey: ['bootstrap'], exact: true, type: 'active',
});`,
  }),
  {
    key: 'useStatistics', name: 'useStatistics', category: 'Planned', status: 'Not implemented', demo: 'statistics',
    summary: 'Reserved hook file with no implementation or public contract yet.',
    importPath: 'src/hooks/useStatistics.jsx', source: source(`// No production API exists yet.
// Define the input, output, empty-value behavior, and tests before implementation.`),
  },
];

const coreData = [
  ['useList', 'List and paginate a resource through the data provider.', 'GET', '/api/projects/table', `const query = useList({
  resource: 'projects',
  pagination: { current: 1, pageSize: 20 },
  filters: { status: 'active' },
});`],
  ['useOne', 'Fetch one record and cache it by resource and ID.', 'GET', '/api/projects/42', `const project = useOne({ resource: 'projects', id: projectId });`],
  ['useMany', 'Fetch multiple records and cache them by their ID set.', 'GET', '/api/projects?ids=2,7,9', `const projects = useMany({ resource: 'projects', ids: [2, 7, 9] });`],
  ['useCreate', 'Create a record and invalidate cached resource lists.', 'POST', '/api/projects', `const create = useCreate({ resource: 'projects' });
create.mutate({ name: 'Northstar', status: 'active' });`],
  ['useUpdate', 'Update a record and invalidate both its detail and list caches.', 'PUT', '/api/projects/42', `const update = useUpdate({ resource: 'projects' });
update.mutate({ id: 42, variables: { status: 'archived' } });`],
  ['useDeleteOne', 'Delete one record, invalidate lists, and remove its detail cache.', 'DELETE', '/api/projects/42', `const remove = useDeleteOne({ resource: 'projects' });
remove.mutate(42);`],
  ['useCustom', 'Run a cached custom provider request with payload, headers, and unwrap control.', 'GET', '/api/reports/summary', `const report = useCustom({
  url: '/api/reports/summary', method: 'get', unwrap: true,
});`],
  ['useCustomMutation', 'Run an imperative custom provider mutation.', 'POST', '/api/projects/archive', `const archive = useCustomMutation();
archive.mutate({
  url: '/api/projects/archive', method: 'post', payload: { ids },
});`],
];

export const coreDataHookEntries = coreData.map(([name, summary, method, endpoint, example]) => integrationEntry({
  key: `core-${name}`,
  name,
  category: 'Core data',
  summary,
  importPath: `src/core/hooks/data/${name === 'useDeleteOne' ? 'useDelete' : name}.js`,
  method,
  endpoint,
  result: method === 'GET' ? 'Query cache populated with normalized data' : 'Mutation completed and affected queries invalidated',
  status: 'Live · isolated',
  example,
}));

const coreAuth = [
  ['useLogin', 'Authenticate through AuthProvider and invalidate bootstrap.', 'POST', '/auth/login', `const login = useLogin({
  mutationOptions: { onSuccess: () => navigate('/admin') },
});
login.mutate({ email, password });`],
  ['useLogout', 'End the session and clear every cached user-scoped query.', 'POST', '/auth/logout', `const logout = useLogout();
logout.mutate();`],
  ['useRegister', 'Register through the configured AuthProvider.', 'POST', '/auth/register', `const register = useRegister();
register.mutate({ name, email, password });`],
  ['useForgotPassword', 'Request a password-reset message without exposing account existence.', 'POST', '/auth/forgot-password', `const forgot = useForgotPassword();
forgot.mutate({ email });`],
  ['useResetPassword', 'Exchange a reset token for a new password.', 'POST', '/auth/reset-password', `const reset = useResetPassword();
reset.mutate({ token, password });`],
  ['useChangePassword', 'Change an authenticated password and clear rotated-token caches.', 'POST', '/auth/change-password', `const change = useChangePassword();
change.mutate({ currentPassword, newPassword });`],
  ['useIdentity', 'Read the current identity through AuthProvider.', 'GET', '/auth/auth_user', `const identity = useIdentity();`],
  ['usePermissions', 'Read the current user, roles, permissions, and resources from auth state.', 'STORE', 'authStore', `const { user, roles, permissions, resources } = usePermissions();`],
  ['useAuthorizationEvents', 'Subscribe to access and UI-setting server-sent events.', 'SSE', '/auth/access-events', `useAuthorizationEvents(isAuthenticated);`],
];

export const coreAuthHookEntries = coreAuth.map(([name, summary, method, endpoint, example]) => integrationEntry({
  key: `core-${name}`,
  name,
  category: 'Core auth',
  summary,
  importPath: `src/core/hooks/auth/${name}.js`,
  method,
  endpoint,
  result: name === 'useLogout' ? 'Session ended and query cache cleared' : 'AuthProvider lifecycle completed',
  example,
}));

export const coreAccessEntries = [
  integrationEntry({
    key: 'core-useCan', name: 'useCan', category: 'Core access', importPath: 'src/core/hooks/access/useCan.js',
    summary: 'Evaluates permission strings or resource/action pairs against current roles and registry state.',
    method: 'STORE', endpoint: 'roles + permissions + resource registry', result: 'Boolean access decision returned',
    example: `const canCreate = useCan('create:projects');
const canEdit = useCan({ resource: 'projects', action: 'edit' });`,
  }),
  integrationEntry({
    key: 'core-useRouteGuard', name: 'useRouteGuard', category: 'Core access', importPath: 'src/core/hooks/access/useRouteGuard.js',
    summary: 'Resolves public, assigned, fallback, and first-accessible routes and performs safe redirects.',
    method: 'ROUTE', endpoint: 'location.pathname + browserRoutes', result: '{ isAllowed, isReady, target } resolved',
    example: `const guard = useRouteGuard('/login');
if (!guard.isReady) return <PageSkeleton />;
if (!guard.isAllowed) return null;
return <Outlet />;`,
  }),
  integrationEntry({
    key: 'core-useFramework', name: 'useFramework', category: 'Core context', importPath: 'src/core/hooks/useFramework.js',
    status: 'Provider wiring required',
    summary: 'Intended to read FrameworkContext, but the current FrameworkProvider does not mount that context provider.',
    method: 'CONTEXT', endpoint: 'FrameworkContext', result: 'Blocked until FrameworkContext.Provider is added with a defined value contract',
    example: `// Current status: this throws because FrameworkContext.Provider
// is not mounted by FrameworkProvider yet.
// Define the context value before using this hook in feature code.

const framework = useFramework();`,
  }),
];

export const hookPlaygroundCatalog = [
  ...applicationHookEntries,
  ...coreDataHookEntries,
  ...coreAuthHookEntries,
  ...coreAccessEntries,
];

export const hookCategories = [...new Set(hookPlaygroundCatalog.map((entry) => entry.category))];
