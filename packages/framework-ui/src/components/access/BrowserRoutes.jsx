import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { Badge, Empty, Skeleton, Switch, Typography } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import useAccessControl from '../../hooks/useAccessControl';
import {
    ACCESS_HEADING_CLASS,
    ACCESS_ROUTE_CLASS,
    ACCESS_ROUTE_COPY_CLASS,
    ACCESS_ROUTE_LIST_CLASS,
    ACCESS_STATUS_CLASS,
} from './accessTailwind';

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
        <section aria-labelledby="browser-routes-title">
            <div className={ACCESS_HEADING_CLASS}>
                <div>
                    <Title level={4} id="browser-routes-title">Navigation access</Title>
                    <Text type="secondary">Enabled pages are available to <strong>{role?.role_name}</strong> and can appear in navigation when the resource is visible.</Text>
                </div>
                <div className={ACCESS_STATUS_CLASS}>
                    <strong>{assignedSet.size}</strong>
                    <span>enabled</span>
                    {isDirty && <Badge status="warning" text="Unsaved" />}
                </div>
            </div>

            {allRoutes.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No browser routes have been registered" />
            ) : (
                <div className={ACCESS_ROUTE_LIST_CLASS}>
                    {allRoutes.map((route) => {
                        const isEnabled = assignedSet.has(route.resource);
                        return (
                            <div className={`${ACCESS_ROUTE_CLASS} ${isEnabled ? 'bg-[var(--color-bg-container)] opacity-100' : ''}`} key={route.resource}>
                                <span className={`grid size-9 place-items-center rounded-[var(--app-radius)] ${isEnabled ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]' : 'bg-[var(--color-bg-sunken)] text-[var(--color-text-tertiary)]'}`} aria-hidden="true"><GlobalOutlined /></span>
                                <span className={ACCESS_ROUTE_COPY_CLASS}>
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
