import { useEffect } from 'react';
import { Button, Space, Tag, Tabs, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useRecordForm from '../../hooks/useRecordForm';
import useDelete from '../../hooks/useDelete';
import AdminPage from '../../components/admin/AdminPage';

// ─── Tab 1: admin_permissions — permission definitions ─────────────────────────
function PermissionDefinitionsTab() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_permissions' });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        {
            table: 'admin_permissions',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['permission_name'],
        }
    );
    const runRequest = table.runRequest;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) {
            runRequest();
        }
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    function openAdd() {
        recordForm.openCreate('admin_permissions');
    }

    function openEdit(record) {
        recordForm.openEdit('admin_permissions', record, record.id);
    }

    const columns = [
        {
            title: 'Permission Name',
            dataIndex: 'permission_name',
            key: 'permission_name',
            sorter: true,
            render: (val) => <Tag color="blue">{val}</Tag>,
            ...table.getColumnSearchProps('permission_name'),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (val) => val ?? '—',
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
                    Add Permission
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Add Permission', editTitle: 'Edit Permission' })}
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



const TABS = [
    { key: 'definitions', label: 'Permissions', children: <PermissionDefinitionsTab /> },
    // { key: 'user_roles', label: 'User Roles', children: <UserRolesTab /> },
    { key: 'role_perms', label: 'Role → Permission', children: <RolePermissionsTab /> },
    // { key: 'perm_resources', label: 'Permission → Resource', children: <PermissionResourcesTab /> },
];

export default function Permissions() {
    return (
        <AdminPage
            eyebrow="ACCESS / CAPABILITIES"
            title="Permissions"
            description="Define granular capabilities and inspect how those capabilities are assigned to roles."
            icon={<KeyOutlined />}
        >
            <Card>
                <Tabs items={TABS} />
            </Card>
        </AdminPage>
    );
}
