import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { Badge, Checkbox, Empty, Skeleton, Typography } from 'antd';
import CustomTable from '../CustomTable';
import useAccessControl from '../../hooks/useAccessControl';
import useTableApi from '../../hooks/useTableApi';
import './AccessEditor.css';

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
    const table = useTableApi({ pagination: { current: 1, pageSize: 20 } }, { manual: true }, 'resource', {});

    useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange]);
    useEffect(() => onSavingChange?.(saving), [saving, onSavingChange]);
    useImperativeHandle(ref, () => ({ reset, save, isDirty, assignedCount: assignedSet.size }), [assignedSet.size, isDirty, reset, save]);

    const dataSource = useMemo(() => {
        const grouped = {};
        (allPermissions ?? []).forEach((permission) => {
            const [action, resource = 'general'] = String(permission.permission_name ?? '').split(':');
            if (!grouped[resource]) {
                grouped[resource] = {
                    key: resource,
                    resourceLabel: resource.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                    permissions: {},
                };
            }
            grouped[resource].permissions[action] = permission.permission_name;
        });
        return Object.values(grouped).sort((a, b) => a.resourceLabel.localeCompare(b.resourceLabel));
    }, [allPermissions]);

    useEffect(() => table.setRecord(dataSource), [dataSource, table]);

    const renderCheckbox = (record, action) => {
        const permission = record.permissions[action];
        if (!permission) return <span className="access-editor__unavailable" aria-label={`${action} is unavailable`}>—</span>;
        return (
            <Checkbox
                aria-label={`${action} ${record.resourceLabel}`}
                checked={assignedSet.has(permission)}
                onChange={(event) => handleToggle(permission, event.target.checked)}
            />
        );
    };

    const columns = [
        {
            title: 'Resource group',
            dataIndex: 'resourceLabel',
            key: 'resourceLabel',
            render: (value) => <Text strong>{value}</Text>,
        },
        ...['create', 'read', 'update', 'delete'].map((action) => ({
            title: action === 'update' ? 'Edit' : action,
            key: action,
            align: 'center',
            width: 110,
            render: (_, record) => renderCheckbox(record, action),
        })),
    ];

    if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;

    return (
        <section className="access-editor" aria-labelledby="permission-matrix-title">
            <div className="access-editor__heading">
                <div>
                    <Title level={4} id="permission-matrix-title">Permission matrix</Title>
                    <Text type="secondary">Choose the operations inherited by every member of <strong>{role_name}</strong>.</Text>
                </div>
                <div className="access-editor__status">
                    <strong>{assignedSet.size}</strong>
                    <span>assigned</span>
                    {isDirty && <Badge status="warning" text="Unsaved" />}
                </div>
            </div>
            {dataSource.length
                ? <CustomTable showToolbar={false} tableConfig={table} columns={columns} />
                : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No permissions have been registered" />}
        </section>
    );
});

export default PermissionMatrix;
