import { useEffect } from 'react';
import { Button, Card, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import { PageHeader } from '../../components/PageHeader';
import useDelete from '../../hooks/useDelete';
import useRecordForm from '../../hooks/useRecordForm';
import useTableApi from '../../hooks/useTableApi';
import { AdminEntity, AdminSectionHeader } from './AdminWorkspace';
import './AdminWorkspace.css';

const { Text } = Typography;

function PermissionDefinitionsTab() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_permissions' });
    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        { table: 'admin_permissions', defaultLimit: 10, maxLimit: 100, searchable: ['permission_name'] },
    );
    const { runRequest } = table;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) runRequest();
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    const columns = [
        {
            title: 'Permission',
            dataIndex: 'permission_name',
            key: 'permission_name',
            sorter: true,
            ...table.getColumnSearchProps('permission_name'),
            render: (value) => {
                const [action, resource = 'general'] = String(value).split(':');
                return (
                    <AdminEntity
                        title={resource.replaceAll('_', ' ')}
                        description={value}
                        leading={<KeyOutlined />}
                        trailing={<Tag color="processing">{action}</Tag>}
                    />
                );
            },
        },
        {
            title: 'Purpose',
            dataIndex: 'description',
            key: 'description',
            render: (value) => <Text type="secondary">{value || 'No description provided'}</Text>,
        },
        {
            title: '',
            key: 'actions',
            width: 112,
            render: (_, record) => (
                <div className="admin-row-actions">
                    <Tooltip title="Edit permission">
                        <Button aria-label={`Edit ${record.permission_name}`} icon={<EditOutlined />} onClick={() => recordForm.openEdit('admin_permissions', record, record.id)} />
                    </Tooltip>
                    {confirm(
                        record.id,
                        'Delete this permission?',
                        <Button aria-label={`Delete ${record.permission_name}`} danger icon={<DeleteOutlined />} />,
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <AdminSectionHeader
                eyebrow="Capability catalogue"
                title="Permission definitions"
                description="Create stable, action-oriented capabilities that roles and direct user authority can reference."
                action={<Button type="primary" icon={<PlusOutlined />} onClick={() => recordForm.openCreate('admin_permissions')}>Add permission</Button>}
            />
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Add permission', editTitle: 'Edit permission' })}
        </div>
    );
}

function RolePermissionsTab() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_role_permissions' });
    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        { table: 'admin_role_permissions', defaultLimit: 10, maxLimit: 100, searchable: ['role_id', 'permission'] },
    );
    const { runRequest } = table;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) runRequest();
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    const columns = [
        {
            title: 'Role',
            dataIndex: 'role_id',
            key: 'role_id',
            sorter: true,
            render: (value) => <Tag color="purple">{value}</Tag>,
            ...table.getColumnSearchProps('role_id'),
        },
        {
            title: 'Inherited permission',
            dataIndex: 'permission',
            key: 'permission',
            render: (value) => <Text className="admin-code">{value}</Text>,
            ...table.getColumnSearchProps('permission'),
        },
        {
            title: '',
            key: 'actions',
            width: 112,
            render: (_, record) => (
                <div className="admin-row-actions">
                    <Tooltip title="Edit assignment">
                        <Button aria-label={`Edit ${record.role_id} permission assignment`} icon={<EditOutlined />} onClick={() => recordForm.openEdit('admin_role_permissions', record, record.id)} />
                    </Tooltip>
                    {confirm(
                        record.id,
                        'Remove this role permission?',
                        <Button aria-label={`Remove ${record.permission} from ${record.role_id}`} danger icon={<DeleteOutlined />} />,
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <AdminSectionHeader
                eyebrow="Inheritance map"
                title="Role assignments"
                description="Inspect and maintain the permission records inherited by every member of a role."
                action={<Button type="primary" icon={<PlusOutlined />} onClick={() => recordForm.openCreate('admin_role_permissions')}>Assign permission</Button>}
            />
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Assign permission to role', editTitle: 'Edit assignment' })}
        </div>
    );
}

export default function Permissions() {
    return (
        <PageHeader
            className="admin-page"
            title="Permissions"
            description="Define granular capabilities and inspect how those capabilities are assigned to roles."
            icon={<KeyOutlined />}
            items={[{ title: 'Administration' }, { title: 'Access control' }, { title: 'Permissions' }]}
        >
            <Card className="admin-tabs-card">
                <Tabs
                    items={[
                        { key: 'definitions', label: 'Permission catalogue', children: <PermissionDefinitionsTab /> },
                        { key: 'role_perms', label: 'Role assignments', children: <RolePermissionsTab /> },
                    ]}
                />
            </Card>
        </PageHeader>
    );
}
