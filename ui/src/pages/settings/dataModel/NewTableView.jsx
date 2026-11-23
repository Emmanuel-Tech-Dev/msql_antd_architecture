import { useState } from 'react';
import { Alert, App, Button, Checkbox, Input, Select, Table } from 'antd';
import { CopyOutlined, DeleteOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAdminAction } from '../../../core/metadata/useMetadataAdmin';
import { downloadText } from '../../../utils/csv';
import { FIELD_TYPE_GROUPS, OPTION_TYPES, humanize } from './fieldCatalogue';
import { Eyebrow, Panel, ScreenHeader } from './dataModelShared';

const TYPES = FIELD_TYPE_GROUPS.filter((group) => group.label !== 'System');
const IDENTIFIER = /^[a-z][a-z0-9_]*$/;
const blankColumn = () => ({ key: Math.random().toString(36).slice(2), name: '', label: '', type: 'text', required: false, unique: false, options: '' });

// A new table is never created from the browser: the builder writes a
// migration file (table, metadata, permissions) for server/resources/migrations.
export default function NewTableView({ go }) {
    const { message } = App.useApp();
    const generate = useAdminAction();
    const [table, setTable] = useState('');
    const [label, setLabel] = useState('');
    const [columns, setColumns] = useState([blankColumn()]);
    const [result, setResult] = useState(null);
    const setColumn = (key, changes) => { setColumns((current) => current.map((column) => (column.key === key ? { ...column, ...changes } : column))); setResult(null); };
    const problems = [
        !IDENTIFIER.test(table) && 'Table name: lowercase letters, numbers and underscores, starting with a letter',
        columns.some((column) => !IDENTIFIER.test(column.name)) && 'Every column needs a name in the same form',
        new Set(columns.map((column) => column.name)).size !== columns.length && 'Column names must be different',
    ].filter(Boolean);

    const submit = async () => {
        try {
            const spec = {
                table,
                label: label || undefined,
                columns: columns.map((column) => ({
                    name: column.name,
                    label: column.label || undefined,
                    type: column.type,
                    required: column.required,
                    unique: column.unique,
                    config: OPTION_TYPES.has(column.type) && column.options.trim()
                        ? { options: column.options.split(',').map((option) => option.trim()).filter(Boolean).map((option) => ({ value: option, label: humanize(option) })) }
                        : undefined,
                })),
            };
            setResult((await generate.mutateAsync({ path: 'new-table', payload: spec })).data);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The migration could not be written');
        }
    };
    const copy = async () => {
        await navigator.clipboard.writeText(result.sql);
        message.success('Migration copied');
    };

    const tableColumns = [
        { title: 'Column', key: 'name', render: (_, column) => <Input aria-label="Column name" placeholder="e.g. full_name" value={column.name} onChange={(event) => setColumn(column.key, { name: event.target.value.trim() })} /> },
        { title: 'Label', key: 'label', render: (_, column) => <Input aria-label="Label" placeholder={humanize(column.name) || 'Label'} value={column.label} onChange={(event) => setColumn(column.key, { label: event.target.value })} /> },
        {
            title: 'Field type', key: 'type', width: 220,
            render: (_, column) => (
                <div className="flex flex-col gap-1">
                    <Select aria-label="Field type" className="w-full" value={column.type} options={TYPES} onChange={(type) => setColumn(column.key, { type })} />
                    {OPTION_TYPES.has(column.type) && <Input size="small" placeholder="Options, comma separated" value={column.options} onChange={(event) => setColumn(column.key, { options: event.target.value })} />}
                </div>
            ),
        },
        { title: 'Required', key: 'required', align: 'center', width: 90, render: (_, column) => <Checkbox aria-label="Required" checked={column.required} onChange={(event) => setColumn(column.key, { required: event.target.checked })} /> },
        { title: 'Unique', key: 'unique', align: 'center', width: 80, render: (_, column) => <Checkbox aria-label="Unique" checked={column.unique} onChange={(event) => setColumn(column.key, { unique: event.target.checked })} /> },
        {
            title: '', key: 'remove', width: 50,
            render: (_, column) => <Button type="text" aria-label={`Remove ${column.name || 'column'}`} icon={<DeleteOutlined />} disabled={columns.length === 1}
                onClick={() => setColumns(columns.filter((item) => item.key !== column.key))} />,
        },
    ];

    return (
        <div className="min-h-full bg-[var(--color-bg-base)]">
            <ScreenHeader eyebrow="DATA MODEL / NEW TABLE" title="New table" onBack={() => go({ view: 'tables' })}
                actions={<Button size="large" type="primary" disabled={problems.length > 0} loading={generate.isPending} onClick={submit}>Write the migration</Button>} />
            <div className="mx-auto flex max-w-[1376px] flex-col gap-5 px-8 py-6">
                <Panel>
                    <div className="grid grid-cols-1 gap-4 p-[18px] md:grid-cols-2">
                        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Table name
                            <Input className="font-[var(--font-mono)]" placeholder="e.g. suppliers" value={table} onChange={(event) => { setTable(event.target.value.trim()); setResult(null); }} />
                        </label>
                        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">Name in menus
                            <Input placeholder={humanize(table) || 'Suppliers'} value={label} onChange={(event) => { setLabel(event.target.value); setResult(null); }} />
                        </label>
                    </div>
                    <Table rowKey="key" columns={tableColumns} dataSource={columns} pagination={false} scroll={{ x: 820 }} />
                    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-sunken)] px-4 py-3">
                        <Button icon={<PlusOutlined />} onClick={() => setColumns([...columns, blankColumn()])}>Add column</Button>
                        <span className="text-[13px] text-[var(--color-text-secondary)]">id, createdAt and updatedAt are added for you.</span>
                    </div>
                </Panel>
                {problems.length > 0 && table && <Alert type="warning" showIcon title="Before writing the migration" description={<ul className="m-0 pl-4">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>} />}
                {result && (
                    <Panel title={<span className="flex flex-col"><Eyebrow>MIGRATION</Eyebrow>{result.fileName}</span>} extra={(
                        <>
                            <Button icon={<CopyOutlined />} onClick={copy}>Copy</Button>
                            <Button type="primary" icon={<DownloadOutlined />} onClick={() => downloadText(result.fileName, result.sql, 'application/sql')}>Download</Button>
                        </>
                    )}>
                        <Alert className="!m-4" type="info" showIcon
                            title="Save this file in server/resources/migrations and run npm run migrate. The table, its metadata, permissions and API routes are created together; give roles the new permissions afterwards." />
                        <pre className="m-0 max-h-[60vh] overflow-auto bg-[var(--color-bg-sunken)] p-4 font-[var(--font-mono)] text-[12.5px] leading-relaxed">{result.sql}</pre>
                    </Panel>
                )}
            </div>
        </div>
    );
}
