import { Alert, App, Button, Empty, Popconfirm, Skeleton, Tag, Upload } from 'antd';
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useRestoreVersion, useTableExport, useTableVersions } from '../../../core/metadata/useMetadataAdmin';
import { downloadText, parseCsv, toCsv } from '../../../utils/csv';
import { Panel } from './dataModelShared';
import utils from '../../../utils/function_utils';

const FIELD_COLUMNS = ['column_name', 'col_real_name', 'type', 'form_visible', 'list_visible', 'required', 'editable', 'col_span', 'section_key'];
const NUMERIC_COLUMNS = new Set(['form_visible', 'list_visible', 'required', 'editable', 'col_span']);
// Saved versions with what changed, restore, and moving a definition in and
// out as JSON, a field CSV or a migration file.
export default function HistoryPanel({ table, dirty, settings, fields, onLoadDraft }) {
    const { message } = App.useApp();
    const versions = useTableVersions(table);
    const exported = useTableExport(table, { enabled: false });
    const restore = useRestoreVersion();

    const restoreVersion = async (version) => {
        try {
            message.success((await restore.mutateAsync({ path: `tables/${table}/versions/${version}/restore` })).message);
        } catch (error) {
            message.error(error?.technicalMessage ?? error?.message ?? 'The version could not be restored');
        }
    };
    const download = async (kind) => {
        const { data, error } = await exported.refetch();
        if (error || !data) return message.error('The definition could not be exported');
        if (kind === 'json') downloadText(`${table}.metadata.json`, JSON.stringify({ definition: data.definition, lookups: data.lookups }, null, 2), 'application/json');
        else downloadText(data.fileName, data.migration, 'application/sql');
    };
    const downloadFieldCsv = () => downloadText(`${table}.fields.csv`, toCsv(FIELD_COLUMNS, fields), 'text/csv');

    // Imports go into the draft only; nothing is saved until "Save as".
    const importFile = async (file) => {
        try {
            const text = await utils.readFileAsText(file);
            if (file.name.toLowerCase().endsWith('.csv')) {
                const { rows } = parseCsv(text);
                const byColumn = Object.fromEntries(rows.map((row) => [row.column_name, row]));
                const unknown = rows.filter((row) => !fields.some((field) => field.column_name === row.column_name));
                onLoadDraft({
                    fields: fields.map((field) => {
                        const row = byColumn[field.column_name];
                        if (!row) return field;
                        const changes = Object.fromEntries(FIELD_COLUMNS.filter((key) => key !== 'column_name' && Object.hasOwn(row, key))
                            .map((key) => [key, NUMERIC_COLUMNS.has(key) ? Number(row[key]) || 0 : row[key] || null]));
                        return { ...field, ...changes };
                    }),
                });
                if (unknown.length) message.warning(`Skipped columns this table doesn't have: ${unknown.map((row) => row.column_name).join(', ')}`);
            } else {
                const parsed = JSON.parse(text);
                const definition = parsed.definition ?? parsed;
                if (!Array.isArray(definition.fields)) throw new Error('The file has no fields');
                onLoadDraft({ table: definition.table, fields: definition.fields });
            }
            message.success(`${file.name} loaded into the draft. Review it, then save.`);
        } catch (error) {
            message.error(`${file.name} could not be read: ${error.message}`);
        }
        return false;
    };

    return (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Panel title="Versions">
                {versions.isLoading && <div className="p-4"><Skeleton active /></div>}
                {versions.error && <Alert className="m-4" type="error" showIcon title="The versions could not be loaded" />}
                {versions.data?.length === 0 && <Empty className="py-8" description="No saved versions yet" />}
                <ol className="m-0 flex list-none flex-col p-0">
                    {(versions.data ?? []).map((entry, index) => (
                        <li key={entry.version} className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag color={index === 0 ? 'success' : 'default'}>v{entry.version}{index === 0 ? ' · current' : ''}</Tag>
                                <span className="text-[13px] text-[var(--color-text-secondary)]">
                                    {dayjs(entry.createdAt).format('D MMM YYYY, HH:mm')}{entry.changed_by ? ` · user #${entry.changed_by}` : ''}
                                </span>
                                <span className="grow" />
                                {index > 0 && (
                                    <Popconfirm title={`Restore version ${entry.version}?`} description="It is saved as a new version; nothing is lost." onConfirm={() => restoreVersion(entry.version)}
                                        okButtonProps={{ disabled: dirty }}>
                                        <Button size="small" loading={restore.isPending}>Restore</Button>
                                    </Popconfirm>
                                )}
                            </div>
                            {Array.isArray(entry.changes) && entry.changes.length > 0 && (
                                <ul className="m-0 flex flex-col gap-0.5 pl-5 text-[13px]">
                                    {entry.changes.slice(0, 8).map((change, at) => (
                                        <li key={at}><span className="font-[var(--font-mono)]">{change.subject}</span> <span className="text-[var(--color-text-secondary)]">{change.change}</span></li>
                                    ))}
                                    {entry.changes.length > 8 && <li className="text-[var(--color-text-secondary)]">and {entry.changes.length - 8} more</li>}
                                </ul>
                            )}
                        </li>
                    ))}
                </ol>
            </Panel>
            <div className="flex flex-col gap-5">
                {dirty && <Alert type="warning" showIcon title="Save or discard your changes before restoring a version." />}
                <Panel title="Export">
                    <div className="flex flex-col gap-2 p-[18px]">
                        <Button icon={<DownloadOutlined />} loading={exported.isFetching} onClick={() => download('json')}>Definition (JSON)</Button>
                        <Button icon={<DownloadOutlined />} onClick={downloadFieldCsv}>Fields (CSV)</Button>
                        <Button icon={<DownloadOutlined />} loading={exported.isFetching} onClick={() => download('migration')}>Migration (SQL)</Button>
                        <span className="text-[12.5px] text-[var(--color-text-secondary)]">The migration carries this saved definition to another installation of {settings.label}.</span>
                    </div>
                </Panel>
                <Panel title="Import into the draft">
                    <div className="flex flex-col gap-2 p-[18px]">
                        <Upload accept=".json,.csv" showUploadList={false} beforeUpload={importFile}>
                            <Button icon={<UploadOutlined />} block>Choose a JSON or CSV file</Button>
                        </Upload>
                        <span className="text-[12.5px] text-[var(--color-text-secondary)]">
                            A field CSV uses the columns {FIELD_COLUMNS.join(', ')}. Nothing is saved until you choose Save.
                        </span>
                    </div>
                </Panel>
            </div>
        </div>
    );
}
