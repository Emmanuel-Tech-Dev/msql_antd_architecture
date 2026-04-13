import { useEffect } from 'react';
import { Button, Space, Tag, Tabs, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useAdd from '../../hooks/useAdd';
import useEdit from '../../hooks/useEdit';
import useDelete from '../../hooks/useDelete';
import ValuesStore from '../../store/values-store';

// ─── Tab 1: admin_resources — permission definitions ─────────────────────────
function ResourcesList() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_resources' });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 100 } },
        { manual: false },
        'id',
        {
            table: 'admin_resources',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['resource'],
        }
    );

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);

    function openAdd() {
        add.setTblName('admin_resources');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editResourceDef';
        valuesStore.setValue(key, record);
        edit.setTblName('admin_resources');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
    }

    const columns = [
        {
            title: 'Resource',
            dataIndex: 'resource',
            key: 'resources',
            // sorter: true,
            // render: (val) => <Tag color="blue">{val}</Tag>,
            ...table.getColumnSearchProps('permission_name'),
        },
        {
            title: 'resource_type',
            dataIndex: 'resource_type',
            key: 'resource_type',
            // render: (val) => val ?? '—',
        }, {
            title: 'resource_path',
            dataIndex: 'resource_path',
            key: 'resource_path',
            // render: (val) => val ?? '—',
        }, {
            title: 'http_method',
            dataIndex: 'http_method',
            key: 'http_method',
            // render: (val) => val ?? '—',
        }, {
            title: 'Icon',
            dataIndex: 'icon',
            key: 'icon',
            render: (val) => <i className={val}></i> ?? '—',
        }, {
            title: 'is_public',
            dataIndex: 'is_public',
            key: 'is_public',
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
                    Add Resources
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {add.addModal('Add New Resource', () => add.save('admin_resources'))}
            {edit.editModal('Edit Resource', () => edit.save(undefined, edit.record?.id, 'admin_resources'))}
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

// ─── Tab 3: admin_permission_resources — permission → resource assignments ──────
// permission FK to admin_resources.permission_name
// resource FK to admin_resources.resource
function PermissionResourcesTab() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
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

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);

    function openAdd() {
        add.setTblName('admin_permission_resources');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editPermResource';
        valuesStore.setValue(key, record);
        edit.setTblName('admin_permission_resources');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
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
                    style={{ background: '#141414', borderColor: '#141414' }}
                >
                    Assign Resource to Permission
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {add.addModal('Assign Resource to Permission', () => add.save('admin_permission_resources'))}
            {edit.editModal('Edit Assignment', () => edit.save(undefined, edit.record?.id, 'admin_permission_resources'))}
        </div>
    );
}

// ─── User Roles tab: admin_user_roles ──────────────────────────────────────────
// Note: admin_user_roles PK column is 'd' not 'id' — bug in DB schema
// user_id FK to admin.custom_id, role_id FK to admin_roles.role_name
function UserRolesTab() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
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

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);

    function openAdd() {
        add.setTblName('admin_user_roles');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editUserRole';
        valuesStore.setValue(key, record);
        edit.setTblName('admin_user_roles');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
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
                    style={{ background: '#141414', borderColor: '#141414' }}
                >
                    Assign Role to User
                </Button>
            </div>
            <CustomTable tableConfig={table} columns={columns} />
            {add.addModal('Assign Role to User', () => add.save('admin_user_roles'))}
            {edit.editModal('Edit Role Assignment', () => edit.save(undefined, edit.record?.d, 'admin_user_roles'))}
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
        <div>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Resources & Permissions</h2>
                <p style={{ margin: 0, color: '#8c8c8c', fontSize: 13 }}>
                    Manage resources, and permissions
                </p>
            </div>
            <Card

            >
                <Tabs items={TABS} />
            </Card>

        </div>
    );
}