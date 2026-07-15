import { useEffect } from 'react';
import { Button, Card, Space, Tabs, Tag, Tooltip, Typography } from 'antd';
import {
    ApiOutlined,
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    LinkOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import { PageHeader } from '../../components/PageHeader';
import useDelete from '../../hooks/useDelete';
import useIcons from '../../hooks/useIcons';
import useRecordForm from '../../hooks/useRecordForm';
import useTableApi from '../../hooks/useTableApi';
import { AdminEntity, AdminSectionHeader } from './AdminWorkspace';
import './AdminWorkspace.css';

const { Text } = Typography;
const METHOD_COLORS = { GET: 'green', POST: 'blue', PUT: 'orange', PATCH: 'gold', DELETE: 'red', ALL: 'purple' };

function ResourcesList() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_resources' });
    const { resolveIcon } = useIcons();
    const table = useTableApi(
        { pagination: { current: 1, pageSize: 20 } },
        { manual: false },
        'id',
        { table: 'admin_resources', defaultLimit: 20, maxLimit: 100, searchable: ['resource'] },
    );
    const { runRequest } = table;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) runRequest();
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    const columns = [
        {
            title: 'Resource',
            dataIndex: 'resource',
            key: 'resource',
            ...table.getColumnSearchProps('resource'),
            render: (value, record) => (
                <AdminEntity
                    title={value}
                    description={record.resource_path || 'No path configured'}
                    leading={resolveIcon(record.icon) || <ApiOutlined />}
                />
            ),
        },
        {
            title: 'Type',
            dataIndex: 'resource_type',
            key: 'resource_type',
            render: (value) => <Tag>{String(value || 'Unknown').replaceAll('_', ' ')}</Tag>,
            ...table.getColumnFilterProps('resource_type', 'system_resources'),
        },
        {
            title: 'Method',
            dataIndex: 'http_method',
            key: 'http_method',
            width: 100,
            render: (value) => value
                ? <Tag color={METHOD_COLORS[value] || 'default'}>{value}</Tag>
                : <span className="admin-muted">—</span>,
        },
        {
            title: 'Exposure',
            dataIndex: 'is_public',
            key: 'is_public',
            width: 110,
            render: (value) => <Tag color={Number(value) === 1 ? 'success' : 'default'}>{Number(value) === 1 ? 'Public' : 'Protected'}</Tag>,
        },
        {
            title: 'Navigation',
            dataIndex: 'show_in_nav',
            key: 'show_in_nav',
            width: 120,
            render: (value, record) => record.resource_type === 'BROWSER_ROUTE'
                ? <Tag icon={Number(value) === 1 ? <EyeOutlined /> : <EyeInvisibleOutlined />}>{Number(value) === 1 ? 'Visible' : 'Hidden'}</Tag>
                : <span className="admin-muted">Not applicable</span>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (value) => <Text type="secondary">{value || 'Uncategorized'}</Text>,
        },
        {
            title: '',
            key: 'actions',
            width: 112,
            fixed: 'right',
            render: (_, record) => (
                <div className="admin-row-actions">
                    <Tooltip title="Edit resource">
                        <Button aria-label={`Edit ${record.resource}`} icon={<EditOutlined />} onClick={() => recordForm.openEdit('admin_resources', record, record.id)} />
                    </Tooltip>
                    {confirm(
                        record.id,
                        'Delete this resource?',
                        <Button aria-label={`Delete ${record.resource}`} danger icon={<DeleteOutlined />} />,
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <AdminSectionHeader
                eyebrow="Protected surface"
                title="Resource catalogue"
                description="Register API endpoints, browser routes, and data objects before attaching permission policies."
                action={<Button type="primary" icon={<PlusOutlined />} onClick={() => recordForm.openCreate('admin_resources')}>Add resource</Button>}
            />
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Add resource', editTitle: 'Edit resource' })}
        </div>
    );
}

function PermissionResourcesTab() {
    const recordForm = useRecordForm('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_permission_resources' });
    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        { table: 'admin_permission_resources', defaultLimit: 10, maxLimit: 100, searchable: ['permission', 'resource'] },
    );
    const { runRequest } = table;

    useEffect(() => {
        if (recordForm.saveCompleted || deleteCompleted) runRequest();
    }, [recordForm.saveCompleted, deleteCompleted, runRequest]);

    const columns = [
        {
            title: 'Permission',
            dataIndex: 'permission',
            key: 'permission',
            render: (value) => <Text className="admin-code">{value}</Text>,
            ...table.getColumnSearchProps('permission'),
        },
        {
            title: 'Protected resource',
            dataIndex: 'resource',
            key: 'resource',
            render: (value) => <AdminEntity title={value} description="Policy target" leading={<LinkOutlined />} />,
            ...table.getColumnSearchProps('resource'),
        },
        {
            title: '',
            key: 'actions',
            width: 112,
            render: (_, record) => (
                <div className="admin-row-actions">
                    <Tooltip title="Edit policy link">
                        <Button aria-label={`Edit ${record.permission} resource assignment`} icon={<EditOutlined />} onClick={() => recordForm.openEdit('admin_permission_resources', record, record.id)} />
                    </Tooltip>
                    {confirm(
                        record.id,
                        'Remove this resource assignment?',
                        <Button aria-label={`Remove ${record.resource} from ${record.permission}`} danger icon={<DeleteOutlined />} />,
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <AdminSectionHeader
                eyebrow="Enforcement map"
                title="Permission-to-resource links"
                description="Connect permission names to the concrete routes and resources enforced by authorization middleware."
                action={<Button type="primary" icon={<PlusOutlined />} onClick={() => recordForm.openCreate('admin_permission_resources')}>Link resource</Button>}
            />
            <CustomTable tableConfig={table} columns={columns} />
            {recordForm.recordModal({ createTitle: 'Link resource to permission', editTitle: 'Edit resource link' })}
        </div>
    );
}

export default function Resources() {
    return (
        <PageHeader
            className="admin-page"
            title="Resources"
            description="Catalogue API endpoints, browser routes, data objects, and the permissions that protect them."
            icon={<ApiOutlined />}
            items={[{ title: 'Administration' }, { title: 'Access control' }, { title: 'Resources' }]}
        >
            <Card className="admin-tabs-card">
                <Tabs
                    items={[
                        { key: 'definitions', label: 'Resource catalogue', children: <ResourcesList /> },
                        { key: 'permission_resources', label: 'Policy links', children: <PermissionResourcesTab /> },
                    ]}
                />
            </Card>
        </PageHeader>
    );
}
