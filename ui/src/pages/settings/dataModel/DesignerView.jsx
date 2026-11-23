import { useMemo, useState } from 'react';
import { Alert, App, Button, Segmented, Skeleton, Tag } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DesktopOutlined, EyeInvisibleOutlined, MobileOutlined, SettingOutlined } from '@ant-design/icons';
import MetadataForm from '../../../components/metadata/MetadataForm';
import { useTableMetadata } from '../../../core/metadata/useTableMetadata';
import { useMetadataLookups, useSaveDefinition, useTableDefinition } from '../../../core/metadata/useMetadataAdmin';
import { typeLabel } from './fieldCatalogue';
import { Eyebrow, Panel, ScreenHeader } from './dataModelShared';
import FieldInspector from './FieldInspector';
import TableInspector from './TableInspector';
import ListDesigner from './ListDesigner';
import HistoryPanel from './HistoryPanel';

const NO_SECTION = '__none__';

// Moves a field one place up or down among the fields of its own section.
function moveField(fields, column, step) {
    const at = fields.findIndex((field) => field.column_name === column);
    const section = fields[at].section_key ?? null;
    let to = at + step;
    while (to >= 0 && to < fields.length && (fields[to].section_key ?? null) !== section) to += step;
    if (to < 0 || to >= fields.length) return fields;
    const next = [...fields];
    [next[at], next[to]] = [next[to], next[at]];
    return next;
}

function Outline({ settings, fields, selected, onSelect, onMove }) {
    const sections = settings.sections ?? [];
    const known = new Set(sections.map((section) => section.key));
    const groups = [
        ...sections.map((section) => ({ key: section.key, title: section.title || section.key })),
        { key: NO_SECTION, title: sections.length ? 'No section' : 'Fields' },
    ].map((group) => ({
        ...group,
        fields: fields.filter((field) => (group.key === NO_SECTION ? !known.has(field.section_key) : field.section_key === group.key)),
    })).filter((group) => group.fields.length || group.key !== NO_SECTION);

    return (
        <Panel title="Outline" extra={<Button size="small" icon={<SettingOutlined />} type={selected === null ? 'primary' : 'default'} onClick={() => onSelect(null)}>Table</Button>}>
            <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-3">
                {groups.map((group) => (
                    <div key={group.key} className="flex flex-col gap-1">
                        <Eyebrow>{group.title.toUpperCase()}</Eyebrow>
                        {group.fields.map((field) => {
                            const active = selected === field.column_name;
                            return (
                                <div key={field.column_name}
                                    className={`flex items-center gap-1 rounded-[calc(var(--app-radius,6px)*1.4)] border px-2 py-1 ${active ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-transparent hover:bg-[var(--color-bg-sunken)]'}`}>
                                    <button type="button" onClick={() => onSelect(field.column_name)} className="flex min-w-0 grow cursor-pointer flex-col border-0 bg-transparent p-0 text-left">
                                        <span className="truncate text-[13.5px] font-medium">
                                            {Number(field.form_visible) !== 1 && <EyeInvisibleOutlined className="mr-1 text-[var(--color-text-secondary)]" aria-label="Not in the form" />}
                                            {field.col_real_name || field.column_name}
                                            {Number(field.required) === 1 && <span className="text-[var(--color-error)]"> *</span>}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-secondary)]">{typeLabel(field.type)}</span>
                                    </button>
                                    <Button size="small" type="text" aria-label={`Move ${field.column_name} up`} icon={<ArrowUpOutlined />} onClick={() => onMove(field.column_name, -1)} />
                                    <Button size="small" type="text" aria-label={`Move ${field.column_name} down`} icon={<ArrowDownOutlined />} onClick={() => onMove(field.column_name, 1)} />
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </Panel>
    );
}

function FormPreview({ table, draft }) {
    const [device, setDevice] = useState('desktop');
    const [mode, setMode] = useState('create');
    const sample = useMemo(() => ({ [draft.fields.find((field) => field.type === 'primaryKey')?.column_name ?? 'id']: 0 }), [draft.fields]);
    return (
        <Panel title="Preview" extra={(
            <>
                <Segmented size="small" value={mode} onChange={setMode} options={[{ value: 'create', label: 'Adding' }, { value: 'edit', label: 'Editing' }]} />
                <Segmented size="small" value={device} onChange={setDevice}
                    options={[{ value: 'desktop', icon: <DesktopOutlined />, title: 'Desktop' }, { value: 'phone', icon: <MobileOutlined />, title: 'Phone' }]} />
            </>
        )}>
            <div className="bg-[var(--color-bg-sunken)] p-4">
                <div className={`mx-auto rounded-[calc(var(--app-radius,6px)*2.4)] border border-[var(--color-border)] bg-[var(--color-bg-container)] p-5 ${device === 'phone' ? 'max-w-[390px]' : ''}`}>
                    <MetadataForm table={table} metadata={draft} preview record={mode === 'edit' ? sample : undefined} />
                </div>
            </div>
        </Panel>
    );
}

// Form, list and history of one described table, edited as a draft and saved
// as a new version in one go.
function Workspace({ table, definition, runtime, lookups, tab, go }) {
    const { message, modal } = App.useApp();
    const save = useSaveDefinition();
    const [settings, setSettings] = useState(definition.table);
    const [fields, setFields] = useState(definition.fields);
    const [selected, setSelected] = useState(null);
    const dirty = JSON.stringify({ settings, fields }) !== JSON.stringify({ settings: definition.table, fields: definition.fields });
    const draft = useMemo(() => ({ ...runtime, table: { ...runtime?.table, ...settings }, fields }), [runtime, settings, fields]);
    const field = fields.find((item) => item.column_name === selected);

    const setField = (next) => setFields((current) => current.map((item) => (item.column_name === next.column_name ? next : item)));
    const loadDraft = (next) => {
        if (next.table) setSettings({ ...settings, ...next.table, table_name: settings.table_name, version: settings.version });
        if (next.fields) setFields(next.fields);
        setSelected(null);
    };

    const submit = async () => {
        try {
            const result = await save.mutateAsync({
                path: `tables/${table}`,
                payload: { table: settings, fields: fields.map((item, rank) => ({ ...item, rank })) },
            });
            message.success(result.message);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The changes could not be saved');
        }
    };
    const leave = () => {
        if (!dirty) return go({ view: 'tables' });
        modal.confirm({ title: 'Leave without saving?', content: 'Your changes to this table are lost.', okText: 'Leave', okButtonProps: { danger: true }, onOk: () => go({ view: 'tables' }) });
    };

    return (
        <div className="min-h-full bg-[var(--color-bg-base)]">
            <ScreenHeader
                eyebrow={`DATA MODEL / ${table.toUpperCase()}`}
                title={<span className="flex flex-wrap items-center gap-2">{settings.label}<Tag>v{definition.table.version}</Tag>{dirty && <Tag color="warning">Unsaved changes</Tag>}</span>}
                onBack={leave}
                actions={(
                    <>
                        <Segmented size="large" value={tab} onChange={(next) => go({ view: 'designer', table, tab: next })}
                            options={[{ value: 'form', label: 'Form' }, { value: 'list', label: 'List' }, { value: 'history', label: 'History' }]} />
                        <Button size="large" disabled={!dirty} onClick={() => loadDraft(definition)}>Discard</Button>
                        <Button size="large" type="primary" disabled={!dirty} loading={save.isPending} onClick={submit}>Save as v{Number(definition.table.version) + 1}</Button>
                    </>
                )}
            />
            <div className="mx-auto max-w-[1500px] px-6 py-6">
                {tab === 'form' && (
                    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
                        <Outline settings={settings} fields={fields} selected={selected} onSelect={setSelected}
                            onMove={(column, step) => setFields((current) => moveField(current, column, step))} />
                        <FormPreview table={table} draft={draft} />
                        <Panel className="lg:sticky lg:top-4">
                            <div className="max-h-[80vh] overflow-y-auto p-[18px]">
                                {field
                                    ? <FieldInspector key={field.column_name} field={field} sections={settings.sections ?? []} lookups={lookups}
                                        otherFields={fields.filter((item) => item.column_name !== field.column_name && item.type !== 'primaryKey')} onChange={setField} />
                                    : <TableInspector settings={settings} fields={fields} onChange={setSettings} />}
                            </div>
                        </Panel>
                    </div>
                )}
                {tab === 'list' && <ListDesigner table={table} settings={settings} fields={fields} draft={draft} onSettings={setSettings} onFields={setFields} />}
                {tab === 'history' && <HistoryPanel table={table} dirty={dirty} settings={settings} fields={fields} onLoadDraft={loadDraft} />}
            </div>
        </div>
    );
}

export default function DesignerView({ table, tab, go }) {
    const definition = useTableDefinition(table);
    const runtime = useTableMetadata(table);
    const lookups = useMetadataLookups();

    if (definition.isLoading || lookups.isLoading || runtime.isLoading) return <div className="p-8"><Skeleton active paragraph={{ rows: 12 }} /></div>;
    if (definition.error) {
        return (
            <div className="p-8">
                <Alert type="error" showIcon title={`${table} could not be opened`} description={definition.error.message}
                    action={<Button onClick={() => go({ view: 'tables' })}>Back to tables</Button>} />
            </div>
        );
    }
    return (
        <Workspace key={definition.data.table.version} table={table} definition={definition.data} runtime={runtime.data}
            lookups={lookups.data ?? []} tab={tab} go={go} />
    );
}
