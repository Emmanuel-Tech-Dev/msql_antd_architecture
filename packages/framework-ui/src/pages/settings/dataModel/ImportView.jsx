import { useState } from 'react';
import { Alert, App, Button, Empty, Select, Steps, Switch, Table, Tag, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useAdminAction, useMetadataTables, useTableDefinition } from '../../../core/metadata/useMetadataAdmin';
import { downloadText, parseCsv, toCsv } from '../../../utils/csv';
import { Panel } from './dataModelShared';

const normalise = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Matches each CSV header to the field with the same column name or label.
function guessMapping(headers, fields) {
    return Object.fromEntries(headers.map((header) => {
        const match = fields.find((field) => [field.column_name, field.col_real_name].some((name) => normalise(name) === normalise(header)));
        return [header, match?.column_name];
    }));
}

function RecordImport({ table, fields }) {
    const { message } = App.useApp();
    const check = useAdminAction();
    const run = useAdminAction();
    const [file, setFile] = useState(null);
    const [mapping, setMapping] = useState({});
    const [results, setResults] = useState(null);
    const [skipProblems, setSkipProblems] = useState(true);
    const problems = results?.filter((result) => Object.keys(result.errors ?? {}).length) ?? [];
    const labelOf = Object.fromEntries(fields.map((field) => [field.column_name, field.col_real_name || field.column_name]));

    const records = () => file.rows.map((row) => Object.fromEntries(Object.entries(mapping)
        .filter(([, column]) => column)
        .map(([header, column]) => [column, row[header] === '' ? null : row[header]])));

    const readCsv = async (chosen) => {
        const parsed = parseCsv(await chosen.text());
        if (!parsed.rows.length) {
            message.error(`${chosen.name} has no rows`);
            return false;
        }
        setFile({ name: chosen.name, ...parsed });
        setMapping(guessMapping(parsed.headers, fields));
        setResults(null);
        return false;
    };
    const runCheck = async () => {
        try {
            setResults((await check.mutateAsync({ path: `import/${table}/check`, payload: { rows: records() } })).data);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The file could not be checked');
        }
    };
    const runImport = async () => {
        try {
            message.success((await run.mutateAsync({ path: `import/${table}`, payload: { rows: records(), skipProblems } })).message);
            setFile(null);
            setResults(null);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The records could not be imported');
        }
    };
    const downloadProblems = () => downloadText(`${table}-problems.csv`, toCsv(['row', 'problems', ...file.headers],
        problems.map((result) => ({ ...file.rows[result.row - 1], row: result.row, problems: Object.entries(result.errors).map(([column, error]) => `${labelOf[column] ?? column}: ${error}`).join('; ') }))), 'text/csv');
    const downloadTemplate = () => downloadText(`${table}-template.csv`, toCsv(fields.map((field) => field.column_name), []), 'text/csv');

    const step = !file ? 0 : !results ? 1 : 2;
    return (
        <div className="flex flex-col gap-5">
            <Steps size="small" current={step} items={[{ title: 'Choose a file' }, { title: 'Match the columns' }, { title: 'Check and import' }]} />
            {!file && (
                <>
                    <Upload.Dragger accept=".csv" showUploadList={false} beforeUpload={readCsv}>
                        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                        <p className="ant-upload-text">Drop a CSV file here or click to choose one</p>
                        <p className="ant-upload-hint">The first row holds the column names. Up to 5,000 rows.</p>
                    </Upload.Dragger>
                    <Button className="self-start" onClick={downloadTemplate}>Download a template</Button>
                </>
            )}
            {file && (
                <Panel title={`${file.name} · ${file.rows.length} rows`} extra={<Button onClick={() => { setFile(null); setResults(null); }}>Choose another file</Button>}>
                    <Table rowKey="header" size="small" pagination={false} scroll={{ x: 560 }}
                        dataSource={file.headers.map((header) => ({ header, sample: file.rows[0]?.[header] }))}
                        columns={[
                            { title: 'CSV column', dataIndex: 'header', key: 'header', render: (header) => <span className="font-[var(--font-mono)]">{header}</span> },
                            { title: 'First row', dataIndex: 'sample', key: 'sample', render: (sample) => <span className="text-[var(--color-text-secondary)]">{sample || '—'}</span> },
                            {
                                title: 'Goes into', key: 'field', width: 260,
                                render: (_, row) => (
                                    <Select allowClear className="w-full" placeholder="Skip this column" aria-label={`Field for ${row.header}`} value={mapping[row.header]}
                                        onChange={(column) => { setMapping({ ...mapping, [row.header]: column }); setResults(null); }}
                                        options={fields.map((field) => ({ value: field.column_name, label: labelOf[field.column_name] }))} />
                                ),
                            },
                        ]} />
                    <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-sunken)] px-4 py-3">
                        <span className="grow text-[13px] text-[var(--color-text-secondary)]">Checking applies the same rules as the form, plus unique values. Nothing is saved yet.</span>
                        <Button type="primary" loading={check.isPending} disabled={!Object.values(mapping).some(Boolean)} onClick={runCheck}>Check the rows</Button>
                    </div>
                </Panel>
            )}
            {results && (
                <Panel title="Check result" extra={problems.length > 0 && <Button onClick={downloadProblems}>Download the problem rows</Button>}>
                    <div className="flex flex-col gap-4 p-[18px]">
                        <div className="flex flex-wrap gap-2">
                            <Tag color="success">{results.length - problems.length} ready</Tag>
                            {problems.length > 0 && <Tag color="error">{problems.length} with problems</Tag>}
                        </div>
                        {problems.length > 0 && (
                            <Table rowKey="row" size="small" pagination={{ pageSize: 10, hideOnSinglePage: true }} dataSource={problems}
                                columns={[
                                    { title: 'Row', dataIndex: 'row', key: 'row', width: 80 },
                                    {
                                        title: 'Problems', key: 'errors',
                                        render: (_, result) => (
                                            <ul className="m-0 pl-4">
                                                {Object.entries(result.errors).map(([column, error]) => <li key={column}><strong>{labelOf[column] ?? column}</strong>: {error}</li>)}
                                            </ul>
                                        ),
                                    },
                                ]} />
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            {problems.length > 0 && <label className="flex items-center gap-2 text-[13.5px]"><Switch size="small" checked={skipProblems} onChange={setSkipProblems} />Skip the rows with problems</label>}
                            <span className="grow" />
                            <Button type="primary" size="large" loading={run.isPending} disabled={(problems.length > 0 && !skipProblems) || results.length === problems.length} onClick={runImport}>
                                Import {results.length - problems.length} records
                            </Button>
                        </div>
                    </div>
                </Panel>
            )}
        </div>
    );
}

// Settings › Data model › Import records: CSV rows into a described table,
// checked against its metadata before anything is written.
export default function ImportView() {
    const { data: tables = [], isLoading } = useMetadataTables();
    const [table, setTable] = useState();
    const definition = useTableDefinition(table);
    const fields = (definition.data?.fields ?? []).filter((field) => field.type !== 'primaryKey' && Number(field.disabled) !== 1 && Number(field.form_visible) === 1);

    return (
        <div className="flex flex-col gap-5">
            <label className="flex max-w-[420px] flex-col gap-1.5 text-[13px] font-semibold">Import into
                <Select showSearch loading={isLoading} placeholder="Choose a described table" value={table} onChange={setTable}
                    options={tables.filter((item) => item.described).map((item) => ({ value: item.table, label: `${item.label} (${item.table})` }))} />
            </label>
            {!table && <Empty description="Choose the table the records go into" />}
            {definition.error && <Alert type="error" showIcon title={`${table} could not be loaded`} description={definition.error.message} />}
            {table && definition.data && <RecordImport key={table} table={table} fields={fields} />}
        </div>
    );
}
