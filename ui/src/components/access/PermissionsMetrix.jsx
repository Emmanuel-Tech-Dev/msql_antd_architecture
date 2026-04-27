// src/components/access/PermissionsMetrix.jsx
import { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Row, Col, Checkbox, Typography, Divider, Skeleton, Space, Badge } from 'antd';
import useApi from '../../hooks/useApi';
import ValuesStore from '../../store/values-store';
import useCreate from '../../core/hooks/data/useCreate';
import { useCustom } from '../../core/hooks/data/useCustom';
import useNotification from '../../hooks/useNotification';
import { SkeletonWrapper } from 'react-skeletonify';

const { Text, Title } = Typography;

// ── forwardRef so Roles.jsx can call matrixRef.current.reset() / .save() ──
const PermissionMatrix = forwardRef(function PermissionMatrix({ role_name, onDirtyChange, onSavingChange }, ref) {
    const { message } = useNotification()
    const valuesStore = ValuesStore();
    const { data, loading, run } = useApi('get', `/access/permissions/${role_name}`);

    const { run: runSave, loading: saving } = useApi('post', '/access/permissions/save', {
        onSuccess: () => {
            // clear dirty state — original is now what was just saved
            setAdded(new Set());
            setRemoved(new Set());
            onDirtyChange?.(false);
            onSavingChange?.(false);
            message.success(`New permissions assigned to ${role_name}`)
            run()
        },
        onError: (err) => {
            message.error('Save failed');
            console.log(err)
        },
    });

    useEffect(() => { run(); }, []);

    // ── originalAssigned — seeded from API assigned list ─────────────────
    const originalAssigned = useMemo(() => {
        if (!data?.data?.assigned) return null;
        return new Set(data.data.assigned.map(a => a.permission));
    }, [data]);

    // ── All permissions from valuesStore (bootstrapped at login) ─────────
    const groups = useMemo(() => {
        const perms = valuesStore.getValue('permissions');
        if (!perms) return {};
        return perms.reduce((acc, p) => {
            const [, resource = 'general'] = (p.permission_name ?? '').split(':');
            const label = resource
                .split('_')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
            if (!acc[label]) acc[label] = [];
            acc[label].push(p);
            return acc;
        }, {});
    }, [data]);

    // ── Delta tracking — no setState in effects ───────────────────────────
    const [added, setAdded] = useState(() => new Set());
    const [removed, setRemoved] = useState(() => new Set());

    const assignedSet = useMemo(() => {
        if (!originalAssigned) return new Set();
        const result = new Set(originalAssigned);
        added.forEach(p => result.add(p));
        removed.forEach(p => result.delete(p));
        return result;
    }, [originalAssigned, added, removed]);

    const isDirty = added.size > 0 || removed.size > 0;

    // Notify parent when dirty state changes (drives footer Reset disabled state)
    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty]);

    useEffect(() => {
        onSavingChange?.(saving)
    }, [saving])

    const handleToggle = (permName, checked) => {
        if (checked) {
            setAdded(prev => new Set([...prev, permName]));
            setRemoved(prev => { const s = new Set(prev); s.delete(permName); return s; });
        } else {
            setRemoved(prev => new Set([...prev, permName]));
            setAdded(prev => { const s = new Set(prev); s.delete(permName); return s; });
        }
    };

    // ── Expose reset() and save() to parent via ref ───────────────────────
    // Parent (Roles.jsx) calls matrixRef.current.reset() from footer button
    useImperativeHandle(ref, () => ({
        reset: () => {
            setAdded(new Set());
            setRemoved(new Set());
        },
        save: async () => {
            const payload = {
                role: role_name,
                permissions: [...assignedSet],
            };

            console.log('Saving configuration:', payload);
            runSave(payload)
            return payload;
        },
        isDirty,
        assignedCount: assignedSet.size,
    }), [isDirty, assignedSet, role_name]);

    if (loading || !originalAssigned) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    return (
        <SkeletonWrapper loading={saving}>
            <div>
                {/* Header */}
                <div style={{ marginBottom: 4 }}>
                    <Title level={4} style={{ margin: 0 }}>Permission Matrix</Title>
                </div>
                <Text type="secondary">
                    Define what the <strong>{role_name}</strong> role can perform across the system.
                </Text>

                {/* Assigned count + dirty indicator */}
                <div style={{ marginTop: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        <strong>{assignedSet.size}</strong> permission{assignedSet.size !== 1 ? 's' : ''} assigned
                    </Text>
                    {isDirty && (
                        <Badge
                            dot
                            color="orange"
                            text={<Text style={{ fontSize: 11, color: '#f59e0b' }}>unsaved changes</Text>}
                        />
                    )}
                </div>

                <Divider style={{ margin: '0 0 20px' }} />

                {/* Permission groups — this scrolls inside the drawer body */}
                {Object.entries(groups).map(([group, perms]) => (
                    <div key={group} style={{ marginBottom: 28 }}>
                        <Text
                            strong
                            style={{
                                textTransform: 'uppercase',
                                color: '#1677ff',
                                fontSize: 11,
                                letterSpacing: '1px',
                                display: 'block',
                                marginBottom: 10,
                            }}
                        >
                            {group}
                        </Text>

                        <Row gutter={[12, 12]}>
                            {perms.map(p => {
                                const isChecked = assignedSet.has(p.permission_name);
                                const action = (p.permission_name ?? '').split(':')[0];
                                return (
                                    <Col span={6} key={p.permission_name}>
                                        <Space align="start">
                                            <Checkbox
                                                checked={isChecked}
                                                onChange={e => handleToggle(p.permission_name, e.target.checked)}
                                            />
                                            <Text
                                                strong
                                                style={{ textTransform: 'capitalize', fontSize: 13 }}
                                            >
                                                {action}
                                            </Text>
                                        </Space>
                                    </Col>
                                );
                            })}
                        </Row>
                    </div>
                ))}
            </div>
        </SkeletonWrapper>

    );
});

export default PermissionMatrix;