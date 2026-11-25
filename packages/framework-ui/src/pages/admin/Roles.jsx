import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
    SaveOutlined,
    SettingOutlined,
    TeamOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import BrowserRoutes from '../../components/access/BrowserRoutes';
import PermissionMatrix from '../../components/access/PermissionsMetrix';
import CustomTable from '../../components/CustomTable';
import { PageHeader } from '../../components/PageHeader';
import useDelete from '../../hooks/useDelete';
import useDrawer from '../../hooks/useDrawer';
import useRecordForm from '../../hooks/useRecordForm';
import useTableApi from '../../hooks/useTableApi';
import { AdminEntity } from './AdminWorkspace';
import './AdminWorkspace.css';

const { Text } = Typography;

function RoleAccessWorkspace({ role }) {
    const matrixRef = useRef(null);
    const routesRef = useRef(null);
    const [activeTab, setActiveTab] = useState('permissions');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const activeRef = activeTab === 'permissions' ? matrixRef : routesRef;

    const changeTab = (key) => {
        setActiveTab(key);
        setIsDirty(false);
        setIsSaving(false);
    };

    return (
        <div className="role-access-workspace">
            <div className="role-access-workspace__intro">
                <div>
                    <span>Role policy editor</span>
                    <h3>{role.role_name}</h3>
                    <p>Changes affect every user assigned to this role. Review both capabilities and navigation before saving.</p>
                </div>
                <Badge status={isDirty ? 'warning' : 'success'} text={isDirty ? 'Unsaved changes' : 'Configuration saved'} />
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={changeTab}
                items={[
                    {
                        key: 'permissions',
                        label: 'Capabilities',
                        children: (
                            <PermissionMatrix
                                ref={matrixRef}
                                role_name={role.role_name}
                                onDirtyChange={setIsDirty}
                                onSavingChange={setIsSaving}
                            />
                        ),
                    },
                    {
                        key: 'browser_routes',
                        label: 'Navigation access',
                        children: (
                            <BrowserRoutes
                                ref={routesRef}
                                role={role}
                                onDirtyChange={setIsDirty}
                                onSavingChange={setIsSaving}
                            />
                        ),
                    },
                ]}
            />

            <div className="role-access-workspace__commit">
                <span>{isDirty ? 'Review your changes, then save this policy.' : 'No unpublished changes.'}</span>
                <Space>
                    <Button icon={<ReloadOutlined />} disabled={!isDirty || isSaving} onClick={() => activeRef.current?.reset()}>
                        Discard changes
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} disabled={!isDirty} loading={isSaving} onClick={() => activeRef.current?.save()}>
                        Save role policy
                    </Button>
                </Space>
            </div>
        </div>
    );
}

export default function Roles() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_roles' });
    const accessDrawer = useDrawer({
        width: 920,
        destroyOnClose: true,
        rootClassName: 'admin-drawer admin-role-drawer',
        styles: { body: { padding: 0 } },
    });
    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        { table: 'admin_roles', defaultLimit: 10, maxLimit: 100, searchable: ['role_name'] },
    );
    const { runRequest } = table;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) runRequest();
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    const openManage = (record) => accessDrawer.openDrawer({
        title: (
            <div className="admin-drawer-title">
                <span className="admin-entity__leading"><SettingOutlined /></span>
                <span className="admin-drawer-title__copy">
                    <strong>Configure role access</strong>
                    <small>{record.role_name}</small>
                </span>
            </div>
        ),
        content: <RoleAccessWorkspace role={record} />,
    });

    const columns = [
        {
            title: 'Role',
            dataIndex: 'role_name',
            key: 'role_name',
            sorter: true,
            ...table.getColumnSearchProps('role_name'),
            render: (value, record) => (
                <AdminEntity
                    title={value}
                    description={Number(record.is_system_role) === 1 ? 'Protected framework role' : 'Custom organization role'}
                    leading={<SafetyCertificateOutlined />}
                    trailing={Number(record.is_system_role) === 1 ? <Tag color="gold">System</Tag> : null}
                />
            ),
        },
        {
            title: 'Purpose',
            dataIndex: 'description',
            key: 'description',
            render: (value) => <Text type="secondary">{value || 'No role description provided'}</Text>,
        },
        {
            title: 'Management',
            key: 'actions',
            width: 250,
            render: (_, record) => (
                <div className="admin-row-actions">
                    <Tooltip title="Edit role details">
                        <Button aria-label={`Edit ${record.role_name}`} icon={<EditOutlined />} onClick={() => recordForm.openEdit('admin_roles', record, record.id)} />
                    </Tooltip>
                    {confirm(
                        record.id,
                        'Delete this role?',
                        <Button
                            aria-label={`Delete ${record.role_name}`}
                            danger
                            disabled={Number(record.is_system_role) === 1}
                            icon={<DeleteOutlined />}
                        />,
                    )}
                    <Button icon={<SettingOutlined />} onClick={() => openManage(record)}>Configure access</Button>
                </div>
            ),
        },
    ];

    return (
        <PageHeader
            className="admin-page"
            title="Roles"
            description="Define responsibility boundaries and manage the capabilities and browser routes inherited by each role."
            icon={<TeamOutlined />}
            items={[{ title: 'Administration' }, { title: 'Access control' }, { title: 'Roles' }]}
            actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => recordForm.openCreate('admin_roles')}>Add role</Button>}
        >
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Add role', editTitle: 'Edit role' })}
            {accessDrawer.drawerJSX()}
        </PageHeader>
    );
}
