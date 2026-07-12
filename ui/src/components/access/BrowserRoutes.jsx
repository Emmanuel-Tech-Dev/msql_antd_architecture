import { useImperativeHandle, forwardRef, useEffect } from 'react';
import { Switch, Typography, Skeleton, Badge } from 'antd';
import useAccessControl from '../../hooks/useAccessControl';

const { Text } = Typography;

const BrowserRoutes = forwardRef(function BrowserRoutes(
    { role, onDirtyChange, onSavingChange },
    ref
) {
    const {
        loading,
        saving,
        isDirty,
        assignedSet,
        allItems: allRoutes,
        handleToggle,
        reset,
        save,
    } = useAccessControl({
        role: role?.role_name,
        fetchEndpoint: `/access/routes/${role?.role_name}`,
        saveEndpoint: '/access/routes/save',
        storeKey: 'routes',
        assignedKey: 'resource',
        entityName: 'Browser routes',
    });

    // Notify parent of dirty/saving state
    useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);
    useEffect(() => { onSavingChange?.(saving); }, [saving, onSavingChange]);

    // ── Expose to parent via ref ──────────────────────────────────────────
    useImperativeHandle(ref, () => ({
        reset,
        save,
        isDirty,
    }), [isDirty, reset, save]);

    if (loading || allRoutes.length === 0) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 4 }}>
                <Text strong style={{ fontSize: 16 }}>Browser Routes</Text>
            </div>
            <Text type="secondary">
                Control which pages <strong>{role?.role_name}</strong> can access.
                Disabled routes are hidden from the sidebar and blocked by the route guard.
            </Text>

            {/* Assigned count + dirty indicator */}
            <div style={{ marginTop: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    <strong>{assignedSet.size}</strong> route{assignedSet.size !== 1 ? 's' : ''} enabled
                </Text>
                {isDirty && (
                    <Badge
                        dot
                        color="orange"
                        text={<Text style={{ fontSize: 11, color: '#f59e0b' }}>unsaved changes</Text>}
                    />
                )}
            </div>

            {/* Routes list - no grouping */}
            <div style={{
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                overflow: 'hidden',
            }}>
                {allRoutes.map((route, i) => {
                    const isEnabled = assignedSet.has(route.resource);
                    return (
                        <div
                            key={route.resource}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                borderBottom: i < allRoutes.length - 1 ? '1px solid #f9fafb' : 'none',
                                background: isEnabled ? '#fff' : '#fafafa',
                                transition: 'background 0.15s',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Text
                                    strong
                                    style={{
                                        fontSize: 13,
                                        color: isEnabled ? '#111827' : '#9ca3af',
                                    }}
                                >
                                    {route.resource}
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'ui-monospace, monospace',
                                        color: '#9ca3af',
                                        marginTop: 1,
                                    }}
                                >
                                    {route.resource_path}
                                </Text>
                            </div>
                            <Switch
                                checked={isEnabled}
                                onChange={(checked) => handleToggle(route.resource, checked)}
                                size="small"
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default BrowserRoutes;
