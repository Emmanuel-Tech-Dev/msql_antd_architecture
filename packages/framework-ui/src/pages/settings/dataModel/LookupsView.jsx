import { useState } from 'react';
import { Alert, App, Button, Empty, Input, InputNumber, Segmented, Select, Skeleton, Switch, Tag } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useAdminAction, useMetadataLookups, useMetadataTables, useSaveLookup, useTableScaffold } from '../../../core/metadata/useMetadataAdmin';
import { Eyebrow, Panel } from './dataModelShared';

const EMPTY = { lookup_key: '', source_table: undefined, value_column: 'id', label_column: undefined, max_rows: 200, enabled: 1 };

function LookupEditor({ initial, isNew, tables, onSaved }) {
    const { message } = App.useApp();
    const save = useSaveLookup();
    const preview = useAdminAction();
    const [lookup, setLookup] = useState(initial);
    const [parent, setParent] = useState('');
    const [rows, setRows] = useState(null);
    const scaffold = useTableScaffold(lookup.source_table);
    const columnOptions = (scaffold.data?.fields ?? []).map((field) => ({ value: field.column_name, label: field.column_name }));
    const set = (changes) => { setLookup({ ...lookup, ...changes }); setRows(null); };
    const sort = lookup.sort?.[0];
    const payload = () => {
        const { usedBy: _usedBy, version: _version, ...rest } = lookup;
        return rest;
    };

    const runPreview = async () => {
        try {
            const result = await preview.mutateAsync({ path: 'lookups/preview', payload: { lookup: payload(), parent: parent || undefined } });
            setRows(result.data ?? []);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The lookup could not be previewed');
        }
    };
    const submit = async () => {
        try {
            const result = await save.mutateAsync({ path: `lookups/${lookup.lookup_key}`, payload: payload() });
            message.success(result.message);
            onSaved(lookup.lookup_key);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The lookup could not be saved');
        }
    };

    return (
        <div className="flex flex-col gap-4 p-[18px]">
            <div className="flex flex-wrap items-center gap-2">
                <Eyebrow>{isNew ? 'NEW LOOKUP' : `LOOKUP · ${lookup.lookup_key}`}</Eyebrow>
                <span className="grow" />
                <label className="flex items-center gap-2 text-[13px]">On<Switch size="small" checked={Number(lookup.enabled) !== 0} onChange={(on) => set({ enabled: on ? 1 : 0 })} /></label>
            </div>
            {isNew && (
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Key
                    <Input placeholder="e.g. customers" value={lookup.lookup_key} onChange={(event) => set({ lookup_key: event.target.value.trim() })} />
                    <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">Letters, numbers and underscores. Fields refer to the lookup by this key.</span>
                </label>
            )}
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Choices come from
                <Select showSearch placeholder="Table" value={lookup.source_table} onChange={(source_table) => set({ source_table, label_column: undefined, filter_column: undefined, sort: null })}
                    options={tables.map((table) => ({ value: table.table, label: table.described ? `${table.label} (${table.table})` : table.table }))} />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Stored value
                    <Select value={lookup.value_column} onChange={(value_column) => set({ value_column })} options={columnOptions} loading={scaffold.isLoading} />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Shown as
                    <Select value={lookup.label_column} onChange={(label_column) => set({ label_column })} options={columnOptions} loading={scaffold.isLoading} />
                </label>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Sort by
                    <Select allowClear value={sort?.column} options={columnOptions}
                        onChange={(column) => set({ sort: column ? [{ column, direction: sort?.direction ?? 'ASC' }] : null })} />
                </label>
                <div className="flex flex-col gap-1.5 text-[13px] font-semibold">Direction
                    <Segmented block disabled={!sort} value={sort?.direction ?? 'ASC'} onChange={(direction) => set({ sort: [{ ...sort, direction }] })}
                        options={[{ value: 'ASC', label: 'A–Z' }, { value: 'DESC', label: 'Z–A' }]} />
                </div>
            </div>
            <div className="flex flex-col gap-2.5 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-3">
                <span className="text-[13px] font-semibold">Depends on another field (optional)</span>
                <Input placeholder="Form field it follows, e.g. country_id" value={lookup.depends_on ?? ''} onChange={(event) => set({ depends_on: event.target.value || null })} />
                <Select allowClear placeholder="Column it filters" value={lookup.filter_column ?? undefined} options={columnOptions} onChange={(filter_column) => set({ filter_column: filter_column ?? null })} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Most choices
                    <InputNumber className="!w-full" min={1} max={1000} value={lookup.max_rows} onChange={(max_rows) => set({ max_rows })} />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Permission needed
                    <Input placeholder="None" value={lookup.required_permission ?? ''} onChange={(event) => set({ required_permission: event.target.value || null })} />
                </label>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Description
                <Input.TextArea autoSize={{ minRows: 2 }} value={lookup.description ?? ''} onChange={(event) => set({ description: event.target.value || null })} />
            </label>

            <div className="flex flex-col gap-2 rounded-[calc(var(--app-radius,6px)*2)] border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                    {lookup.depends_on && <Input className="!w-40" size="small" placeholder={`${lookup.depends_on} value`} value={parent} onChange={(event) => setParent(event.target.value)} />}
                    <Button size="small" icon={<EyeOutlined />} loading={preview.isPending} disabled={!lookup.source_table || !lookup.label_column} onClick={runPreview}>Preview choices</Button>
                </div>
                {rows && (rows.length
                    ? <div className="flex flex-wrap gap-1.5">{rows.map((row) => <Tag key={String(row.value)}>{row.label} <span className="text-[var(--color-text-secondary)]">· {String(row.value)}</span></Tag>)}</div>
                    : <span className="text-[13px] text-[var(--color-text-secondary)]">No choices.</span>)}
            </div>
            {!isNew && lookup.usedBy?.length > 0 && (
                <span className="text-[12.5px] text-[var(--color-text-secondary)]">Used by {lookup.usedBy.map((use) => `${use.table}.${use.column}`).join(', ')}. Saving changes their choices at once.</span>
            )}
            <Button type="primary" loading={save.isPending} disabled={!lookup.lookup_key || !lookup.source_table || !lookup.label_column} onClick={submit}>Save lookup</Button>
        </div>
    );
}

// Settings › Data model › Lookups: where lookup fields get their choices.
export default function LookupsView() {
    const { data: lookups = [], isLoading, error } = useMetadataLookups();
    const { data: tables = [] } = useMetadataTables();
    const [selected, setSelected] = useState(null);

    if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (error) return <Alert type="error" showIcon title="The lookups could not be loaded" description={error.message} />;
    const current = selected === 'new' ? EMPTY : lookups.find((lookup) => lookup.lookup_key === selected);

    return (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
            <Panel title={`${lookups.length} lookups`} extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setSelected('new')}>New lookup</Button>}>
                {!lookups.length && <Empty className="py-8" description="No lookups yet" />}
                <ul className="m-0 flex list-none flex-col p-0">
                    {lookups.map((lookup) => (
                        <li key={lookup.lookup_key} className="border-b border-[var(--color-border)] last:border-b-0">
                            <button type="button" onClick={() => setSelected(lookup.lookup_key)}
                                className={`flex w-full cursor-pointer flex-wrap items-center gap-2 border-0 px-4 py-3 text-left ${selected === lookup.lookup_key ? 'bg-[var(--color-accent-light)]' : 'bg-transparent hover:bg-[var(--color-bg-sunken)]'}`}>
                                <span className="flex min-w-0 grow flex-col">
                                    <strong className="font-[var(--font-mono)] text-[13.5px] font-medium">{lookup.lookup_key}</strong>
                                    <span className="text-[12.5px] text-[var(--color-text-secondary)]">{lookup.source_table} · {lookup.label_column}{lookup.depends_on ? ` · follows ${lookup.depends_on}` : ''}</span>
                                </span>
                                {Number(lookup.enabled) === 0 && <Tag>Off</Tag>}
                                <Tag>{lookup.usedBy.length} {lookup.usedBy.length === 1 ? 'field' : 'fields'}</Tag>
                            </button>
                        </li>
                    ))}
                </ul>
            </Panel>
            <Panel className="lg:sticky lg:top-4">
                {current
                    ? <LookupEditor key={selected} initial={current} isNew={selected === 'new'} tables={tables} onSaved={setSelected} />
                    : <Empty className="py-10" description="Choose a lookup to edit it" />}
            </Panel>
        </div>
    );
}
