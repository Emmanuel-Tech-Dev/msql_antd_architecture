import { useState } from 'react';
import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Popconfirm,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import useAccessControl from '../../hooks/useAccessControl';
import useApi from '../../hooks/useApi';
import useDelete from '../../hooks/useDelete';
import useDynamicForm from '../../hooks/useDynamicForm';
import useGlobalSelect from '../../hooks/useGlobalSelect';
import useRecordForm from '../../hooks/useRecordForm';
import useTextEditor from '../../hooks/useTextEditor';
import useCreate from '../../core/hooks/data/useCreate';
import { useCustom, useCustomMutation } from '../../core/hooks/data/useCustom';
import useDeleteOne from '../../core/hooks/data/useDelete';
import useList from '../../core/hooks/data/useList';
import useMany from '../../core/hooks/data/useMany';
import useOne from '../../core/hooks/data/useOne';
import useUpdate from '../../core/hooks/data/useUpdate';
import useForgotPassword from '../../core/hooks/auth/useForgotPassword';
import useRegister from '../../core/hooks/auth/useRegister';
import useResetPassword from '../../core/hooks/auth/useResetPassword';
import { checkAccess } from '../../core/provider/AccessProvider';
import { AuthProviderContext } from '../../core/provider/AuthProvider';
import { DataProviderContext } from '../../core/provider/DataProvider';
import { useStore } from '../../store/values-store';

const { Text, Title } = Typography;

const INITIAL_PROJECTS = [
  { id: 1, name: 'Northstar', status: 'active', owner: 'Ama Mensah' },
  { id: 2, name: 'Meridian', status: 'planning', owner: 'Kojo Asare' },
  { id: 3, name: 'Atlas', status: 'archived', owner: 'Nana Boateng' },
  { id: 4, name: 'Lighthouse', status: 'active', owner: 'Esi Owusu' },
];

const ROLE_OPTIONS = [
  { id: 1, role_name: 'User', resource_type: 'Standard' },
  { id: 2, role_name: 'Moderator', resource_type: 'Standard' },
  { id: 3, role_name: 'Admin', resource_type: 'Privileged' },
  { id: 4, role_name: 'dev', resource_type: 'System' },
];

const DOCS_RECORD_METADATA = [
  { table_name: 'docs_projects', column_name: 'name', col_real_name: 'Project name', type: 'text', backend_visible: 1, frontend_visible: 1, editable: 1, validator: 'validateEmptyString', rank: 1 },
  { table_name: 'docs_projects', column_name: 'owner_email', col_real_name: 'Owner email', type: 'email', backend_visible: 1, frontend_visible: 1, editable: 1, validator: 'validateEmptyString', rank: 2 },
  { table_name: 'docs_projects', column_name: 'priority', col_real_name: 'Priority', type: 'csvSelect', options: 'Low,Medium,High,Critical', backend_visible: 1, frontend_visible: 1, editable: 1, rank: 3 },
  { table_name: 'docs_projects', column_name: 'status', col_real_name: 'Status', type: 'jsonSelect', options: '{"planning":"Planning","active":"Active","archived":"Archived"}', backend_visible: 1, frontend_visible: 1, editable: 1, rank: 4 },
  { table_name: 'docs_projects', column_name: 'notes', col_real_name: 'Notes', type: 'textArea', backend_visible: 1, frontend_visible: 1, editable: 1, rank: 5 },
];

const DYNAMIC_FIELDS = [
  { name: 'label', inputType: 'text', placeholder: 'Field label', width: 170, isRequired: true, errorMsg: 'Enter a label' },
  { name: 'type', inputType: 'select', placeholder: 'Field type', width: 140, options: [{ label: 'Text', value: 'text' }, { label: 'Email', value: 'email' }, { label: 'Number', value: 'number' }] },
  { name: 'help', inputType: 'largeText', placeholder: 'Help text', width: 210 },
];

const ACCESS_ITEMS = [
  { permission: 'read:projects', description: 'View projects' },
  { permission: 'create:projects', description: 'Create projects' },
  { permission: 'update:projects', description: 'Edit projects' },
  { permission: 'delete:projects', description: 'Delete projects' },
];

useStore.setState({
  docs_record_metadata: DOCS_RECORD_METADATA,
  docs_permissions: ACCESS_ITEMS,
});

const pause = (ms = 260) => new Promise((resolve) => window.setTimeout(resolve, ms));

function createSandboxDataProvider() {
  let projects = INITIAL_PROJECTS.map((item) => ({ ...item }));
  let assignedPermissions = ['read:projects', 'update:projects'];

  return {
    async getList({ filters = {} }) {
      await pause();
      let data = [...projects];
      if (filters.status) data = data.filter((item) => item.status === filters.status);
      return { data, total: data.length };
    },
    async getOne({ id }) {
      await pause();
      return { data: projects.find((item) => Number(item.id) === Number(id)) ?? null };
    },
    async getMany({ ids = [] }) {
      await pause();
      return { data: projects.filter((item) => ids.map(Number).includes(Number(item.id))) };
    },
    async create({ variables }) {
      await pause();
      const record = { id: Math.max(0, ...projects.map((item) => item.id)) + 1, ...variables };
      projects = [...projects, record];
      return { data: record };
    },
    async update({ id, variables }) {
      await pause();
      projects = projects.map((item) => Number(item.id) === Number(id) ? { ...item, ...variables } : item);
      return { data: projects.find((item) => Number(item.id) === Number(id)) };
    },
    async deleteOne({ id }) {
      await pause();
      const deleted = projects.find((item) => Number(item.id) === Number(id));
      projects = projects.filter((item) => Number(item.id) !== Number(id));
      return { data: deleted };
    },
    async custom({ url, method = 'get', payload }) {
      await pause();
      if (url.includes('extra_meta_options')) return { data: { details: ROLE_OPTIONS } };
      if (url === '/sandbox/activity') return { data: { items: projects.slice(0, 3), generatedAt: new Date().toISOString() } };
      if (url === '/sandbox/report') return { data: { total: projects.length, active: projects.filter((item) => item.status === 'active').length, archived: projects.filter((item) => item.status === 'archived').length } };
      if (url === '/sandbox/archive') {
        const ids = payload?.ids ?? [];
        projects = projects.map((item) => ids.includes(item.id) ? { ...item, status: 'archived' } : item);
        return { data: { archivedIds: ids } };
      }
      if (url.startsWith('/sandbox/access/') && method.toLowerCase() === 'get') {
        return { data: { data: { assigned: assignedPermissions.map((permission) => ({ permission })) } } };
      }
      if (url === '/sandbox/access/save') {
        assignedPermissions = payload?.docs_permissions ?? [];
        return { data: { saved: assignedPermissions } };
      }
      return { data: { echo: payload ?? null, url, method } };
    },
  };
}

const sandboxAuthProvider = {
  async register(record) { await pause(); return { user: { id: 18, ...record, password: undefined } }; },
  async forgotPassword({ email }) { await pause(); return { accepted: true, email }; },
  async resetPassword({ token }) { await pause(); return { reset: true, tokenUsed: Boolean(token) }; },
  async login(credentials) { await pause(); return { user: { id: 7, name: 'Demo User', email: credentials.email }, token: 'sandbox-token' }; },
  async logout() { await pause(); },
  async checkAuth() { return { authenticated: true }; },
  async getIdentity() { return { user: { id: 7, name: 'Demo User', email: 'demo@example.com' } }; },
  async getPermissions() { return { roles: ['Moderator'], permissions: ['read:projects', 'update:projects'] }; },
  async refreshToken() { return { token: 'sandbox-token-refreshed' }; },
  async changePassword() { await pause(); return { changed: true }; },
};

function SandboxProviders({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false }, mutations: { retry: false } },
  }));
  const [dataProvider] = useState(createSandboxDataProvider);
  return (
    <QueryClientProvider client={queryClient}>
      <DataProviderContext.Provider value={dataProvider}>
        <AuthProviderContext.Provider value={sandboxAuthProvider}>
          {children}
        </AuthProviderContext.Provider>
      </DataProviderContext.Provider>
    </QueryClientProvider>
  );
}

function DemoPanel({ children, note }) {
  return <div className="hook-semantic">{note && <Alert type="info" showIcon message={note} />}{children}</div>;
}

function JsonResult({ value, empty = 'Interact with the demo to inspect its result.' }) {
  return <pre className="hook-studio__output">{value ? JSON.stringify(value, null, 2) : `// ${empty}`}</pre>;
}

function GlobalSelectContent() {
  const role = useGlobalSelect('role_name', 'admin_roles');
  const grouped = useGlobalSelect('role_name', 'admin_roles', true, 'resource_type');
  return (
    <DemoPanel note="Open either field. The real hook lazily calls the isolated lookup provider only when its dropdown opens.">
      <div className="hook-semantic__form-grid">
        <label><span>Primary role</span>{role.SelectJsx({ placeholder: 'Select one role' })}<small>Selected: {role.selected ?? 'None'}</small></label>
        <label><span>Additional roles</span>{grouped.SelectJsx({ placeholder: 'Select several roles' })}<small>Selected: {grouped.selected.length ? grouped.selected.join(', ') : 'None'}</small></label>
      </div>
    </DemoPanel>
  );
}

export function GlobalSelectDemo() { return <SandboxProviders><GlobalSelectContent /></SandboxProviders>; }

function DynamicFormContent() {
  const [submitted, setSubmitted] = useState(null);
  const dynamic = useDynamicForm('fields', DYNAMIC_FIELDS, { text: 'Save field schema', type: 'primary' }, setSubmitted, true);
  return (
    <DemoPanel note="This is useDynamicForm's real Form.List. Click Add Field repeatedly, fill the generated controls, remove rows, and submit the collection.">
      <div className="hook-semantic__dynamic-form">{dynamic.formJSX}</div>
      <JsonResult value={submitted ?? dynamic.data} empty="Add at least one field, then submit the dynamic form." />
    </DemoPanel>
  );
}

export function DynamicFormDemo() { return <SandboxProviders><DynamicFormContent /></SandboxProviders>; }

function RecordFormContent() {
  const [saved, setSaved] = useState(null);
  const recordForm = useRecordForm('docs_record_metadata', 'table_name');
  const openCreate = () => recordForm.openCreate('docs_projects', { status: 'planning', priority: 'Medium' });
  const openEdit = () => recordForm.openEdit('docs_projects', {
    id: 4,
    name: 'Lighthouse',
    owner_email: 'esi@example.com',
    priority: 'High',
    status: 'active',
    notes: 'Prepare the production readiness review.',
  }, 4);
  return (
    <DemoPanel note="The modal below is built by the real useRecordForm from isolated table metadata. Create and edit use the same hook and mock DataProvider.">
      <Space wrap><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Open create form</Button><Button icon={<EditOutlined />} onClick={openEdit}>Open edit form</Button></Space>
      <JsonResult value={saved} empty="Save a metadata-generated record to inspect the normalized provider result." />
      {recordForm.recordModal({
        createTitle: 'Create sandbox project',
        editTitle: 'Edit sandbox project',
        onOk: () => recordForm.save({ notify: false, onSuccess: setSaved, invalidateResources: ['docs_projects'] }),
      })}
    </DemoPanel>
  );
}

export function RecordFormDemo() { return <SandboxProviders><RecordFormContent /></SandboxProviders>; }

function TextEditorContent() {
  const text = useTextEditor();
  const [snapshot, setSnapshot] = useState('');
  return (
    <DemoPanel note="This renders the actual TinyMCE integration. Its image picker uses local data URLs in this sandbox; server sanitization is still required before persistence.">
      <div className="hook-semantic__editor">{text.editor('<h2>Release notes</h2><p>Describe the change here.</p>')}</div>
      <Button type="primary" onClick={() => setSnapshot(text.editorRef.current?.getContent() ?? '')}>Read editor HTML</Button>
      <JsonResult value={snapshot ? { html: snapshot } : null} />
    </DemoPanel>
  );
}

export function TextEditorDemo() { return <SandboxProviders><TextEditorContent /></SandboxProviders>; }

function ApiContent() {
  const request = useApi('get', '/sandbox/activity', { manual: true });
  return <DemoPanel note="useApi remains a compatibility wrapper over the core custom-query hooks."><Button type="primary" loading={request.loading} onClick={() => request.run()}>Load activity</Button><JsonResult value={request.data} /></DemoPanel>;
}

export function ApiDemo() { return <SandboxProviders><ApiContent /></SandboxProviders>; }

function DeleteContent() {
  const [rows, setRows] = useState(INITIAL_PROJECTS.slice(0, 3));
  const remove = useDelete({ resource: 'projects' });
  const columns = [
    { title: 'Project', dataIndex: 'name' },
    { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> },
    { title: '', width: 80, render: (_, record) => remove.confirm(record.id, `Delete ${record.name}?`, <Button danger icon={<DeleteOutlined />} />, (success) => success && setRows((current) => current.filter((item) => item.id !== record.id))) },
  ];
  return <DemoPanel note="The confirmation and deletion use the real compatibility hook against the isolated provider."><Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={rows} /></DemoPanel>;
}

export function DeleteDemo() { return <SandboxProviders><DeleteContent /></SandboxProviders>; }

function AccessControlContent() {
  const access = useAccessControl({
    role: 'Reviewer',
    fetchEndpoint: '/sandbox/access/Reviewer',
    saveEndpoint: '/sandbox/access/save',
    storeKey: 'docs_permissions',
    assignedKey: 'permission',
    entityName: 'Permissions',
  });
  return (
    <DemoPanel note="Toggle assignments. The real hook tracks added/removed deltas, enables Save only when dirty, persists, then refetches.">
      <div className="hook-semantic__permission-list">
        {access.allItems.map((item) => <label key={item.permission}><span><strong>{item.permission}</strong><small>{item.description}</small></span><Switch loading={access.loading} checked={access.isItemEnabled(item.permission)} onChange={(enabled) => access.handleToggle(item.permission, enabled)} /></label>)}
      </div>
      <Space><Button disabled={!access.isDirty} onClick={access.reset}>Reset</Button><Button type="primary" disabled={!access.isDirty} loading={access.saving} onClick={access.save}>Save assignments</Button></Space>
    </DemoPanel>
  );
}

export function AccessControlDemo() { return <SandboxProviders><AccessControlContent /></SandboxProviders>; }

function ListContent() {
  const [status, setStatus] = useState(undefined);
  const query = useList({ resource: 'projects', filters: status ? { status } : {} });
  const columns = [{ title: 'Project', dataIndex: 'name' }, { title: 'Owner', dataIndex: 'owner' }, { title: 'Status', dataIndex: 'status', render: (value) => <Tag>{value}</Tag> }];
  return <DemoPanel note="Changing the filter changes the query key and reruns the real useList hook."><Select allowClear placeholder="Filter by status" value={status} onChange={setStatus} options={['planning', 'active', 'archived'].map((value) => ({ value, label: value }))} /><Table rowKey="id" size="small" loading={query.isLoading} pagination={false} columns={columns} dataSource={query.data?.data ?? []} /></DemoPanel>;
}

export function ListDemo() { return <SandboxProviders><ListContent /></SandboxProviders>; }

function OneContent() {
  const [id, setId] = useState(1);
  const query = useOne({ resource: 'projects', id });
  const project = query.data?.data;
  return <DemoPanel note="Select an ID to demonstrate the resource-plus-ID cache key."><Select value={id} onChange={setId} options={INITIAL_PROJECTS.map((item) => ({ value: item.id, label: `${item.id} · ${item.name}` }))} />{project && <Card loading={query.isLoading} className="hook-semantic__record-card"><small>PROJECT #{project.id}</small><Title level={4}>{project.name}</Title><p>{project.owner}</p><Tag>{project.status}</Tag></Card>}</DemoPanel>;
}

export function OneDemo() { return <SandboxProviders><OneContent /></SandboxProviders>; }

function ManyContent() {
  const [ids, setIds] = useState([1, 3]);
  const query = useMany({ resource: 'projects', ids });
  return <DemoPanel note="useMany resolves a known ID set and caches that set independently."><Select mode="multiple" value={ids} onChange={setIds} options={INITIAL_PROJECTS.map((item) => ({ value: item.id, label: item.name }))} /><div className="hook-semantic__card-grid">{(query.data?.data ?? []).map((item) => <Card size="small" key={item.id} title={item.name}><Tag>{item.status}</Tag><p>{item.owner}</p></Card>)}</div></DemoPanel>;
}

export function ManyDemo() { return <SandboxProviders><ManyContent /></SandboxProviders>; }

function CreateContent() {
  const [name, setName] = useState('');
  const [created, setCreated] = useState(null);
  const create = useCreate({ resource: 'projects', mutationOptions: { onSuccess: (result) => { setCreated(result.data); setName(''); } } });
  return <DemoPanel note="Submitting calls the real create mutation. The hook automatically invalidates project-list queries."><Space.Compact block><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New project name" /><Button type="primary" loading={create.isPending} disabled={!name.trim()} onClick={() => create.mutate({ name, status: 'planning', owner: 'Demo owner' })}>Create</Button></Space.Compact><JsonResult value={created} /></DemoPanel>;
}

export function CreateDemo() { return <SandboxProviders><CreateContent /></SandboxProviders>; }

function UpdateContent() {
  const [id, setId] = useState(1);
  const [status, setStatus] = useState('active');
  const [updated, setUpdated] = useState(null);
  const update = useUpdate({ resource: 'projects', mutationOptions: { onSuccess: (result) => setUpdated(result.data) } });
  return <DemoPanel note="The real update hook invalidates both the resource list and the updated record cache."><div className="hook-semantic__form-grid"><label><span>Project</span><Select value={id} onChange={setId} options={INITIAL_PROJECTS.map((item) => ({ value: item.id, label: item.name }))} /></label><label><span>New status</span><Select value={status} onChange={setStatus} options={['planning', 'active', 'archived'].map((value) => ({ value, label: value }))} /></label></div><Button type="primary" loading={update.isPending} onClick={() => update.mutate({ id, variables: { status } })}>Update project</Button><JsonResult value={updated} /></DemoPanel>;
}

export function UpdateDemo() { return <SandboxProviders><UpdateContent /></SandboxProviders>; }

function DeleteOneContent() {
  const [rows, setRows] = useState(INITIAL_PROJECTS);
  const remove = useDeleteOne({ resource: 'projects', mutationOptions: { onSuccess: (_, id) => setRows((current) => current.filter((item) => item.id !== id)) } });
  return <DemoPanel note="The core hook removes the detail query and invalidates every project list after deletion."><div className="hook-semantic__delete-list">{rows.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.owner}</small></span><Popconfirm title={`Delete ${item.name}?`} onConfirm={() => remove.mutate(item.id)}><Button danger loading={remove.isPending} icon={<DeleteOutlined />} /></Popconfirm></div>)}</div></DemoPanel>;
}

export function DeleteOneDemo() { return <SandboxProviders><DeleteOneContent /></SandboxProviders>; }

function CustomContent() {
  const report = useCustom({ url: '/sandbox/report', method: 'get' });
  const data = report.data?.data;
  return <DemoPanel note="useCustom is a cached query for endpoints that do not fit standard CRUD."><Button icon={<ReloadOutlined />} loading={report.isFetching} onClick={() => report.refetch()}>Refresh report</Button><div className="hook-semantic__metrics"><div><strong>{data?.total ?? '—'}</strong><small>Total</small></div><div><strong>{data?.active ?? '—'}</strong><small>Active</small></div><div><strong>{data?.archived ?? '—'}</strong><small>Archived</small></div></div></DemoPanel>;
}

export function CustomDemo() { return <SandboxProviders><CustomContent /></SandboxProviders>; }

function CustomMutationContent() {
  const [ids, setIds] = useState([1, 2]);
  const [result, setResult] = useState(null);
  const command = useCustomMutation({ mutationOptions: { onSuccess: (response) => setResult(response.data) } });
  return <DemoPanel note="This models a domain command rather than CRUD: archive several selected projects in one request."><Select mode="multiple" value={ids} onChange={setIds} options={INITIAL_PROJECTS.map((item) => ({ value: item.id, label: item.name }))} /><Button type="primary" loading={command.isPending} disabled={!ids.length} onClick={() => command.mutate({ url: '/sandbox/archive', method: 'post', payload: { ids } })}>Archive selected</Button><JsonResult value={result} /></DemoPanel>;
}

export function CustomMutationDemo() { return <SandboxProviders><CustomMutationContent /></SandboxProviders>; }

function RegisterContent() {
  const [result, setResult] = useState(null);
  const register = useRegister({ mutationOptions: { onSuccess: setResult } });
  return <DemoPanel note="The real hook sends the completed registration record through the isolated AuthProvider."><Form layout="vertical" onFinish={(values) => register.mutate(values)}><Form.Item name="name" label="Full name" rules={[{ required: true }]}><Input prefix={<UserOutlined />} /></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item><Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit" loading={register.isPending}>Create account</Button></Form><JsonResult value={result} /></DemoPanel>;
}

export function RegisterDemo() { return <SandboxProviders><RegisterContent /></SandboxProviders>; }

function ForgotContent() {
  const [accepted, setAccepted] = useState(null);
  const forgot = useForgotPassword({ mutationOptions: { onSuccess: setAccepted } });
  return <DemoPanel note="The UI always shows a neutral response so account existence is not disclosed."><Form layout="vertical" onFinish={(values) => forgot.mutate(values)}><Form.Item name="email" label="Account email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item><Button type="primary" htmlType="submit" loading={forgot.isPending} icon={<SendOutlined />}>Send reset instructions</Button></Form>{accepted && <Alert type="success" showIcon message="If the account exists, reset instructions have been sent." />}</DemoPanel>;
}

export function ForgotDemo() { return <SandboxProviders><ForgotContent /></SandboxProviders>; }

function ResetContent() {
  const [done, setDone] = useState(false);
  const reset = useResetPassword({ mutationOptions: { onSuccess: () => setDone(true) } });
  return <DemoPanel note="The real reset mutation receives the one-time token and replacement password through AuthProvider."><Form layout="vertical" initialValues={{ token: 'sandbox-reset-token' }} onFinish={(values) => reset.mutate(values)}><Form.Item name="token" label="Reset token"><Input disabled /></Form.Item><Form.Item name="password" label="New password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit" loading={reset.isPending}>Reset password</Button></Form>{done && <Alert type="success" showIcon message="Password reset completed in the isolated provider." />}</DemoPanel>;
}

export function ResetDemo() { return <SandboxProviders><ResetContent /></SandboxProviders>; }

export function LoginDemo() {
  const [session, setSession] = useState(null);
  return <DemoPanel note="This semantic login demo is isolated because the production hook also invalidates the live bootstrap query after success."><Form layout="vertical" onFinish={async (values) => setSession(await sandboxAuthProvider.login(values))}><Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item><Form.Item name="password" label="Password" rules={[{ required: true }]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit">Sign in through AuthProvider</Button></Form><JsonResult value={session} /></DemoPanel>;
}

export function LogoutDemo() {
  const [authenticated, setAuthenticated] = useState(true);
  return <DemoPanel note="Production useLogout ends the provider session and clears all user-scoped React Query cache, even when logout reports an error."><Card><Space><Avatar icon={<UserOutlined />} /><span><strong>{authenticated ? 'Demo User' : 'No active session'}</strong><br /><Text type="secondary">{authenticated ? 'demo@example.com' : 'Cache cleared'}</Text></span></Space><Divider /><Button danger disabled={!authenticated} onClick={() => setAuthenticated(false)}>End session and clear cache</Button></Card></DemoPanel>;
}

export function ChangePasswordDemo() {
  const [changed, setChanged] = useState(false);
  return <DemoPanel note="The production hook rotates credentials through AuthProvider and then clears cached session data."><Form layout="vertical" onFinish={() => setChanged(true)}><Form.Item name="currentPassword" label="Current password" rules={[{ required: true }]}><Input.Password /></Form.Item><Form.Item name="newPassword" label="New password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item><Button type="primary" htmlType="submit" icon={<LockOutlined />}>Change password</Button></Form>{changed && <Alert type="success" showIcon message="Password changed; session cache would now be cleared." />}</DemoPanel>;
}

export function IdentityDemo() {
  return <DemoPanel note="useIdentity delegates identity ownership to AuthProvider. The current mysql provider returns this asynchronously."><Card className="hook-semantic__identity"><Avatar size={58}>DU</Avatar><div><Title level={4}>Demo User</Title><p>demo@example.com</p><Tag color="green">Authenticated identity</Tag></div></Card></DemoPanel>;
}

export function PermissionsDemo() {
  return <DemoPanel note="usePermissions reads the current user, roles, permissions, and resources from authStore."><div className="hook-semantic__permission-summary"><div><small>USER</small><strong>Demo User</strong></div><div><small>ROLES</small><Space wrap><Tag>Moderator</Tag></Space></div><div><small>PERMISSIONS</small><Space wrap><Tag color="blue">read:projects</Tag><Tag color="blue">update:projects</Tag></Space></div><div><small>RESOURCES</small><strong>projects · profile · docs</strong></div></div></DemoPanel>;
}

export function AuthorizationEventsDemo() {
  const [events, setEvents] = useState([]);
  const publish = (type) => setEvents((current) => [{ id: Date.now(), type, time: new Date().toLocaleTimeString() }, ...current]);
  return <DemoPanel note="The production hook listens to /auth/access-events. access-changed refetches auth_user; ui-settings-changed refetches bootstrap."><Space wrap><Button onClick={() => publish('access-changed')}>Emit access change</Button><Button onClick={() => publish('ui-settings-changed')}>Emit UI-settings change</Button></Space><div className="hook-semantic__event-log">{events.length ? events.map((event) => <div key={event.id}><i /><strong>{event.type}</strong><span>{event.type === 'access-changed' ? 'Refetch auth_user' : 'Refetch bootstrap'}</span><small>{event.time}</small></div>) : <Text type="secondary">No simulated server-sent events yet.</Text>}</div></DemoPanel>;
}

export function CanDemo() {
  const [role, setRole] = useState('Moderator');
  const [granted, setGranted] = useState(['read:projects']);
  const decision = checkAccess({ resource: 'projects', action: 'edit', roles: [role], permissions: granted, resources: { projects: { permissions: { edit: 'update:projects' } } }, browserRoutes: [], isReady: true });
  return <DemoPanel note="This uses the same checkAccess function called by useCan. SuperAdmin and dev bypass explicit permissions; other roles require the configured permission."><div className="hook-semantic__access-evaluator"><label><span>Role</span><Radio.Group value={role} onChange={(event) => setRole(event.target.value)} options={['User', 'Moderator', 'dev']} /></label><label><span>Granted permissions</span><Checkbox.Group value={granted} onChange={setGranted} options={[{ label: 'read:projects', value: 'read:projects' }, { label: 'update:projects', value: 'update:projects' }]} /></label><Alert type={decision.can ? 'success' : 'error'} showIcon message={decision.can ? 'Allowed to edit projects' : 'Edit denied'} description={decision.reason ?? 'Privileged role or required permission is present.'} /></div></DemoPanel>;
}

export function RouteGuardDemo() {
  const routes = ['/admin/dashboard', '/admin/projects', '/admin/profile'];
  const [path, setPath] = useState('/admin');
  const [authenticated, setAuthenticated] = useState(true);
  const target = !authenticated ? '/login' : path === '/admin' ? routes[0] : routes.includes(path) ? null : '/admin/404';
  return <DemoPanel note="This shows the route decisions implemented by useRouteGuard: login, first accessible route, assigned route, or protected 404."><div className="hook-semantic__route-map"><Switch checked={authenticated} onChange={setAuthenticated} checkedChildren="Authenticated" unCheckedChildren="Signed out" /><Input value={path} onChange={(event) => setPath(event.target.value)} /><div><span>Requested</span><strong>{path}</strong></div><div><span>Decision</span><strong>{target ? `Redirect → ${target}` : 'Render assigned route'}</strong></div></div></DemoPanel>;
}

export function FrameworkDemo() {
  return <DemoPanel note="This hook cannot execute yet: FrameworkProvider imports FrameworkContext but does not mount FrameworkContext.Provider."><Alert type="warning" showIcon message="Provider wiring required" description="Define a stable context value containing the intended framework services, mount FrameworkContext.Provider, and then enable the useFramework demo." /><div className="hook-semantic__provider-flow"><span>FrameworkProvider</span><i>missing value</i><span>FrameworkContext.Provider</span><i>then</i><span>useFramework()</span></div></DemoPanel>;
}

export function ScrollToTopDemo() {
  const [route, setRoute] = useState('/admin/projects');
  const [position, setPosition] = useState(260);
  const navigate = (next) => { setRoute(next); setPosition(0); };
  return <DemoPanel note="useScrollToTop watches location.pathname and calls window.scrollTo(0, 0). This miniature route viewport demonstrates that behavior without moving the documentation page."><div className="hook-semantic__scroll-demo"><Space wrap>{['/admin/projects', '/admin/roles', '/admin/profile'].map((path) => <Button type={route === path ? 'primary' : 'default'} key={path} onClick={() => navigate(path)}>{path.split('/').at(-1)}</Button>)}</Space><div><span style={{ transform: `translateY(-${Math.min(position, 120)}px)` }}>Current route: {route}<br />Scroll position: {position}px</span></div><Button onClick={() => setPosition(260)}>Simulate scrolling down</Button></div></DemoPanel>;
}

export function BootstrapDemo() {
  return <DemoPanel note="useBootstrap is intentionally deprecated; FrameworkProvider owns the bootstrap query before application features render."><div className="hook-semantic__bootstrap-flow"><div><strong>01</strong><span>Authenticate</span></div><div><strong>02</strong><span>Fetch bootstrap registry</span></div><div><strong>03</strong><span>Populate values and resources</span></div><div><strong>04</strong><span>Render authorized application</span></div></div><Alert type="warning" showIcon message="Do not add new page-level useBootstrap calls" description="Invalidate or refetch the shared ['bootstrap'] query when runtime configuration changes." /></DemoPanel>;
}

// The registry intentionally lives beside its demo components so each entry
// cannot drift away from the implementation it renders.
// eslint-disable-next-line react-refresh/only-export-components
export const semanticDemoComponents = {
  useGlobalSelect: GlobalSelectDemo,
  useDynamicForm: DynamicFormDemo,
  useRecordForm: RecordFormDemo,
  useTextEditor: TextEditorDemo,
  useApi: ApiDemo,
  useDelete: DeleteDemo,
  useAccessControl: AccessControlDemo,
  useScrollToTop: ScrollToTopDemo,
  useBootstrap: BootstrapDemo,
  useList: ListDemo,
  useOne: OneDemo,
  useMany: ManyDemo,
  useCreate: CreateDemo,
  useUpdate: UpdateDemo,
  useDeleteOne: DeleteOneDemo,
  useCustom: CustomDemo,
  useCustomMutation: CustomMutationDemo,
  useLogin: LoginDemo,
  useLogout: LogoutDemo,
  useRegister: RegisterDemo,
  useForgotPassword: ForgotDemo,
  useResetPassword: ResetDemo,
  useChangePassword: ChangePasswordDemo,
  useIdentity: IdentityDemo,
  usePermissions: PermissionsDemo,
  useAuthorizationEvents: AuthorizationEventsDemo,
  useCan: CanDemo,
  useRouteGuard: RouteGuardDemo,
  useFramework: FrameworkDemo,
};
