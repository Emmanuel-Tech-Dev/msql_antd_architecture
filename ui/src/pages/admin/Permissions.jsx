import { useEffect } from 'react';
import { Button, Space, Tag, Tabs, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useAdd from '../../hooks/useAdd';
import useEdit from '../../hooks/useEdit';
import useDelete from '../../hooks/useDelete';
import ValuesStore from '../../store/values-store';

// ─── Tab 1: admin_permissions — permission definitions ─────────────────────────
function PermissionDefinitionsTab() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
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

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);

    function openAdd() {
        add.setTblName('admin_permissions');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editPermDef';
        valuesStore.setValue(key, record);
        edit.setTblName('admin_permissions');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
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
                    style={{ background: '#141414', borderColor: '#141414' }}
                >
                    Add Permission
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {add.addModal('Add Permission', () => add.save('admin_permissions'))}
            {edit.editModal('Edit Permission', () => edit.save(undefined, edit.record?.id, 'admin_permissions'))}
        </div>
    );
}

// ─── Tab 2: admin_role_permissions — role → permission assignments ──────────────
// role_id is the role_name string (FK to admin_roles.role_name)
function RolePermissionsTab() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
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

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);

    function openAdd() {
        add.setTblName('admin_role_permissions');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editRolePerm';
        valuesStore.setValue(key, record);
        edit.setTblName('admin_role_permissions');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
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
                    style={{ background: '#141414', borderColor: '#141414' }}
                >
                    Assign Permission to Role
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {add.addModal('Assign Permission to Role', () => add.save('admin_role_permissions'))}
            {edit.editModal('Edit Assignment', () => edit.save(undefined, edit.record?.id, 'admin_role_permissions'))}
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
        <div>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Permissions</h2>
                <p style={{ margin: 0, color: '#8c8c8c', fontSize: 13 }}>
                    Manage permissions, role assignments, and resource access
                </p>
            </div>
            <Card>
                <Tabs items={TABS} />
            </Card>

        </div>
    );
}