// src/components/access/PermissionsMetrix.jsx
import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Checkbox, Typography, Card, Divider, Skeleton, Space, Button, Badge } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import useApi from '../../hooks/useApi';
import ValuesStore from "../../store/values-store"

const { Text, Title } = Typography;

export default function PermissionMatrix({ role_name }) {
    // ── Fetch: allPermissions (every permission in system) + assigned (this role's) ──
    // GET /access/permissions/:role_name returns:
    // { success, data: { allPermissions: [{permission_name, description}], assigned: [{permission}] } }

    const valuesStore = ValuesStore()

    const { data, loading, run } = useApi('get', `/access/permissions/${role_name}`);

    console.log(data)

    useEffect(() => {
        run();
    }, []);
    // Note: role_name changes force a remount via key={role_name} in Roles.jsx
    // so this effect only ever needs to fire once per mount — no [role_name] dep needed

    // ── Derive the original assigned set from API ─────────────────────────
    // admin_role_permissions.permission = "create:admin"
    // admin_permissions.permission_name = "create:admin"  ← same value, different column names
    const originalAssigned = useMemo(() => {
        if (!data?.data?.assigned) return null;
        // Build a Set of permission strings e.g. Set{"create:admin", "read:roles"}
        return new Set(data.data.assigned.map(a => a.permission));
    }, [data]);

    // ── Group ALL permissions by resource (part after colon) ──────────────
    // "create:admin"         → group "Admin"
    // "read:admin_resources" → group "Admin Resources"
    // "read:roles"           → group "Roles"
    const groups = useMemo(() => {
        const perm = valuesStore.getValue("permissions")
        if (!perm) return {};
        return perm?.reduce((acc, p) => {
            const [action, resource = 'general'] = (p.permission_name ?? '').split(':');
            const label = resource
                .split('_')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            if (!acc[label]) acc[label] = [];
            acc[label].push(p);
            return acc;
        }, {});
    }, [data]);

    // ── Track user changes as a delta on top of originalAssigned ─────────
    // This avoids useState(null) + seeding effects entirely.
    // added   = permissions the user checked that weren't originally assigned
    // removed = permissions the user unchecked that were originally assigned
    const [added, setAdded] = useState(() => new Set());
    const [removed, setRemoved] = useState(() => new Set());

    // ── Effective assigned = original + added - removed ───────────────────
    const assignedSet = useMemo(() => {
        if (!originalAssigned) return new Set();
        const result = new Set(originalAssigned);
        added.forEach(p => result.add(p));
        removed.forEach(p => result.delete(p));
        return result;
    }, [originalAssigned, added, removed]);

    // ── Toggle a single permission ────────────────────────────────────────
    const handleToggle = (permName, checked) => {
        if (checked) {
            // User is checking it — add to `added`, remove from `removed`
            setAdded(prev => new Set([...prev, permName]));
            setRemoved(prev => { const s = new Set(prev); s.delete(permName); return s; });
        } else {
            // User is unchecking it — add to `removed`, remove from `added`
            setRemoved(prev => new Set([...prev, permName]));
            setAdded(prev => { const s = new Set(prev); s.delete(permName); return s; });
        }
    };

    // ── Reset clears all deltas — originalAssigned drives checkboxes again ─
    const handleReset = () => {
        setAdded(new Set());
        setRemoved(new Set());
    };

    const handleSave = () => {
        const payload = {
            role: role_name,
            permissions: [...assignedSet], // full effective list
        };
        console.log('Saving configuration:', payload);
        // TODO: wire to your save endpoint e.g. runSave(payload)
    };

    const isDirty = added.size > 0 || removed.size > 0;

    // ── Show skeleton until both queries resolve ───────────────────────────
    if (loading || !originalAssigned) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 4 }}>
                    <Title level={4} style={{ margin: 0 }}>Permission Matrix</Title>
                </div>
                <Text type="secondary">
                    Define what the <strong>{role_name}</strong> role can perform across the system.
                </Text>
                <Divider />

                {Object.entries(groups).map(([group, perms]) => (
                    <div key={group} style={{ marginBottom: 28 }}>
                        {/* Group label = resource name e.g. "Admin", "Roles", "Admin Resources" */}
                        <Text
                            strong
                            style={{
                                textTransform: 'uppercase',
                                color: '#1677ff',
                                fontSize: 11,
                                letterSpacing: '1px',
                            }}
                        >
                            {group}
                        </Text>

                        <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
                            {perms.map(p => {
                                // isChecked: true if this permission_name is in the effective assignedSet
                                // assignedSet is built from admin_role_permissions.permission strings
                                // which are the same values as admin_permissions.permission_name
                                const isChecked = assignedSet.has(p.permission_name);

                                // Display the action part e.g. "create", "read", "delete"
                                const action = (p.permission_name ?? '').split(':')[0];

                                return (
                                    <Col span={4} key={p.permission_name}>

                                        <Space align="start">
                                            <Checkbox
                                                checked={isChecked}
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => handleToggle(p.permission_name, e.target.checked)}
                                            />
                                            <div>
                                                <Text
                                                    strong
                                                    style={{ textTransform: 'capitalize', fontSize: 13, display: 'block' }}
                                                >
                                                    {action}
                                                </Text>

                                            </div>
                                        </Space>

                                    </Col>
                                );
                            })}
                        </Row>
                    </div>
                ))}
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        <strong>{assignedSet.size}</strong> permission{assignedSet.size !== 1 ? 's' : ''} assigned
                    </Text>
                    {isDirty && (
                        <Badge
                            dot
                            color="orange"
                            text={
                                <Text style={{ fontSize: 11, color: '#f59e0b' }}>
                                    unsaved changes
                                </Text>
                            }
                        />
                    )}
                </Space>
                <Space>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={handleReset}
                        disabled={!isDirty}
                    >
                        Reset
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        style={{ background: '#001529' }}
                    >
                        Save Configuration
                    </Button>
                </Space>
            </Space>
        </div>
    );
}