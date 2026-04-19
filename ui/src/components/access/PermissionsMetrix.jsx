import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Checkbox, Typography, Card, Divider, Skeleton, Space, Button, message } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import useApi from '../../hooks/useApi';

const { Text, Title } = Typography;

export default function PermissionMatrix({ role_name = "SuperAdmin" }) {
    // 1. Initial State
    const [assigned, setAssigned] = useState(null);
    const { data, loading, run } = useApi("get", `/access/permissions/${role_name}`, {});

    useEffect(() => {
        run();
    }, [role_name]);

    // 2. Derive Groups (Prevents re-render errors)
    const groups = useMemo(() => {
        if (!data?.success || !data?.data?.allPermissions) return {};
        return data.data.allPermissions.reduce((acc, p) => {
            const key = p.permission_name.split(':')[0] || 'general';
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
        }, {});
    }, [data]);

    // 3. Set initial assigned state when data arrives
    if (data?.success && assigned === null) {
        setAssigned(data.data.assigned.map(a => a.permission));
    }

    const handleToggle = (name, checked) => {
        const next = checked
            ? [...(assigned || []), name]
            : (assigned || []).filter(p => p !== name);
        setAssigned(next);
    };

    // ─── SAVE HANDLER ──────────────────────────────────────────────────
    const handleSaveConfiguration = () => {
        // Constructing the payload exactly as requested
        const payload = {
            role: role_name,
            permissions: assigned // This is your array of permission strings
        };

        console.log("Saving Configuration:", payload);

        message.success(`Configuration for ${role_name} captured in console!`);

        // Here is where you'd typically call your update API:
        // runSaveApi(payload);
    };

    if (loading || assigned === null) return <Skeleton active paragraph={{ rows: 10 }} />;

    const assignedSet = new Set(assigned);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }}>
                <Title level={4}>Permission Matrix</Title>
                <Text type="secondary">Define what the <b>{role_name}</b> role can perform across the system.</Text>
                <Divider />

                {Object.entries(groups).map(([group, perms]) => (
                    <div key={group} style={{ marginBottom: 32 }}>
                        <Text strong style={{ textTransform: 'uppercase', color: '#1677ff', fontSize: 12, letterSpacing: '1px' }}>
                            {group} ACTIONS
                        </Text>

                        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                            {perms.map(p => {
                                const isChecked = assignedSet.has(p.permission_name);
                                const actionName = p.permission_name.split(':')[1];

                                return (
                                    <Col span={8} key={p.permission_name}>
                                        <Card
                                            size="small"
                                            hoverable
                                            onClick={() => handleToggle(p.permission_name, !isChecked)}
                                            style={{
                                                transition: 'all 0.2s',
                                                border: isChecked ? '1px solid #1677ff' : '1px solid #f0f0f0',
                                                background: isChecked ? '#e6f4ff' : '#fafafa',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Space>
                                                <Checkbox
                                                    checked={isChecked}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={e => handleToggle(p.permission_name, e.target.checked)}
                                                />
                                                <Text strong style={{ textTransform: 'capitalize', fontSize: '13px' }}>
                                                    {actionName}
                                                </Text>
                                            </Space>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    </div>
                ))}
            </div>

            {/* ─── FOOTER SECTION ─── */}
            <Space className='mt-4' style={{ justifyContent: 'flex-end' }}>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => setAssigned(data.data.assigned.map(a => a.permission))}
                >
                    Reset
                </Button>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveConfiguration}
                    style={{ background: '#001529' }}
                >
                    Save Configuration
                </Button>
            </Space>
        </div>
    );
}