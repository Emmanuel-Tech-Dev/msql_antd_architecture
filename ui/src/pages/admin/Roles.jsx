// src/pages/admin/Roles.jsx
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Divider, Space, Tabs } from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, SaveOutlined,
} from '@ant-design/icons';
import CustomTable from '../../components/CustomTable';
import useTableApi from '../../hooks/useTableApi';
import useAdd from '../../hooks/useAdd';
import useEdit from '../../hooks/useEdit';
import useDelete from '../../hooks/useDelete';
import ValuesStore from '../../store/values-store';
import useDrawer from '../../hooks/useDrawer';
import { PageHeader } from '../../components/PageHeader';
import UserLists from '../../components/access/UserLists';
import PermissionMatrix from '../../components/access/PermissionsMetrix';

export default function Roles() {
    const valuesStore = ValuesStore();
    const add = useAdd('tables_metadata', 'table_name');
    const edit = useEdit('tables_metadata', 'table_name');
    const { confirm, saveCompleted: deleteCompleted } = useDelete({ resource: 'admin_roles' });

    const accessDrawer = useDrawer({ width: 500, destroyOnClose: true });

    // ── These live in Roles — re-render on every change ──────────────────
    // matrixRef.current always points to the latest PermissionMatrix instance
    const matrixRef = useRef(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false)

    // ── Track which role is open so footer always has the right label ─────
    const [activeRole, setActiveRole] = useState('');

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: false },
        'id',
        { table: 'admin_roles', defaultLimit: 10, maxLimit: 100, searchable: ['role_name'] }
    );

    useEffect(() => {
        if (add.saveCompleted || edit.saveCompleted || deleteCompleted) table.runRequest();
    }, [add.saveCompleted, edit.saveCompleted, deleteCompleted]);

    function openAdd() {
        add.setTblName('admin_roles');
        add.setShowModal(true);
        add.setSaveCompleted(false);
    }

    function openEdit(record) {
        const key = 'editRole';
        valuesStore.setValue(key, record);
        edit.setTblName('admin_roles');
        edit.setData(record);
        edit.setRecordKey(key);
        edit.setShowModal(true);
        edit.setSaveCompleted(false);
    }

    function openManage(record) {
        setIsDirty(false);
        setActiveRole(record.role_name);

        accessDrawer.openDrawer({
            title: `Manage Access — ${record.role_name}`,
            // ── NO footer here — it's passed live to drawerJSX() below ───
            content: (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {/* <UserLists role_name={record.role_name} /> */}
                    <Card style={{ flex: 1 }}>
                        <Tabs items={[
                            {
                                key: 'permissions',
                                label: 'Permissions',
                                children: (
                                    <PermissionMatrix
                                        key={record.role_name}
                                        ref={matrixRef}
                                        role_name={record.role_name}
                                        onDirtyChange={setIsDirty}
                                        onSavingChange={setIsSaving}
                                    />
                                ),
                            },
                            {
                                key: 'browser_routes',
                                label: 'Browser Routes',
                                children: (
                                    <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>
                                        Browser route management coming soon.
                                    </div>
                                ),
                            },
                        ]} />
                    </Card>
                </div>
            ),
        });
    }

    // ── Live footer — built fresh every render ────────────────────────────
    // Because this is JSX in the render body (not inside a useCallback or
    // openDrawer closure), it always reads the current isDirty and matrixRef.
    // Passed via drawerJSX overrides so the Drawer receives it live.
    const liveFooter = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
                Role: <strong>{activeRole}</strong>
            </span>
            <Space>
                <Button
                    icon={<ReloadOutlined />}
                    disabled={!isDirty}
                    onClick={() => matrixRef.current?.reset()}
                >
                    Reset
                </Button>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => matrixRef.current?.save()}
                    style={{ background: '#001529' }}
                    loading={isSaving}
                >
                    Save Configuration
                </Button>
            </Space>
        </div>
    );

    const columns = [
        {
            title: 'Role Name',
            dataIndex: 'role_name',
            key: 'role_name',
            sorter: true,
            ...table.getColumnSearchProps('role_name'),
            render: (val) => <strong>{val}</strong>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (val) => <span style={{ color: '#6b7280', fontSize: 13 }}>{val ?? '—'}</span>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => openEdit(record)} />
                    {confirm(
                        record.id,
                        'Delete this role?',
                        <Button danger icon={<DeleteOutlined />} />,
                    )}
                    <Divider type="vertical" />
                    <Button variant="outlined" onClick={() => openManage(record)}>
                        Manage Access
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                header="Access Control"
                items={[{ title: 'Manage system roles and permissions' }]}
            >
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                    style={{ background: '#141414', borderColor: '#141414' }}
                >
                    Add Role
                </Button>
            </PageHeader>

            <div className="mt-6">
                <CustomTable tableConfig={table} columns={columns} />
            </div>

            {add.addModal('Add Role', () => add.save('admin_roles'))}
            {edit.editModal('Edit Role', () => edit.save(undefined, edit.record?.id, 'admin_roles'))}

            {/* ── footer passed as live override — reads current isDirty + matrixRef ── */}
            {accessDrawer.drawerJSX({ footer: liveFooter })}
        </div>
    );
}