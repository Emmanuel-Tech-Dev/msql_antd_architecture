import { Table, Checkbox, Tag } from 'antd';

export default function RoutesTab({ allRoutes, assignedIds, onChange, saving }) {
    const assignedSet = new Set(assignedIds);

    const columns = [
        {
            title: 'Access',
            width: 60,
            render: (_, r) => (
                <Checkbox
                    checked={assignedSet.has(r.id)}
                    disabled={saving}
                    onChange={e => {
                        const next = e.target.checked ? [...assignedIds, r.id] : assignedIds.filter(id => id !== r.id);
                        onChange(next);
                    }}
                />
            )
        },
        { title: 'Menu Item', dataIndex: 'resource' },
        { title: 'Route Path', dataIndex: 'resource_path', render: p => <code>{p}</code> },
    ];

    return (
        <Table
            dataSource={allRoutes}
            columns={columns}
            pagination={false}
            size="small"
            rowKey="id"
        />
    );
}