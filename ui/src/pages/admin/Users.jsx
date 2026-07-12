// src/pages/admin/Users.jsx
// Schema: admin table — id, custom_id, name, email, phone_no, oauth_provider,
//         status (tinyint 1=Active 0=Inactive), last_login, forced_password_change
// Relations: admin_user_roles → admin_roles, admin_credentials

import { useEffect } from 'react';
import { Button, Tag, Space, Avatar, Badge, Dropdown, Typography } from 'antd';
import {
    PlusOutlined, EditOutlined, EllipsisOutlined, UserOutlined,
    StopOutlined, TeamOutlined,
} from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useRecordForm from '../../hooks/useRecordForm';
import useDelete from '../../hooks/useDelete';
import useDrawer from '../../hooks/useDrawer';
import useNotification from '../../hooks/useNotification';
import UserInfo from '../../components/userInfo/UserInfo';
import utils from '../../utils/function_utils';
import useApi from '../../hooks/useApi';
import AdminPage from '../../components/admin/AdminPage';

const { Text } = Typography;

/* ── helpers ─────────────────────────────────────────────────── */
/* ── component ───────────────────────────────────────────────── */
export default function Users() {
    const { message } = useNotification();
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { saveCompleted: deleteCompleted } = useDelete({ resource: 'admin' });

    const userDrawer = useDrawer({ width: 820, destroyOnClose: true });


    /* ── table ──────────────────────────────────────────────── */
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
            //joinOn: 
        }
    );
    const runRequest = table.runRequest;
    const setAllowSelection = table.setAllowSelection;

    //use account deactivation 
    const { run, loading } = useApi("post", "/access/user/toggle_status", {
        onSuccess: () => {
            message.success(`User account deactivated successfully`)
            userDrawer.closeDrawer()
            runRequest()
        }
    });

    useEffect(() => { setAllowSelection(true); }, [setAllowSelection]);




    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) {
            runRequest();
        }
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);






    /* ── actions ────────────────────────────────────────────── */
    function openAdd() {
        recordForm.openCreate('admin');
    }

    function openEdit(record) {
        recordForm.openEdit('admin', record, record.id);
    }

    function openManage(record) {
        userDrawer.openDrawer({
            title: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar
                        size={32}
                        style={{ background: utils.avatarColor(record.name), fontSize: 13, fontWeight: 600 }}
                    >
                        {utils.getInitials_v2(record.name)}
                    </Avatar>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                            {record.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 400 }}>
                            {record.custom_id}
                        </div>
                    </div>
                </div>
            ),
            content: <UserInfo user={record} />,
            extra: <>

                <Button
                    icon={<StopOutlined />}
                    block
                    danger={record?.status}
                    type='primary'
                    style={{ fontSize: 12 }}
                    onClick={() => run({ custom_id: record?.custom_id })}
                    loading={loading}
                >
                    {record?.status == 0 ? "Activate account" : "Deactivate account"}
                </Button>

            </>

        });
    }

    /* ── row action menu ────────────────────────────────────── */
    const rowMenu = (record) => ({
        items: [
            {
                key: 'manage',
                label: 'Manage user',
                icon: <UserOutlined />,
                onClick: () => openManage(record),
            },
            {
                key: 'edit',
                label: 'Edit details',
                icon: <EditOutlined />,
                onClick: () => openEdit(record),
            },
            // { type: 'divider' },
            // {
            //     key: 'delete',
            //     label: {

            //     },
            //     icon: <DeleteOutlined />,
            //     danger: true,
            //     onClick: () => {
            //         confirm(
            //             record.id,
            //             'Remove this User?',
            //             <Button size="small" danger icon={<DeleteOutlined />} />,
            //         )
            //     },
            // },
        ],
    });

    /* ── columns ────────────────────────────────────────────── */
    const columns = [
        {
            title: 'User',
            key: 'user',
            sorter: true,
            ...table.getColumnSearchProps('name'),
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar
                        size={34}
                        src={record.avatar || record.profile_picture || undefined}
                        style={{
                            background: utils.avatarColor(record.name),
                            fontSize: 13,
                            fontWeight: 600,
                            flexShrink: 0,
                        }}
                    >
                        {utils.getInitials_v2(record.name)}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                            {record.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {record.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'User ID',
            dataIndex: 'custom_id',
            key: 'custom_id',

            render: (val) => (
                <Text copyable style={{ fontSize: 12, }}>
                    {val}
                </Text>
            ),
        },
        {
            title: 'Phone',
            dataIndex: 'phone_no',
            key: 'phone_no',

            render: (val) => (
                <span style={{ fontSize: 12, color: val ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)' }}>
                    {val ?? '—'}
                </span>
            ),
        },
        {
            title: 'Auth',
            dataIndex: 'oauth_provider',
            key: 'oauth_provider',

            render: (val) => (
                <Tag
                    color={val ? '#7c3aed' : '#6b7280'}
                >
                    {val ?? 'Password'}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            filters: [
                { text: 'Active', value: 1 },
                { text: 'Inactive', value: 0 },
            ],
            // ...table.getColumnFilterProps('status', 'admin'),
            render: (val) => (
                <Badge
                    status={val === 1 ? 'success' : 'default'}
                    text={
                        <span style={{ fontSize: 12, fontWeight: 500, color: val === 1 ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}>
                            {val === 1 ? 'Active' : 'Inactive'}
                        </span>
                    }
                />
            ),
        },
        {
            title: 'Last Login',
            dataIndex: 'last_login',
            key: 'last_login',
            width: 200,
            render: (val) => (
                <span style={{ fontSize: 12, color: val ? 'var(--color-text-secondary)' : 'var(--color-text-disabled)' }}>
                    {val
                        ? utils.getDateAndTime(val)
                        : 'Never'}
                </span>
            ),
        },
        {
            title: 'Pwd Change',
            dataIndex: 'forced_password_change',
            key: 'forced_password_change',
            width: 110,
            render: (val) => (
                val === 1
                    ? <Tag color="orange" style={{ fontSize: 11, borderRadius: 20, border: 'none' }}>Required</Tag>
                    : <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 110,
            fixed: 'right',
            render: (_, record) => (
                <Space size={12}>

                    <Dropdown menu={rowMenu(record)} trigger={['click']} placement="bottomRight">
                        <Button

                            icon={<EllipsisOutlined />}
                            style={{ borderRadius: 6 }}
                        />
                    </Dropdown>
                    {/* {
                        confirm(
                            record.id,
                            'Remove this User?',
                            <Button danger icon={<DeleteOutlined />} />,
                        )
                    } */}
                </Space>
            ),
        },
    ];

    /* ── toolbar extras passed to CustomTable ───────────────── */
    /* ── render ─────────────────────────────────────────────── */
    return (
        <>
            {/* // <AdminPage
        //     eyebrow="IDENTITY / DIRECTORY"
        //     title="Users"
        //     description="Manage administrator identities, account status, authentication details, and assigned access."
        //     icon={<TeamOutlined />}
        //     actions={
        //         <Button
        //             type="primary"
        //             icon={<PlusOutlined />}
        //             onClick={openAdd}
        //         >
        //             Add user
        //         </Button>
        //     }
        // > */}

            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Add User', editTitle: 'Edit User' })}
            {userDrawer.drawerJSX()}


            {/* // </AdminPage> */}

        </>
    );
}
