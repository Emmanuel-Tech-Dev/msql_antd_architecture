import { useEffect } from 'react';
import { Button, Space, Tag, Tabs, Card, Tooltip, Typography } from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined,
    EyeOutlined, EyeInvisibleOutlined,
} from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useRecordForm from '../../hooks/useRecordForm';
import useDelete from '../../hooks/useDelete';
import useIcons from '../../hooks/useIcons';
import { PageHeader } from '../../components/PageHeader';

const { Text } = Typography;
const METHOD_COLORS = { GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'gold', DELETE: 'red', ALL: 'purple' };

// ─── Tab 1: admin_resources — permission definitions ─────────────────────────
function ResourcesList() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_resources' });
    const { resolveIcon } = useIcons()
    const table = useTableApi(
        { pagination: { current: 1, pageSize: 20 } },
        { manual: false },
        'id',
        {
            table: 'admin_resources',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['resource'],

        }
    );
    const runRequest = table.runRequest;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) {
            runRequest();
        }
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    function openAdd() {
        recordForm.openCreate('admin_resources');
    }

    function openEdit(record) {
        recordForm.openEdit('admin_resources', record, record.id);
    }



    const columns = [
        {
            title: 'Resource',
            dataIndex: 'resource',
            key: 'resources',
            // sorter: true,
            // render: (val) => <Tag color="blue">{val}</Tag>,
            render: (value) => <Text strong>{value}</Text>,
            ...table.getColumnSearchProps('resource'),
        }, {
            title: 'Navigation',
            dataIndex: 'show_in_nav',
            key: 'show_in_nav',
            render: (value, record) => record.resource_type === 'BROWSER_ROUTE'
                ? (
                    <Tag icon={Number(value) === 1 ? <EyeOutlined /> : <EyeInvisibleOutlined />}>
                        {Number(value) === 1 ? 'Shown' : 'Hidden'}
                    </Tag>
                )
                : <Text type="secondary">—</Text>,
        },
        {
            title: 'Type',
            dataIndex: 'resource_type',
            key: 'resource_type',
            // render: (val) => val ?? '—',
            render: (value) => <Tag>{String(value ?? 'Unknown').replaceAll('_', ' ')}</Tag>,
            ...table.getColumnFilterProps("resource_type", "system_resources")
        }, {
            title: 'Path',
            dataIndex: 'resource_path',
            key: 'resource_path',
            render: (value) => <Text code copyable={Boolean(value)}>{value || '—'}</Text>,
            // render: (val) => val ?? '—',
        }, {
            title: 'Method',
            dataIndex: 'http_method',
            key: 'http_method',
            render: (value) => value
                ? <Tag color={METHOD_COLORS[value] ?? 'default'}>{value}</Tag>
                : <Text type="secondary">—</Text>,
            // render: (val) => val ?? '—',
        }, {
            title: 'Icon',
            dataIndex: 'icon',
            key: 'icon',
            render: (val) => (
                <>
                    {resolveIcon(val)}
                </>
            ),
        }, {
            title: 'Access',
            dataIndex: 'is_public',
            key: 'is_public',
            render: (value) => (
                <Tag color={Number(value) === 1 ? 'success' : 'default'}>
                    {Number(value) === 1 ? 'Public' : 'Protected'}
                </Tag>
            ),
            // render: (val) => val ?? '—',
        }, {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            // render: (val) => val ?? '—',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit resource">
                        <Button aria-label={`Edit ${record.resource}`} icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    {confirm(
                        record.id,
                        'Delete this permission?',
                        <Button size="small" danger icon={<DeleteOutlined />} />,
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                >
                    Add Resources
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Add New Resource', editTitle: 'Edit Resource' })}
        </div>
    );
}

// ─── Tab 2: admin_role_permissions — role → permission assignments ──────────────
// role_id is the role_name string (FK to admin_roles.role_name)
function RolePermissionsTab() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_role_permissions' });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        {
            table: 'admin_role_permissions',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['role_id', 'permission'],
        }
    );
    const runRequest = table.runRequest;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) {
            runRequest();
        }
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    function openAdd() {
        recordForm.openCreate('admin_role_permissions');
    }

    function openEdit(record) {
        recordForm.openEdit('admin_role_permissions', record, record.id);
    }

    const columns = [
        {
            title: 'Role',
            dataIndex: 'role_id',
            key: 'role_id',
            sorter: true,
            render: (val) => <Tag color="purple">{val}</Tag>,
            ...table.getColumnSearchProps('role_id'),
        },
        {
            title: 'Permission',
            dataIndex: 'permission',
            key: 'permission',
            render: (val) => <Tag color="blue">{val}</Tag>,
            ...table.getColumnSearchProps('permission'),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    {confirm(
                        record.id,
                        'Remove this role permission?',
                        <Button size="small" danger icon={<DeleteOutlined />} />,
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                >
                    Assign Permission to Role
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({
                createTitle: 'Assign Permission to Role',
                editTitle: 'Edit Assignment',
            })}
        </div>
    );
}

// ─── Tab 3: admin_permission_resources — permission → resource assignments ──────
// permission FK to admin_resources.permission_name
// resource FK to admin_resources.resource
function PermissionResourcesTab() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_permission_resources' });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        {
            table: 'admin_permission_resources',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['permission', 'resource'],
        }
    );
    const runRequest = table.runRequest;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) {
            runRequest();
        }
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    function openAdd() {
        recordForm.openCreate('admin_permission_resources');
    }

    function openEdit(record) {
        recordForm.openEdit('admin_permission_resources', record, record.id);
    }

    const columns = [
        {
            title: 'Permission',
            dataIndex: 'permission',
            key: 'permission',
            render: (val) => <Tag color="blue">{val}</Tag>,
            ...table.getColumnSearchProps('permission'),
        },
        {
            title: 'Resource',
            dataIndex: 'resource',
            key: 'resource',
            ...table.getColumnSearchProps('resource'),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    {confirm(
                        record.id,
                        'Remove this assignment?',
                        <Button size="small" danger icon={<DeleteOutlined />} />,
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                >
                    Assign Resource to Permission
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({
                createTitle: 'Assign Resource to Permission',
                editTitle: 'Edit Assignment',
            })}
        </div>
    );
}

// ─── User Roles tab: admin_user_roles ──────────────────────────────────────────
// Note: admin_user_roles PK column is 'd' not 'id' — bug in DB schema
// user_id FK to admin.custom_id, role_id FK to admin_roles.role_name
function UserRolesTab() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_user_roles' });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'd',  // PK is 'd' not 'id' in this table
        {
            table: 'admin_user_roles',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['user_id', 'role_id'],
        }
    );
    const runRequest = table.runRequest;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) {
            runRequest();
        }
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    function openAdd() {
        recordForm.openCreate('admin_user_roles');
    }

    function openEdit(record) {
        recordForm.openEdit('admin_user_roles', record, record.d);
    }

    const columns = [
        {
            title: 'User ID',
            dataIndex: 'user_id',
            key: 'user_id',
            ...table.getColumnSearchProps('user_id'),
        },
        {
            title: 'Role',
            dataIndex: 'role_id',
            key: 'role_id',
            render: (val) => <Tag color="purple">{val}</Tag>,
            ...table.getColumnFilterProps('role_id', 'admin_user_roles'),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    {confirm(
                        record.d,  // PK is 'd'
                        'Remove this role from user?',
                        <Button size="small" danger icon={<DeleteOutlined />} />,
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                >
                    Assign Role to User
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({
                createTitle: 'Assign Role to User',
                editTitle: 'Edit Role Assignment',
            })}
        </div>
    );
}

const TABS = [
    { key: 'definitions', label: 'Resources', children: <ResourcesList /> },
    // { key: 'user_roles', label: 'User Roles', children: <UserRolesTab /> },
    // { key: 'role_perms', label: 'Role → Permission', children: <RolePermissionsTab /> },
    { key: 'perm_resources', label: 'Permission → Resource', children: <PermissionResourcesTab /> },
];

export default function Resources() {
    return (
        <PageHeader
            title="Resources"
            description="Catalogue API endpoints, browser routes, data objects, and the permissions that protect them."
            icon={<ApiOutlined />}
            items={[
                { title: 'Administration' },
                { title: 'Access control' },
                { title: 'Resources' },
            ]}
        >
            <Card>
                <Tabs items={TABS} />
            </Card>
        </PageHeader>
    );
}
