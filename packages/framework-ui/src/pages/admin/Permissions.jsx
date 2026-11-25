import { Card, Tabs, Tag, Typography } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import MetadataTable from '../../components/metadata/MetadataTable';
import { PageHeader } from '../../components/PageHeader';
import { AdminEntity, AdminSectionHeader } from './AdminWorkspace';
import './AdminWorkspace.css';

const { Text } = Typography;

// Lists, forms, validation and lookups come from the tables' metadata; the
// page adds only its own presentation.
const PERMISSION_COLUMNS = {
    permission_name: {
        title: 'Permission',
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
    description: {
        title: 'Purpose',
        sorter: false,
        render: (value) => <Text type="secondary">{value || 'No description provided'}</Text>,
    },
};

const ROLE_PERMISSION_COLUMNS = {
    role_id: { render: (value) => <Tag color="purple">{value}</Tag> },
    permission: { title: 'Inherited permission', render: (value) => <Text className="admin-code">{value}</Text> },
};

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
                        {
                            key: 'definitions',
                            label: 'Permission catalogue',
                            children: (
                                <MetadataTable
                                    table="admin_permissions"
                                    columns={PERMISSION_COLUMNS}
                                    header={({ addButton }) => (
                                        <AdminSectionHeader
                                            eyebrow="Capability catalogue"
                                            title="Permission definitions"
                                            description="Create stable, action-oriented capabilities that roles and direct user authority can reference."
                                            action={addButton}
                                        />
                                    )}
                                />
                            ),
                        },
                        {
                            key: 'role_perms',
                            label: 'Role assignments',
                            children: (
                                <MetadataTable
                                    table="admin_role_permissions"
                                    columns={ROLE_PERMISSION_COLUMNS}
                                    addLabel="Assign permission"
                                    addTitle="Assign permission to role"
                                    editTitle="Edit assignment"
                                    header={({ addButton }) => (
                                        <AdminSectionHeader
                                            eyebrow="Inheritance map"
                                            title="Role assignments"
                                            description="Inspect and maintain the permission records inherited by every member of a role."
                                            action={addButton}
                                        />
                                    )}
                                />
                            ),
                        },
                    ]}
                />
            </Card>
        </PageHeader>
    );
}
