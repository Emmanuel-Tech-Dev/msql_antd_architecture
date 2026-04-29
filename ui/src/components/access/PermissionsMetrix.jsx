// src/components/access/PermissionsMetrix.jsx
import { useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Table, Checkbox, Typography, Divider, Skeleton, Badge } from 'antd';
import useApi from '../../hooks/useApi';
import ValuesStore from '../../store/values-store';
import useNotification from '../../hooks/useNotification';
import { SkeletonWrapper } from 'react-skeletonify';

const { Text, Title } = Typography;

// ── forwardRef so Roles.jsx can call matrixRef.current.reset() / .save() ──
const PermissionMatrix = forwardRef(function PermissionMatrix({ role_name, onDirtyChange, onSavingChange }, ref) {
    const { message } = useNotification();
    const valuesStore = ValuesStore();
    const { data, loading, run } = useApi('get', `/access/permissions/${role_name}`);

    const { run: runSave, loading: saving } = useApi('post', '/access/permissions/save', {
        onSuccess: () => {
            // clear dirty state — original is now what was just saved
            setAdded(new Set());
            setRemoved(new Set());
            onDirtyChange?.(false);
            onSavingChange?.(false);
            message.success(`New permissions assigned to ${role_name}`);
            run();
        },
        onError: (err) => {
            message.error('Save failed');
            console.log(err);
        },
    });

    useEffect(() => { run(); }, []);

    // ── originalAssigned — seeded from API assigned list ─────────────────
    const originalAssigned = useMemo(() => {
        if (!data?.data?.assigned) return null;
        return new Set(data.data.assigned.map(a => a.permission));
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
        onSavingChange?.(saving);
    }, [saving]);

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
            runSave(payload);
            return payload;
        },
        isDirty,
        assignedCount: assignedSet.size,
    }), [isDirty, assignedSet, role_name]);

    // ── Build Table Data Source from ValuesStore ──────────────────────────
    const dataSource = useMemo(() => {
        const perms = valuesStore.getValue('permissions');
        if (!perms) return [];

        const map = {};

        perms.forEach(p => {
            const [action, resource = 'general'] = (p.permission_name ?? '').split(':');
            const label = resource
                .split('_')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');

            if (!map[resource]) {
                map[resource] = {
                    key: resource,
                    resourceLabel: label,
                    permissions: {} // stores the exact permission string (e.g., { create: 'create:users' })
                };
            }

            map[resource].permissions[action] = p.permission_name;
        });

        // Sort alphabetically by resource for consistent UI rendering
        return Object.values(map).sort((a, b) => a.resourceLabel.localeCompare(b.resourceLabel));
    }, [valuesStore]);

    // Helper to render the checkbox cell
    const renderCheckbox = (record, action) => {
        const permName = record.permissions[action];
        console.log('Rendering checkbox for', record.resourceLabel, action, '->', permName);

        // If the resource doesn't support this action (e.g., no 'delete:reports' exists), show a dash
        if (!permName) return <Text type="secondary" style={{ opacity: 0.3 }}>-</Text>;

        return (
            <Checkbox
                checked={assignedSet.has(permName)}
                onChange={e => handleToggle(permName, e.target.checked)}
            />
        );
    };

    const columns = [
        {
            title: 'Resource',
            dataIndex: 'resourceLabel',
            key: 'resourceLabel',
            render: text => (
                <Text strong style={{
                    textTransform: 'uppercase',
                    color: '#1677ff',
                    fontSize: 12,
                    letterSpacing: '0.5px'
                }}>
                    {text}
                </Text>
            ),
        },
        {
            title: 'Create',
            key: 'create',
            align: 'center',
            width: 120,
            render: (_, record) => renderCheckbox(record, 'create'),
        },
        {
            title: 'Read',
            key: 'read',
            align: 'center',
            width: 120,
            render: (_, record) => renderCheckbox(record, 'read'),
        },
        {
            title: 'Edit',
            key: 'edit',
            align: 'center',
            width: 120,
            render: (_, record) => renderCheckbox(record, 'edit'),
        },
        {
            title: 'Delete',
            key: 'delete',
            align: 'center',
            width: 120,
            render: (_, record) => renderCheckbox(record, 'delete'),
        }
    ];

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

                {/* Table replacing the previous Row/Col grid layout */}
                <Table
                    columns={columns}
                    dataSource={dataSource}
                    pagination={false}
                    size="small"

                    rowClassName={() => 'permission-matrix-row'}
                />
            </div>
        </SkeletonWrapper>
    );
});

export default PermissionMatrix;