import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Badge, Empty, Skeleton, Switch, Typography } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import useAccessControl from '../../hooks/useAccessControl';
import './AccessEditor.css';

const { Text, Title } = Typography;

const BrowserRoutes = forwardRef(function BrowserRoutes({ role, onDirtyChange, onSavingChange }, ref) {
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

    useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
    useEffect(() => onSavingChange?.(saving), [saving, onSavingChange]);
    useImperativeHandle(ref, () => ({ reset, save, isDirty }), [isDirty, reset, save]);

    if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

    return (
        <section className="access-editor" aria-labelledby="browser-routes-title">
            <div className="access-editor__heading">
                <div>
                    <Title level={4} id="browser-routes-title">Navigation access</Title>
                    <Text type="secondary">Enabled pages are available to <strong>{role?.role_name}</strong> and can appear in navigation when the resource is visible.</Text>
                </div>
                <div className="access-editor__status">
                    <strong>{assignedSet.size}</strong>
                    <span>enabled</span>
                    {isDirty && <Badge status="warning" text="Unsaved" />}
                </div>
            </div>

            {allRoutes.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No browser routes have been registered" />
            ) : (
                <div className="access-editor__route-list">
                    {allRoutes.map((route) => {
                        const isEnabled = assignedSet.has(route.resource);
                        return (
                            <div className={`access-editor__route ${isEnabled ? 'is-enabled' : ''}`} key={route.resource}>
                                <span className="access-editor__route-icon" aria-hidden="true"><GlobalOutlined /></span>
                                <span className="access-editor__route-copy">
                                    <strong>{route.resource}</strong>
                                    <code title={route.resource_path}>{route.resource_path}</code>
                                </span>
                                <Switch
                                    aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${route.resource}`}
                                    checked={isEnabled}
                                    onChange={(checked) => handleToggle(route.resource, checked)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
});

export default BrowserRoutes;
