// src/pages/admin/Users.jsx
// Schema: admin table — id, custom_id, name, email, phone_no, oauth_provider,
//         status (tinyint 1=Active 0=Inactive), last_login, forced_password_change
// Relations: admin_user_roles → admin_roles, admin_credentials

import { useEffect, useCallback } from 'react';
import {
    Button, Tag, Space, Tooltip, Avatar, Badge,
    Dropdown, Typography
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    EllipsisOutlined, UserOutlined, ReloadOutlined,
    ExportOutlined, FilterOutlined,
} from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useAdd from '../../hooks/useAdd';
import useEdit from '../../hooks/useEdit';
import useDelete from '../../hooks/useDelete';
import useDrawer from '../../hooks/useDrawer';
import ValuesStore from '../../store/values-store';
import useNotification from '../../hooks/useNotification';
import UserInfo from '../../components/userInfo/UserInfo';
import utils from '../../utils/function_utils';

const { Text } = Typography;

/* ── helpers ─────────────────────────────────────────────────── */
function getInitials(name = '') {
    return name
        .trim()
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}



/* ── component ───────────────────────────────────────────────── */
export default function Users() {
    const { message, alert, AlertJsx } = useNotification();
    const valuesStore = ValuesStore();

    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin' });

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
        }
    );

    useEffect(() => { table.setAllowSelection(true); }, []);



    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) {
            table.runRequest();
        }
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);






    /* ── actions ────────────────────────────────────────────── */
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
        });
    }

    function handleDelete(record) {
        confirm(
            record.id,
            'Remove this User?',
            <Button size="small" danger icon={<DeleteOutlined />} />,
        )
    }

    /* ── row action menu ────────────────────────────────────── */
    const rowMenu = useCallback((record) => ({
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
    }), []);

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
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.3 }}>
                            {record.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
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
                <span style={{ fontSize: 12, color: val ? '#374151' : '#d1d5db' }}>
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
            ...table.getColumnFilterProps('status', 'admin'),
            render: (val) => (
                <Badge
                    status={val === 1 ? 'success' : 'default'}
                    text={
                        <span style={{ fontSize: 12, fontWeight: 500, color: val === 1 ? '#059669' : '#9ca3af' }}>
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
                <span style={{ fontSize: 12, color: val ? '#374151' : '#d1d5db' }}>
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
    const toolbarExtras = (
        <Space>
            <Button icon={<FilterOutlined />} size="small" style={{ fontSize: 12 }}>
                Filter
            </Button>
            <Button icon={<ExportOutlined />} size="small" style={{ fontSize: 12 }}>
                Export
            </Button>
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openAdd}
                size="small"
                style={{ fontSize: 12 }}
            >
                Add User
            </Button>
        </Space>
    );

    /* ── render ─────────────────────────────────────────────── */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* {AlertJsx} */}

            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
                        Users
                    </h2>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6b7280' }}>
                        Manage system administrators and their access
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                    style={{ borderRadius: 8 }}
                >
                    Add User
                </Button>
            </div>

            {/* Table */}
            <CustomTable tableConfig={table} columns={columns} />

            {/* Modals */}
            {add.addModal('Add User', () => add.save('admin'))}
            {edit.editModal('Edit User', () => edit.save(undefined, edit.record?.id, 'admin'))}

            {/* User management drawer */}
            {userDrawer.drawerJSX()}
        </div>
    );
}