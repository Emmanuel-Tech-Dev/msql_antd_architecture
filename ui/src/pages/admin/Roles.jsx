// src/pages/admin/Roles.jsx
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Divider, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, SaveOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useRecordForm from '../../hooks/useRecordForm';
import useDelete from '../../hooks/useDelete';
import useDrawer from '../../hooks/useDrawer';
import { PageHeader } from '../../components/PageHeader';
import PermissionMatrix from '../../components/access/PermissionsMetrix';
import BrowserRoutes from '../../components/access/BrowserRoutes';

const { Text } = Typography;

export default function Roles() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_roles' });

    const accessDrawer = useDrawer({ width: 800, destroyOnClose: true });

    // ── One ref per tab — footer routes to whichever is active ───────────
    const matrixRef = useRef(null);
    const routesRef = useRef(null);

    // ── Shared footer state — updated by whichever tab is active ─────────
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('permissions');
    const [activeRole, setActiveRole] = useState('');

    // ── Active ref — whichever tab is showing ────────────────────────────
    const activeRef = activeTab === 'permissions' ? matrixRef : routesRef;

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        { table: 'admin_roles', defaultLimit: 10, maxLimit: 100, searchable: ['role_name'] }
    );
    const runRequest = table.runRequest;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) runRequest();
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    function openAdd() {
        recordForm.openCreate('admin_roles');
    }

    function openEdit(record) {
        recordForm.openEdit('admin_roles', record, record.id);
    }

    function openManage(record) {
        // Reset all footer state on every open
        setIsDirty(false);
        setIsSaving(false);
        setActiveTab('permissions');
        setActiveRole(record.role_name);

        accessDrawer.openDrawer({
            title: `Manage Access — ${record.role_name}`,
            content: (
                <Card style={{ flex: 1 }}>
                    <Tabs
                        defaultActiveKey="permissions"
                        onChange={(key) => {
                            // When tab switches:
                            // 1. Update activeTab so activeRef points to the right ref
                            // 2. Reset dirty/saving — each tab manages its own state
                            setActiveTab(key);
                            setIsDirty(false);
                            setIsSaving(false);
                        }}
                        items={[
                            {
                                key: 'permissions',
                                label: 'Permissions',
                                children: (
                                    <PermissionMatrix
                                        key={record.role_name}
                                        ref={matrixRef}
                                        role_name={record.role_name}
                                        onDirtyChange={(dirty) => {
                                            // Only update if this tab is active
                                            if (activeTab === 'permissions') setIsDirty(dirty);
                                        }}
                                        onSavingChange={(saving) => {
                                            if (activeTab === 'permissions') setIsSaving(saving);
                                        }}
                                    />
                                ),
                            },
                            {
                                key: 'browser_routes',
                                label: 'Browser Routes',
                                children: (
                                    <BrowserRoutes
                                        key={record.role_name}
                                        ref={routesRef}
                                        role={record}
                                        onDirtyChange={(dirty) => {
                                            if (activeTab === 'browser_routes') setIsDirty(dirty);
                                        }}
                                        onSavingChange={(saving) => {
                                            if (activeTab === 'browser_routes') setIsSaving(saving);
                                        }}
                                    />
                                ),
                            },
                        ]}
                    />
                </Card>
            ),
        });
    }

    // ── Live footer — always reads current activeRef, isDirty, isSaving ──
    const liveFooter = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
                Role: <strong>{activeRole}</strong>
                {' · '}
                <span style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{activeTab.replace('_', ' ')}</span>
            </span>
            <Space>
                <Button
                    icon={<ReloadOutlined />}
                    disabled={!isDirty}
                    onClick={() => activeRef.current?.reset()}
                >
                    Reset
                </Button>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    onClick={() => activeRef.current?.save()}
                >
                    Save Configuration
                </Button>
            </Space>
        </div>
    );

    const columns = [
        {
            title: 'Role Name',
            dataIndex: 'role_name',
            key: 'role_name',
            sorter: true,
            render: (value, record) => (
                <Space size={8}>
                    <Text strong>{value}</Text>
                    {Number(record.is_system_role) === 1 && <Tag color="gold">System</Tag>}
                </Space>
            ),
            ...table.getColumnSearchProps('role_name'),
            // render: (val) => <strong>{val}</strong>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (val) => <Text type="secondary">{val ?? '—'}</Text>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, record) => (
                <Space>
                    <Tooltip title="Edit role">
                        <Button aria-label={`Edit ${record.role_name}`} icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    </Tooltip>
                    {confirm(
                        record.id,
                        'Delete this role?',
                        <Button danger icon={<DeleteOutlined />} />,
                    )}
                    <Divider type="vertical" />
                    <Button variant="outlined" onClick={() => openManage(record)}>
                        Manage Access
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <PageHeader
            title="Roles"
            description="Define responsibility boundaries and manage the permissions and browser routes inherited by each role."
            icon={<SafetyCertificateOutlined />}
            items={[
                { title: 'Administration' },
                { title: 'Access control' },
                { title: 'Roles' },
            ]}
            actions={
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                >
                    Add role
                </Button>
            }
        >
            <CustomTable tableConfig={table} columns={columns} />

            {recordForm.recordModal({ createTitle: 'Add Role', editTitle: 'Edit Role' })}

            {accessDrawer.drawerJSX({ footer: liveFooter })}
        </PageHeader>
    );
}
