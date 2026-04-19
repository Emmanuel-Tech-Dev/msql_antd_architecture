import React, { useState, useMemo } from 'react';
import {
    Tabs, Table, Checkbox, Button, Typography,
    Badge, Space, Card, Row, Col, Tag, Avatar, Divider
} from 'antd';
import {
    KeyOutlined, GlobalOutlined, SaveOutlined,
    TeamOutlined, SafetyCertificateOutlined, AppstoreOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

// ─── DUMMY DATA (Reflecting your MySQL Schema) ──────────────────────────
const DUMMY_PERMISSIONS = [
    { permission_name: 'create:admin', description: 'Create staff accounts' },
    { permission_name: 'read:admin', description: 'View staff list' },
    { permission_name: 'update:admin', description: 'Edit staff roles' },
    { permission_name: 'delete:admin', description: 'Remove staff members' },
    { permission_name: 'create:products', description: 'Add new inventory items' },
    { permission_name: 'read:products', description: 'View inventory' },
    { permission_name: 'update:settings', description: 'Modify system config' },
    { permission_name: 'read:settings', description: 'View system config' },
];

const DUMMY_ROUTES = [
    { id: 1, resource: 'Dashboard', resource_path: '/dashboard' },
    { id: 2, resource: 'Staff Management', resource_path: '/staff' },
    { id: 3, resource: 'Inventory', resource_path: '/inventory' },
    { id: 4, resource: 'System Settings', resource_path: '/settings' },
];

// ─── COMPONENT 1: PERMISSION MATRIX ──────────────────────────────────────
const PermissionMatrix = ({ assigned, onChange }) => {
    const groups = useMemo(() => {
        return DUMMY_PERMISSIONS.reduce((acc, p) => {
            const groupName = p.permission_name.split(':')[0].toUpperCase();
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(p);
            return acc;
        }, {});
    }, []);

    return (
        <div style={{ padding: '16px 0' }}>
            {Object.entries(groups).map(([group, perms]) => (
                <div key={group} style={{ marginBottom: 24 }}>
                    <Text strong style={{ color: '#8c8c8c', letterSpacing: '1px' }}>{group}</Text>
                    <Divider style={{ margin: '8px 0 16px 0' }} />
                    <Row gutter={[16, 16]}>
                        {perms.map(p => {
                            const isActive = assigned.includes(p.permission_name);
                            return (
                                <Col span={12} key={p.permission_name}>
                                    <Card
                                        size="small"
                                        hoverable
                                        style={{
                                            borderLeft: isActive ? '4px solid #1677ff' : '4px solid #f0f0f0',
                                            transition: '0.3s'
                                        }}
                                        onClick={() => {
                                            const next = isActive
                                                ? assigned.filter(item => item !== p.permission_name)
                                                : [...assigned, p.permission_name];
                                            onChange(next);
                                        }}
                                    >
                                        <Space align="start">
                                            <Checkbox checked={isActive} />
                                            <div>
                                                <Text strong style={{ display: 'block', fontSize: 13 }}>
                                                    {p.permission_name.split(':')[1].toUpperCase()}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{p.description}</Text>
                                            </div>
                                        </Space>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </div>
            ))}
        </div>
    );
};

// ─── COMPONENT 2: BROWSER ROUTES TAB ────────────────────────────────────
const RoutesTab = ({ assignedIds, onChange }) => {
    const columns = [
        {
            title: 'Status',
            width: 80,
            render: (_, r) => (
                <Checkbox
                    checked={assignedIds.includes(r.id)}
                    onChange={(e) => {
                        const next = e.target.checked
                            ? [...assignedIds, r.id]
                            : assignedIds.filter(id => id !== r.id);
                        onChange(next);
                    }}
                />
            )
        },
        {
            title: 'Menu Label',
            dataIndex: 'resource',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Browser Path',
            dataIndex: 'resource_path',
            render: (text) => <code style={{ color: '#eb2f96' }}>{text}</code>
        },
        {
            title: 'Visible',
            render: (_, r) => assignedIds.includes(r.id)
                ? <Tag color="green">VISIBLE</Tag>
                : <Tag color="default">HIDDEN</Tag>
        }
    ];

    return <Table dataSource={DUMMY_ROUTES} columns={columns} pagination={false} size="small" rowKey="id" />;
};

// ─── MAIN COMPONENT: ROLE MANAGEMENT DRAWER ─────────────────────────────
export default function RoleManagementFullUI() {
    const [activePerms, setActivePerms] = useState(['read:admin', 'read:products', 'read:settings']);
    const [activeRoutes, setActiveRoutes] = useState([1, 2]);

    const tabItems = [
        {
            key: '1',
            label: (
                <Space>
                    <SafetyCertificateOutlined />
                    Permissions
                    <Badge count={activePerms.length} color="#1677ff" size="small" />
                </Space>
            ),
            children: <PermissionMatrix assigned={activePerms} onChange={setActivePerms} />
        },
        {
            key: '2',
            label: (
                <Space>
                    <AppstoreOutlined />
                    Navigation
                    <Badge count={activeRoutes.length} color="#52c41a" size="small" />
                </Space>
            ),
            children: <RoutesTab assignedIds={activeRoutes} onChange={setActiveRoutes} />
        }
    ];

    return (
        <Card
            style={{ maxWidth: 800, margin: '20px auto', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            title={
                <Space direction="vertical" size={0}>
                    <Title level={4} style={{ margin: 0 }}>Super Admin Role</Title>
                    <Text type="secondary">Manage what this role can do and see in the sidebar</Text>
                </Space>
            }
        >
            <Tabs
                defaultActiveKey="1"
                items={tabItems}
                type="card"
                style={{ minHeight: 400 }}
            />

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button>Reset Changes</Button>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    style={{ background: '#141414', borderColor: '#141414' }}
                    onClick={() => console.log('Saving to DB:', { activePerms, activeRoutes })}
                >
                    Save Configurations
                </Button>
            </div>
        </Card>
    );
}