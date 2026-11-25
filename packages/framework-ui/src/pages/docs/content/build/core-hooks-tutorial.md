---
id: core-hooks-tutorial
title: Core hooks tutorial
track: build
group: Tutorials
order: 6
eyebrow: Stable framework contracts
audience: Frontend developers
readTime: 32 min
summary: A practical guide to every core data, authentication, access, and framework hook, with working component patterns.
---

Core hooks are the preferred foundation for new pages. They are intentionally thin: each hook reads a provider from context, delegates the operation, and applies a consistent React Query key and cache policy. A page should use these hooks instead of importing Axios or constructing API URLs directly.

## Core data hook reference

| Hook | Call shape | Use it when |
| --- | --- | --- |
| useList | useList({ resource, pagination, filters, sorters, meta, queryOptions }) | Rendering a paginated/searchable collection |
| useOne | useOne({ resource, id, meta, queryOptions }) | Loading one record when resource and ID exist |
| useMany | useMany({ resource, ids, meta, queryOptions }) | Resolving a known set of IDs |
| useCreate | useCreate({ resource, meta, mutationOptions }) | Standard create; resource lists invalidate automatically |
| useUpdate | useUpdate({ resource, meta, mutationOptions }) | Standard update; list and record caches invalidate |
| useDeleteOne | useDeleteOne({ resource, meta, mutationOptions }) | Standard delete; list invalidates and record cache is removed |
| useCustom | useCustom({ url, method, payload, headers, unwrap, queryOptions }) | Cacheable non-CRUD reads |
| useCustomMutation | useCustomMutation({ mutationOptions }) | Commands or writes with custom endpoints |

```jsx Tutorial: list with search, sorting, and loading states
import { Input, Table, Alert } from 'antd';
import { useState } from 'react';
import useList from '../core/hooks/data/useList';

export default function ProjectsList() {
  const [search, setSearch] = useState('');
  const query = useList({
    resource: 'projects',
    pagination: { current: 1, pageSize: 20 },
    filters: { search },
    sorters: [{ field: 'created_at', order: 'descend' }],
    meta: { mysql: { tableConfig: { searchable: ['name', 'code'] } } },
    queryOptions: { staleTime: 30_000 },
  });

  if (query.error) return <Alert type="error" title={query.error.message} />;
  return <>
    <Input.Search allowClear onSearch={setSearch} placeholder="Find a project" />
    <Table
      rowKey="id"
      loading={query.isLoading}
      dataSource={query.data?.data ?? []}
      pagination={{ total: query.data?.total ?? 0, pageSize: 20 }}
      columns={[{ title: 'Project', dataIndex: 'name' }]}
    />
  </>;
}
```

```jsx Tutorial: one record and dependent query
const project = useOne({ resource: 'projects', id: projectId });
const members = useMany({
  resource: 'admin',
  ids: project.data?.data?.member_ids ?? [],
  queryOptions: { enabled: project.isSuccess },
});

// Normalized records live at query.data.data.
// Both hooks remain disabled until their required identifiers exist.
```

```jsx Tutorial: create, update, and delete
const createProject = useCreate({
  resource: 'projects',
  mutationOptions: { onSuccess: () => message.success('Project created') },
});
const updateProject = useUpdate({ resource: 'projects' });
const deleteProject = useDeleteOne({ resource: 'projects' });

createProject.mutate({ name: 'Apollo', status: 'active' });
updateProject.mutate({ id: 12, variables: { status: 'archived' } });
deleteProject.mutate(12);

// Use isPending to disable duplicate submissions.
// User-facing failures are available as mutation.error.message.
```

```jsx Tutorial: a custom command
const provision = useCustomMutation({
  mutationOptions: {
    onSuccess: ({ data }) => message.success(data?.message ?? 'Provisioned'),
    onError: (error) => message.error(error.message),
  },
});

provision.mutate({
  url: '/api/v1/projects/12/provision',
  method: 'post',
  payload: { region: 'eu-west' },
  unwrap: true,
});
```

## Core auth and access hooks

| Hook | Returns | Use case |
| --- | --- | --- |
| useLogin | React Query mutation | Password sign-in and bootstrap invalidation |
| useLogout | React Query mutation | Server logout plus local auth cleanup |
| useIdentity | { user } from the auth provider | Current locally held identity |
| usePermissions | { roles, permissions, resources, user } | Reactive access context |
| useCan | boolean | Show or disable an action by permission or resource/action |
| useRouteGuard | { isAllowed, isReady, target } | Protect an authenticated layout and redirect safely |
| useAuthorizationEvents | no UI return | Refresh ACL context when server access events arrive |
| useForgotPassword/useResetPassword/useChangePassword | React Query mutations | Credential recovery and rotation flows |
| useRegister | React Query mutation | Provider-backed registration when enabled |

```jsx Tutorial: permission-aware actions
const canCreate = useCan('create:projects');
const canEdit = useCan({ resource: 'projects', action: 'edit' });
const { user, roles } = usePermissions();

return <PageHeader
  title="Projects"
  description={`Signed in as ${user?.name}; roles: ${roles.join(', ')}`}
  actions={canCreate ? <Button onClick={openCreate}>Add project</Button> : null}
/>;

// This is UX only. The API repeats authorization for every request.
```

```jsx Tutorial: protected layout
function ProtectedWorkspace() {
  const { isAllowed, isReady } = useRouteGuard('/login');
  if (!isReady || !isAllowed) return <Spin />;
  return <Outlet />;
}
```

## Core-hook rules

- Pass mutation callbacks through mutationOptions; the hook preserves automatic invalidation before calling them.
- Use queryOptions.enabled for dependent requests rather than conditionally calling hooks.
- Do not invent query keys. Use the core hooks or queryKeys helpers so writes invalidate the same cache hierarchy.
- Use useCustom for cacheable reads and useCustomMutation for commands. A POST is not automatically a mutation if it is a read-only query, but make that exception explicit.
- Do not show raw response details directly. Display DataProviderError.message and use Network/requestId for diagnosis.
