import { useEffect } from 'react';
import { Button, Card, Space, Tabs, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useAdd from '../../hooks/useAdd';
import useEdit from '../../hooks/useEdit';
import useDelete from '../../hooks/useDelete';
import ValuesStore from '../../store/values-store';




function UserRolesTab() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_user_roles' });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',  // PK is 'd' not 'id' in this table
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



function RolesList() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_roles' });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        {
            table: 'admin_roles',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['name'],
        }
    );

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);

    function openAdd() {
        add.setTblName('admin_roles');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editRole';
        valuesStore.setValue(key, record);
        edit.setTblName('admin_roles');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
    }

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            sorter: true,
        },
        {
            title: 'Role Name',
            dataIndex: 'role_name',
            key: 'role_name',
            sorter: true,
            ...table.getColumnSearchProps('role_name'),
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
                        'Delete this role?',
                        <Button size="small" danger icon={<DeleteOutlined />} />,
                    )}
                </Space>
            ),
        },
    ];


    console.log(add.record)

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                    style={{ background: '#141414', borderColor: '#141414' }}
                >
                    Add Role
                </Button>
            </div>

            <CustomTable tableConfig={table} columns={columns} />

            {add.addModal('Add Role', () => add.save('admin_roles'))}
            {edit.editModal('Edit Role', () => edit.save(undefined, edit.record?.id, 'admin_roles'))}
        </div>
    );
}



const TABS = [
    { key: 'definitions', label: 'Roles', children: <RolesList /> },
    { key: 'user_roles', label: 'User → Roles', children: <UserRolesTab /> },

];

export default function Roles() {
    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Roles</h2>
                <p style={{ margin: 0, color: '#8c8c8c', fontSize: 13 }}>
                    Manage system and user roles
                </p>
            </div>
            <Card>
                <Tabs items={TABS} />
            </Card>

        </div>
    );
}