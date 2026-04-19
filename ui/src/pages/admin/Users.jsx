import { useEffect } from 'react';
import { Button, Card, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useAdd from '../../hooks/useAdd';
import useEdit from '../../hooks/useEdit';
import useDelete from '../../hooks/useDelete';
import useDrawer from '../../hooks/useDrawer';
import ValuesStore from '../../store/values-store';
import useNotification from '../../hooks/useNotification';
import UserInfo from '../../components/userInfo/UserInfo';

export default function Users() {
    const { alert, AlertJsx } = useNotification()
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin' });

    const userDrawer = useDrawer({ width: 800 })

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        {
            table: 'admin',
            defaultLimit: 10,
            maxLimit: 100,
            searchable: ['name', 'email'],
            filterable: ['status'],
        }
    );

    useEffect(() => {
        table.setAllowSelection(true);
    }, []);

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);



    useEffect(() => {
        alert.info("This is a demo application. The user management features are for demonstration purposes only and do not include actual authentication or authorization mechanisms. Please do not use real user data when testing these features.")
    }, [])

    function openAdd() {
        add.setTblName('admin');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editUser';
        valuesStore.setValue(key, record);
        edit.setTblName('admin');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
    }

    const columns = [
        {
            title: 'ID',
            dataIndex: 'custom_id',
            key: 'custom_id',
            width: 160,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            ...table.getColumnSearchProps('name'),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            ...table.getColumnSearchProps('email'),
        },
        {
            title: 'Phone',
            dataIndex: 'phone_no',
            key: 'phone_no',
            render: (val) => val ?? '—',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (val) => (
                <Tag color={val === 1 ? 'green' : 'default'}>
                    {val === 1 ? 'Active' : 'Inactive'}
                </Tag>
            ),
            ...table.getColumnFilterProps('status', 'admin'),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button

                        icon={<EditOutlined />}
                        onClick={() => openEdit(record)}
                    />
                    <Button type='primary'

                        onClick={() => userDrawer.openDrawer({
                            title: `User Information - ${record.name}`,
                            content: <>
                                <UserInfo user={record} />
                            </>,
                        })}

                    >Manage Users</Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Users</h2>
                    <p style={{ margin: 0, color: '#8c8c8c', fontSize: 13 }}>Manage system users</p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                    style={{ background: '#141414', borderColor: '#141414' }}
                >
                    Add User
                </Button>
            </div>


            <CustomTable tableConfig={table} columns={columns} />




            {add.addModal('Add User', () => add.save('admin'))}
            {edit.editModal('Edit User', () => edit.save(undefined, edit.record?.id, 'admin'))}

            {/* User Management Drawer */}
            {userDrawer.drawerJSX()}
        </div>
    );
}