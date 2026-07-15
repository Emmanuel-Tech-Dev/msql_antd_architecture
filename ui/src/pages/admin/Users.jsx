import { useEffect } from 'react';
import { Avatar, Badge, Button, Dropdown, Tag, Typography } from 'antd';
import {
    EditOutlined,
    EllipsisOutlined,
    PlusOutlined,
    StopOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import UserInfo from '../../components/userInfo/UserInfo';
import { PageHeader } from '../../components/PageHeader';
import useApi from '../../hooks/useApi';
import useDelete from '../../hooks/useDelete';
import useDrawer from '../../hooks/useDrawer';
import useNotification from '../../hooks/useNotification';
import useRecordForm from '../../hooks/useRecordForm';
import useTableApi from '../../hooks/useTableApi';
import utils from '../../utils/function_utils';
import { AdminEntity } from './AdminWorkspace';
import './AdminWorkspace.css';

const { Text } = Typography;

function AccountStatusAction({ user, onComplete }) {
    const { message } = useNotification();
    const { run, loading } = useApi('post', '/access/user/toggle_status', {
        onSuccess: () => {
            message.success(`Account ${Number(user.status) === 1 ? 'deactivated' : 'activated'}`);
            onComplete();
        },
        onError: () => message.error('The account status could not be updated. Please try again.'),
    });
    const isActive = Number(user.status) === 1;

    return (
        <Button
            danger={isActive}
            icon={<StopOutlined />}
            loading={loading}
            onClick={() => run({ custom_id: user.custom_id })}
        >
            {isActive ? 'Deactivate account' : 'Activate account'}
        </Button>
    );
}

export default function Users() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { saveCompleted: deleteCompleted } = useDelete({ resource: 'admin' });
    const userDrawer = useDrawer({
        width: 1080,
        destroyOnClose: true,
        rootClassName: 'admin-drawer admin-user-drawer',
        styles: { body: { padding: 0 } },
    });
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
        },
    );
    const { runRequest, setAllowSelection } = table;

    useEffect(() => setAllowSelection(true), [setAllowSelection]);
    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) runRequest();
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    const openAdd = () => {
        recordForm.setFields(['name', 'email', 'phone_no', 'status']);
        recordForm.openCreate('admin', { status: 1 });
    };

    const openEdit = (record) => {
        recordForm.setFields(undefined);
        recordForm.openEdit('admin', record, record.id);
    };

    const saveUser = () => {
        if (recordForm.isEditing) return recordForm.save();
        return recordForm.save({
            endpoint: '/auth/create_user',
            method: 'post',
            transform: (payload) => ({
                name: payload.name?.trim(),
                email: payload.email?.trim().toLowerCase(),
                phone_no: payload.phone_no?.trim() || null,
                status: Number(payload.status) === 0 ? 0 : 1,
            }),
            invalidateResources: ['admin'],
            successMessage: 'User created. Their temporary password is their email address.',
        });
    };

    const openManage = (record) => {
        userDrawer.openDrawer({
            title: (
                <div className="admin-drawer-title">
                    <Avatar
                        size={34}
                        src={record.avatar || record.profile_picture || undefined}
                        style={{ backgroundColor: utils.avatarColor(record.name) }}
                    >
                        {utils.getInitials_v2(record.name)}
                    </Avatar>
                    <span className="admin-drawer-title__copy">
                        <strong>Manage {record.name}</strong>
                        <small>{record.custom_id}</small>
                    </span>
                </div>
            ),
            content: <UserInfo user={record} />,
            footer: (
                <div className="admin-drawer-footer">
                    <span className="admin-drawer-footer__context">
                        Status changes take effect on the user’s next authorized request.
                    </span>
                    <AccountStatusAction
                        user={record}
                        onComplete={() => {
                            userDrawer.closeDrawer();
                            runRequest();
                        }}
                    />
                </div>
            ),
        });
    };

    const rowMenu = (record) => ({
        items: [
            { key: 'manage', label: 'Manage user', icon: <UserOutlined />, onClick: () => openManage(record) },
            { key: 'edit', label: 'Edit identity details', icon: <EditOutlined />, onClick: () => openEdit(record) },
        ],
    });

    const columns = [
        {
            title: 'User',
            key: 'user',
            sorter: true,
            ...table.getColumnSearchProps('name'),
            render: (_, record) => (
                <AdminEntity
                    title={record.name}
                    description={record.email}
                    leading={(
                        <Avatar
                            size={34}
                            src={record.avatar || record.profile_picture || undefined}
                            style={{ backgroundColor: utils.avatarColor(record.name), fontSize: 12 }}
                        >
                            {utils.getInitials_v2(record.name)}
                        </Avatar>
                    )}
                />
            ),
        },
        {
            title: 'User ID',
            dataIndex: 'custom_id',
            key: 'custom_id',
            render: (value) => <Text className="admin-code" copyable>{value}</Text>,
        },
        {
            title: 'Phone',
            dataIndex: 'phone_no',
            key: 'phone_no',
            render: (value) => <span className={value ? '' : 'admin-muted'}>{value || '—'}</span>,
        },
        {
            title: 'Sign-in',
            dataIndex: 'oauth_provider',
            key: 'oauth_provider',
            render: (value) => <Tag color={value ? 'purple' : 'default'}>{value || 'Password'}</Tag>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            filters: [{ text: 'Active', value: 1 }, { text: 'Inactive', value: 0 }],
            render: (value) => <Badge status={Number(value) === 1 ? 'success' : 'default'} text={Number(value) === 1 ? 'Active' : 'Inactive'} />,
        },
        {
            title: 'Last active',
            dataIndex: 'last_login',
            key: 'last_login',
            width: 180,
            render: (value) => <span className={value ? '' : 'admin-muted'}>{value ? utils.getDateAndTime(value) : 'Never'}</span>,
        },
        {
            title: 'Password',
            dataIndex: 'forced_password_change',
            key: 'forced_password_change',
            width: 120,
            render: (value) => Number(value) === 1 ? <Tag color="warning">Change required</Tag> : <span className="admin-muted">Current</span>,
        },
        {
            title: '',
            key: 'actions',
            width: 72,
            fixed: 'right',
            render: (_, record) => (
                <div className="admin-row-actions">
                    <Dropdown menu={rowMenu(record)} trigger={['click']} placement="bottomRight">
                        <Button aria-label={`Open actions for ${record.name}`} icon={<EllipsisOutlined />} />
                    </Dropdown>
                </div>
            ),
        },
    ];

    return (
        <PageHeader
            className="admin-page"
            title="Users"
            description="Manage administrator identities, account status, authentication details, and assigned access."
            icon={<TeamOutlined />}
            items={[{ title: 'Administration' }, { title: 'Identity' }, { title: 'Users' }]}
            actions={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add user</Button>}
        >
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Add user', editTitle: 'Edit user', onOk: saveUser })}
            {userDrawer.drawerJSX()}
        </PageHeader>
    );
}
