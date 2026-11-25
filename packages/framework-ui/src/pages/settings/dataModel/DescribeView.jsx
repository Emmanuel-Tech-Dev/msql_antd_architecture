import { useState } from 'react';
import { Alert, App, Button, Checkbox, Input, Segmented, Select, Skeleton, Table } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useSaveDefinition, useTableScaffold } from '../../../core/metadata/useMetadataAdmin';
import { FIELD_TYPE_GROUPS } from './fieldCatalogue';
import { Eyebrow, Panel, ScreenHeader } from './dataModelShared';

const flag = (value) => Number(value) === 1;

// "Describe this table": fields guessed from its columns, reviewed and saved
// as the table's first metadata version.
function DescribeForm({ table, scaffold, go }) {
    const { message } = App.useApp();
    const save = useSaveDefinition();
    const [settings, setSettings] = useState(scaffold.table);
    const [fields, setFields] = useState(scaffold.fields);
    const setField = (column, changes) => setFields((current) => current.map((field) => (field.column_name === column ? { ...field, ...changes } : field)));

    const submit = async () => {
        try {
            const result = await save.mutateAsync({
                path: `tables/${table}`,
                payload: { table: settings, fields: fields.map((field) => ({ ...field, dbType: undefined })), lookups: scaffold.lookups },
            });
            message.success(result.message);
            go({ view: 'designer', table });
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The table could not be described');
        }
    };

    const columns = [
        {
            title: 'Column', key: 'column', width: 200,
            render: (_, field) => (
                <div className="flex flex-col">
                    <span className="font-[var(--font-mono)] text-[13px]">{field.column_name}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{field.dbType}</span>
                </div>
            ),
        },
        {
            title: 'Label', key: 'label',
            render: (_, field) => <Input aria-label={`Label for ${field.column_name}`} value={field.col_real_name} onChange={(event) => setField(field.column_name, { col_real_name: event.target.value })} />,
        },
        {
            title: 'Field type', key: 'type', width: 230,
            render: (_, field) => (
                <div className="flex flex-col gap-1">
                    <Select aria-label={`Type for ${field.column_name}`} className="w-full" value={field.type} options={FIELD_TYPE_GROUPS}
                        onChange={(type) => setField(field.column_name, { type })} disabled={field.type === 'primaryKey'} />
                    {field.config?.options && <span className="text-xs text-[var(--color-success)]">{field.config.options.length} options</span>}
                    {field.config?.lookup && <span className="text-xs text-[var(--color-success)]">Lookup · {field.config.lookup}</span>}
                </div>
            ),
        },
        ...[['form_visible', 'Form'], ['list_visible', 'List'], ['required', 'Required']].map(([key, title]) => ({
            title, key, align: 'center', width: 90,
            render: (_, field) => (
                <Checkbox aria-label={`${field.column_name} ${title.toLowerCase()}`} checked={flag(field[key])} disabled={field.type === 'primaryKey' && key !== 'list_visible'}
                    onChange={(event) => setField(field.column_name, { [key]: event.target.checked ? 1 : 0 })} />
            ),
        })),
    ];

    const textFields = fields.filter((field) => ['text', 'email', 'phone'].includes(field.type));
    return (
        <div className="min-h-full bg-[var(--color-bg-base)]">
            <ScreenHeader
                eyebrow="DATA MODEL / DESCRIBE"
                title={<>Describe <span className="font-[var(--font-mono)] font-medium">{table}</span></>}
                onBack={() => go({ view: 'tables' })}
                actions={(
                    <>
                        <Button size="large" onClick={() => go({ view: 'tables' })}>Cancel</Button>
                        <Button size="large" type="primary" loading={save.isPending} onClick={submit}>Save and design the form</Button>
                    </>
                )}
            />
            <div className="mx-auto flex max-w-[1376px] flex-wrap items-start gap-5 px-8 py-6">
                <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-3.5">
                    <Alert type="info" showIcon icon={<InfoCircleOutlined />}
                        title={`Fields were guessed from the table's ${fields.length} columns. Review the types and labels; nothing is saved until you choose Save.`} />
                    {scaffold.lookups.length > 0 && (
                        <Alert type="success" showIcon title={`New lookups will be created for: ${scaffold.lookups.map((lookup) => lookup.lookup_key).join(', ')}`} />
                    )}
                    <Panel><Table rowKey="column_name" columns={columns} dataSource={fields} pagination={false} scroll={{ x: 820 }} /></Panel>
                </div>
                <aside aria-label="Table settings" className="flex flex-[1_1_300px] flex-col gap-4 rounded-[calc(var(--app-radius,6px)*2.6)] border border-[var(--color-border)] bg-[var(--color-bg-container)] p-[18px]">
                    <Eyebrow>TABLE SETTINGS</Eyebrow>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Name in menus and titles
                        <Input value={settings.label} onChange={(event) => setSettings({ ...settings, label: event.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">One record is called
                        <Input value={settings.singular_label} onChange={(event) => setSettings({ ...settings, singular_label: event.target.value })} />
                        <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">Used in &quot;Add {String(settings.singular_label ?? '').toLowerCase()}&quot;.</span>
                    </label>
                    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Shown as
                        <Select allowClear value={settings.title_column} onChange={(value) => setSettings({ ...settings, title_column: value ?? null })}
                            options={textFields.map((field) => ({ value: field.column_name, label: field.col_real_name }))} />
                        <span className="text-[12.5px] font-normal text-[var(--color-text-secondary)]">How a record appears when another table refers to it.</span>
                    </label>
                    <div className="flex flex-col gap-1.5 text-[13px] font-semibold">Form opens in
                        <Segmented block value={settings.form_layout} onChange={(form_layout) => setSettings({ ...settings, form_layout })}
                            options={[{ value: 'modal', label: 'Modal' }, { value: 'drawer', label: 'Drawer' }, { value: 'page', label: 'Page' }]} />
                    </div>
                    <p className="m-0 rounded-[calc(var(--app-radius,6px)*1.6)] border border-[var(--color-border)] bg-[var(--color-bg-sunken)] p-3 text-[12.5px] leading-normal text-[var(--color-text-secondary)]">
                        Saving creates the table&apos;s metadata (version 1) and writes an audit entry. The database table is not changed.
                    </p>
                </aside>
            </div>
        </div>
    );
}

export default function DescribeView({ table, go }) {
    const { data: scaffold, isLoading, error } = useTableScaffold(table);
    if (isLoading) return <div className="p-8"><Skeleton active paragraph={{ rows: 10 }} /></div>;
    if (error) return <div className="p-8"><Alert type="error" showIcon title={`${table} could not be read`} description={error.message} /></div>;
    return <DescribeForm table={table} scaffold={scaffold} go={go} />;
}
