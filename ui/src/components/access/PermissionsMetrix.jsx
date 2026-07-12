import { useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { Checkbox, Typography, Divider, Skeleton, Badge } from 'antd';
import useAccessControl from '../../hooks/useAccessControl';
import useTableApi from '../../hooks/useTableApi';
import CustomTable from '../CustomTable';

const { Text, Title } = Typography;

const PermissionMatrix = forwardRef(function PermissionMatrix({ role_name, onDirtyChange, onSavingChange }, ref) {
    const {
        loading,
        saving,
        isDirty,
        assignedSet,
        allItems: allPermissions,
        handleToggle,
        reset,
        save,
    } = useAccessControl({
        role: role_name,
        fetchEndpoint: `/access/permissions/${role_name}`,
        saveEndpoint: '/access/permissions/save',
        storeKey: 'permissions',
        assignedKey: 'permission',
        entityName: 'Permissions',
    });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 20 } },
        { manual: true },
        'resource',
        {}
    );

    // Notify parent of dirty/saving state
    useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);
    useEffect(() => { onSavingChange?.(saving); }, [saving, onSavingChange]);

    // ── Expose reset() and save() to parent via ref ───────────────────────
    useImperativeHandle(ref, () => ({
        reset,
        save: () => {
            save();
            return { role: role_name, permissions: [...assignedSet] };
        },
        isDirty,
        assignedCount: assignedSet.size,
    }), [isDirty, assignedSet, role_name, save, reset]);

    // ── Build Table Data Source from permissions ──────────────────────────
    const dataSource = useMemo(() => {
        if (!allPermissions || allPermissions.length === 0) return [];

        const map = {};

        allPermissions.forEach(p => {
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
    }, [allPermissions]);

    // Helper to render the checkbox cell
    const renderCheckbox = (record, action) => {
        const permName = record.permissions[action];

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
            render: (_, record) => renderCheckbox(record, 'update'),
        },
        {
            title: 'Delete',
            key: 'delete',
            align: 'center',
            width: 120,
            render: (_, record) => renderCheckbox(record, 'delete'),
        }
    ];

    useEffect(() => {
        table.setRecord(dataSource);
    }, [dataSource, table]);

    if (loading || dataSource.length === 0) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    return (
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
            <CustomTable tableConfig={table} columns={columns} />
        </div>
    );
});

export default PermissionMatrix;
