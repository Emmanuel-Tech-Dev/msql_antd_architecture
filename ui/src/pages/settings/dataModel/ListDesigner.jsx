import { Button, Checkbox, Segmented, Select, Table } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import MetadataTable from '../../../components/metadata/MetadataTable';
import { typeLabel } from './fieldCatalogue';
import { Panel } from './dataModelShared';

const SEARCHABLE = new Set(['text', 'textarea', 'email', 'phone', 'url', 'select', 'radio', 'generatedId']);

// Which fields the list shows, in what order, which ones its search covers
// and how it is sorted, with the live list below.
export default function ListDesigner({ table, settings, fields, draft, onSettings, onFields }) {
    const search = settings.search_columns ?? [];
    const sort = settings.default_sort?.[0];
    const setSort = (changes) => {
        const next = { ...(sort ?? { direction: 'DESC' }), ...changes };
        onSettings({ ...settings, default_sort: next.column ? [next] : null });
    };
    const setField = (column, changes) => onFields(fields.map((field) => (field.column_name === column ? { ...field, ...changes } : field)));
    const move = (index, step) => {
        const to = index + step;
        if (to < 0 || to >= fields.length) return;
        const next = [...fields];
        [next[index], next[to]] = [next[to], next[index]];
        onFields(next);
    };
    const toggleSearch = (column, on) => {
        const next = on ? [...search, column] : search.filter((name) => name !== column);
        onSettings({ ...settings, search_columns: next.length ? next : null });
    };

    const columns = [
        {
            title: 'Field', key: 'field',
            render: (_, field) => (
                <div className="flex flex-col">
                    <strong className="font-medium">{field.col_real_name || field.column_name}</strong>
                    <span className="text-xs text-[var(--color-text-secondary)]">{typeLabel(field.type)} · <span className="font-[var(--font-mono)]">{field.column_name}</span></span>
                </div>
            ),
        },
        {
            title: 'In the list', key: 'list', align: 'center', width: 110,
            render: (_, field) => (
                <Checkbox aria-label={`${field.column_name} in the list`} checked={Number(field.list_visible) === 1}
                    onChange={(event) => setField(field.column_name, { list_visible: event.target.checked ? 1 : 0 })} />
            ),
        },
        {
            title: 'Searched', key: 'search', align: 'center', width: 110,
            render: (_, field) => (SEARCHABLE.has(field.type)
                ? <Checkbox aria-label={`Search ${field.column_name}`} checked={search.includes(field.column_name)} onChange={(event) => toggleSearch(field.column_name, event.target.checked)} />
                : <span className="text-[var(--color-text-secondary)]">—</span>),
        },
        {
            title: 'Order', key: 'order', align: 'right', width: 110,
            render: (_, field, index) => (
                <>
                    <Button size="small" type="text" aria-label={`Move ${field.column_name} up`} icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} />
                    <Button size="small" type="text" aria-label={`Move ${field.column_name} down`} icon={<ArrowDownOutlined />} disabled={index === fields.length - 1} onClick={() => move(index, 1)} />
                </>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Panel title="Columns">
                    <Table rowKey="column_name" size="small" columns={columns} dataSource={fields} pagination={false} scroll={{ x: 560 }} />
                </Panel>
                <Panel title="Sorting">
                    <div className="flex flex-col gap-3 p-[18px]">
                        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Sort by
                            <Select allowClear placeholder="Newest first (by key)" value={sort?.column} onChange={(column) => setSort({ column })}
                                options={fields.map((field) => ({ value: field.column_name, label: field.col_real_name || field.column_name }))} />
                        </label>
                        {sort?.column && (
                            <Segmented block value={sort.direction ?? 'DESC'} onChange={(direction) => setSort({ direction })}
                                options={[{ value: 'ASC', label: 'Ascending' }, { value: 'DESC', label: 'Descending' }]} />
                        )}
                        <span className="text-[12.5px] text-[var(--color-text-secondary)]">Search covers the ticked fields. Records shown below are live; actions follow your permissions.</span>
                    </div>
                </Panel>
            </div>
            <Panel title="Preview">
                <div className="p-4"><MetadataTable table={table} metadata={draft} /></div>
            </Panel>
        </div>
    );
}
