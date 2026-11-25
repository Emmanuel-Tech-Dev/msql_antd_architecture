import { useState } from 'react';
import { Alert, Button, InputNumber, Modal, Segmented, Select, Skeleton, Switch, Table, Tooltip } from 'antd';
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    CloudServerOutlined,
    DatabaseOutlined,
    DeleteOutlined,
    DownloadOutlined,
    ExclamationCircleFilled,
    LoadingOutlined,
    LockOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { saveAs } from 'file-saver';
import apiClient from '../../services/apiClient';
import useCan from '../../core/hooks/access/useCan';
import { useCustom, useCustomMutation } from '../../core/hooks/data/useCustom';
import useNotification from '../../hooks/useNotification';
import utils from '../../utils/function_utils';

const BACKUPS_URL = '/api/v1/system/backups';

const errorText = (error) => error?.technicalMessage ?? error?.message ?? 'Something went wrong.';
const CARD_CLASS = 'rounded-[var(--ads-radius-lg)] border border-[var(--ads-border)] bg-[var(--ads-surface)]';
const CAPTION_CLASS = 'font-[family-name:var(--ads-font-caption)] text-[length:var(--ads-font-size-caption)] font-semibold uppercase tracking-[0.12em] text-[var(--ads-text-muted)]';
const DATA_CLASS = 'font-[family-name:var(--ads-font-data)] text-[length:var(--ads-font-size-body-sm)]';

const FREQUENCIES = [
    { value: 'daily', label: 'Every day', days: 1 },
    { value: 'every3days', label: 'Every 3 days', days: 3 },
    { value: 'weekly', label: 'Every week', days: 7 },
];
const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: `${String(hour).padStart(2, '0')}:00` }));

const HEALTH = {
    OK: { tag: 'Up to date', tone: 'success', icon: <CheckCircleFilled /> },
    OVERDUE: { tag: 'Overdue', tone: 'warning', icon: <ExclamationCircleFilled /> },
    FAILED: { tag: 'Failed', tone: 'danger', icon: <ExclamationCircleFilled /> },
    NONE: { tag: 'Not backed up', tone: 'warning', icon: <ExclamationCircleFilled /> },
    WORKING: { tag: 'Working', tone: 'info', icon: <LoadingOutlined /> },
};

const suggestedFileName = () => `database-backup-${new Date().toISOString().replace(/[-:.]/g, '')}.sql`;

const responseFileName = (headers, fallback) => {
    const disposition = headers?.['content-disposition'] ?? '';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    try {
        return decodeURIComponent(encoded ?? plain ?? fallback);
    } catch {
        return plain ?? fallback;
    }
};

// Where the browser can, the person picks the folder; otherwise it goes to
// their downloads. Returns null when they cancel the folder picker.
async function chooseSaveTarget(fileName) {
    if (!('showSaveFilePicker' in window)) return { fileHandle: null };
    try {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'MySQL backup', accept: { 'application/sql': ['.sql'] } }],
        });
        return { fileHandle };
    } catch (error) {
        if (error?.name === 'AbortError') return null;
        throw new Error('The folder picker could not be opened. Try again, or use a browser that supports it.', { cause: error });
    }
}

async function saveBlob(blob, fileName, fileHandle) {
    if (!fileHandle) {
        saveAs(blob, fileName);
        return fileName;
    }
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return fileHandle.name;
}

function Tag({ tone, children }) {
    return (
        <span className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[length:var(--ads-font-size-caption)] font-semibold" style={{ background: `var(--ads-${tone}-soft)`, color: `var(--ads-${tone})` }}>
            {children}
        </span>
    );
}

function madeBy(backup) {
    return backup.trigger_type === 'AUTOMATIC' ? 'Automatic' : backup.created_by_name ?? 'Someone';
}

function StatusSummary({ overview, isBackingUp }) {
    const health = HEALTH[isBackingUp ? 'WORKING' : overview.health];
    const last = overview.lastBackup;
    let title;
    let detail;
    if (isBackingUp) {
        title = 'Backing up…';
        detail = 'Keep this page open. This usually takes under a minute.';
    } else if (overview.health === 'FAILED') {
        title = `Failed ${utils.fromNow(overview.lastFailure.createdAt)}`;
        detail = `${overview.lastFailure.error_message ?? 'The backup did not finish'}. The last good backup is from ${utils.formatDateTime(last.createdAt)}.`;
    } else if (!last) {
        title = 'No backups yet';
        detail = 'Make your first one now, or turn on automatic backups.';
    } else {
        title = `${utils.formatDateTime(last.createdAt)} · ${utils.fromNow(last.createdAt)}`;
        detail = [madeBy(last), last.destination === 'SERVER' ? 'kept on the server' : 'downloaded', utils.formatBytes(last.size_bytes)].join(' · ');
    }

    return (
        <div className="flex items-center gap-3.5" aria-live="polite">
            <span className="grid size-11 shrink-0 place-items-center rounded-full text-xl" style={{ background: `var(--ads-${health.tone}-soft)`, color: `var(--ads-${health.tone})` }} aria-hidden="true">
                {health.icon}
            </span>
            <div className="min-w-0 flex-1">
                <span className={CAPTION_CLASS}>Last backup</span>
                <div className="font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h4)] font-semibold leading-tight">{title}</div>
                <div className="text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">{detail}</div>
            </div>
            <Tag tone={health.tone}>{health.tag}</Tag>
        </div>
    );
}

function DestinationOption({ value, selected, icon, title, description, disabled, onSelect }) {
    return (
        <label className={`flex flex-1 cursor-pointer items-start gap-2.5 rounded-[var(--ads-radius-md)] border p-3 ${selected ? 'border-[var(--ads-accent)] bg-[var(--ads-accent-soft)]' : 'border-[var(--ads-border)] bg-[var(--ads-surface)] hover:border-[var(--ads-border-strong)]'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
            <input type="radio" name="backupDestination" value={value} checked={selected} disabled={disabled} onChange={() => onSelect(value)} className="mt-1 accent-[var(--ads-accent)]" />
            <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-semibold"><span className="text-[var(--ads-accent)]">{icon}</span>{title}</span>
                <span className="block text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">{description}</span>
            </span>
        </label>
    );
}

function ScheduleCard({ schedule, onSaved }) {
    const { message } = useNotification();
    const save = useCustomMutation();
    const [form, setForm] = useState(schedule.value);
    const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
    const isDirty = ['enabled', 'frequency', 'hour', 'keep'].some((key) => form[key] !== schedule.value[key]);
    const days = FREQUENCIES.find((option) => option.value === form.frequency)?.days ?? 1;

    const saveSchedule = async () => {
        try {
            const { enabled, frequency, hour, keep } = form;
            const result = await save.mutateAsync({
                url: `${BACKUPS_URL}/schedule`,
                method: 'put',
                payload: { schedule: { enabled, frequency, hour, keep }, expectedVersion: Number(schedule.version) },
            });
            message.success(result.raw?.message);
            onSaved();
        } catch (error) {
            message.error(errorText(error));
        }
    };

    return (
        <section aria-labelledby="schedule-title" className={`${CARD_CLASS} flex flex-col gap-3.5 p-5`}>
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <h2 id="schedule-title" className="m-0 font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold">Automatic backups</h2>
                    <p className="m-0 mt-0.5 text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">Made by the server and kept in its backup folder.</p>
                </div>
                <Switch aria-label="Automatic backups" checked={form.enabled} onChange={(value) => update('enabled', value)} />
            </div>

            <div className={`flex flex-col gap-3.5 ${form.enabled ? '' : 'opacity-60'}`}>
                <div className="flex flex-col gap-1.5 border-t border-[var(--ads-border-subtle)] pt-3">
                    <span className="font-medium">How often</span>
                    <Segmented aria-label="How often" className="self-start" value={form.frequency} disabled={!form.enabled} onChange={(value) => update('frequency', value)} options={FREQUENCIES} />
                </div>
                <label className="flex flex-col gap-1.5 border-t border-[var(--ads-border-subtle)] pt-3">
                    <span className="flex flex-col">
                        <span className="font-medium">At</span>
                        <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Pick a time the shop is closed (server time)</span>
                    </span>
                    <Select aria-label="Backup time" className="!w-[160px]" value={form.hour} disabled={!form.enabled} onChange={(value) => update('hour', value)} options={HOURS} />
                </label>
                <div className="flex flex-col gap-1.5 border-t border-[var(--ads-border-subtle)] pt-3">
                    <span className="flex flex-col">
                        <span className="font-medium">Keep the last</span>
                        <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-muted)]">Older automatic backups are deleted to save space</span>
                    </span>
                    <span className="flex items-center gap-2">
                        <InputNumber aria-label="Number of automatic backups to keep" min={1} max={60} precision={0} value={form.keep} disabled={!form.enabled} onChange={(value) => value && update('keep', value)} className="!w-[80px]" />
                        <span className="text-[var(--ads-text-muted)]">backups (about {form.keep * days} days)</span>
                    </span>
                </div>
            </div>

            {schedule.value.enabled && schedule.nextRunAt && !isDirty && (
                <div className="flex items-center gap-2 rounded-[var(--ads-radius-md)] bg-[var(--ads-surface-sunken)] px-3 py-2.5 font-medium">
                    <ClockCircleOutlined className="text-[var(--ads-accent)]" />
                    Next backup: {utils.formatDateTime(schedule.nextRunAt)}
                </div>
            )}
            <p className="m-0 text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)]">
                Runs only while the server is on. If it was off, the backup is made as soon as it starts again.
            </p>
            {isDirty && (
                <div className="flex justify-end gap-2">
                    <Button onClick={() => setForm(schedule.value)} disabled={save.isPending}>Cancel</Button>
                    <Button type="primary" loading={save.isPending} onClick={saveSchedule}>Save schedule</Button>
                </div>
            )}
        </section>
    );
}

export default function DatabaseBackup() {
    const canBackUp = useCan('create:database_backup');
    const { message } = useNotification();
    const [destination, setDestination] = useState('download');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [where, setWhere] = useState('all');
    const [limit, setLimit] = useState(10);
    const [downloadingId, setDownloadingId] = useState(null);
    const overviewQuery = useCustom({ url: canBackUp ? BACKUPS_URL : null, payload: { where, limit }, unwrap: true });
    const remove = useCustomMutation();
    const overview = overviewQuery.data?.data;

    const backUpNow = async () => {
        let target = { fileHandle: null };
        try {
            if (destination === 'download') {
                target = await chooseSaveTarget(suggestedFileName());
                if (!target) return;
            }
            setIsBackingUp(true);
            if (destination === 'server') {
                await apiClient.post(BACKUPS_URL, { destination }, { timeout: 0 });
                message.success('Backup made and kept on the server.');
            } else {
                const response = await apiClient.post(BACKUPS_URL, { destination }, { responseType: 'blob', timeout: 0 });
                const savedAs = await saveBlob(response.data, responseFileName(response.headers, suggestedFileName()), target.fileHandle);
                message.success(`Backup saved as ${savedAs}.`);
            }
        } catch (error) {
            message.error(error?.message || 'The backup could not be made. Check the server and try again.');
        } finally {
            setIsBackingUp(false);
            overviewQuery.refetch();
        }
    };

    const downloadCopy = async (backup) => {
        try {
            const target = await chooseSaveTarget(backup.file_name);
            if (!target) return;
            setDownloadingId(backup.id);
            const response = await apiClient.get(`${BACKUPS_URL}/${backup.id}/download`, { responseType: 'blob', timeout: 0 });
            await saveBlob(response.data, backup.file_name, target.fileHandle);
        } catch (error) {
            message.error(error?.message || 'The backup could not be downloaded.');
        } finally {
            setDownloadingId(null);
        }
    };

    const confirmDelete = (backup) => Modal.confirm({
        title: `Delete the backup from ${utils.formatDateTime(backup.createdAt)}?`,
        content: 'The file is removed from the server. This cannot be undone; the history keeps a note that it existed.',
        okText: 'Delete',
        okButtonProps: { danger: true },
        onOk: async () => {
            try {
                const result = await remove.mutateAsync({ url: `${BACKUPS_URL}/${backup.id}`, method: 'delete' });
                message.success(result.raw?.message);
                overviewQuery.refetch();
            } catch (error) {
                message.error(errorText(error));
            }
        },
    });

    const columns = [
        { key: 'when', title: 'When', render: (_, backup) => <span className="font-medium">{utils.formatDateTime(backup.createdAt)}</span> },
        {
            key: 'by', title: 'Made by',
            render: (_, backup) => (
                <span className="inline-flex items-center gap-1.5 text-[var(--ads-text-muted)]">
                    {backup.trigger_type === 'AUTOMATIC' ? <ClockCircleOutlined /> : <UserOutlined />}{madeBy(backup)}
                </span>
            ),
        },
        {
            key: 'where', title: 'Where', responsive: ['md'],
            render: (_, backup) => {
                if (backup.status === 'FAILED') return <span className="text-[var(--ads-text-subtle)]">—</span>;
                if (backup.destination === 'DOWNLOAD') return <span className="inline-flex items-center gap-1.5 text-[var(--ads-text-muted)]"><DownloadOutlined />Downloaded</span>;
                return <span className="inline-flex items-center gap-1.5 text-[var(--ads-text-muted)]"><CloudServerOutlined />{backup.deletedAt ? 'Deleted from server' : 'On the server'}</span>;
            },
        },
        { key: 'size', title: 'Size', align: 'right', responsive: ['sm'], render: (_, backup) => <span className={DATA_CLASS}>{backup.size_bytes ? utils.formatBytes(backup.size_bytes) : '—'}</span> },
        { key: 'status', title: 'Status', render: (_, backup) => (backup.status === 'DONE' ? <Tag tone="success">Done</Tag> : <Tag tone="danger">Failed</Tag>) },
        {
            key: 'actions', title: <span className="sr-only">Actions</span>, align: 'right',
            render: (_, backup) => {
                if (backup.status === 'FAILED') return <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-danger)]">{backup.error_message}</span>;
                if (backup.destination === 'DOWNLOAD') return <span className="text-[length:var(--ads-font-size-caption)] text-[var(--ads-text-subtle)]">Saved on that computer</span>;
                if (backup.deletedAt) return null;
                return (
                    <span className="inline-flex gap-1">
                        <Button type="text" size="small" icon={<DownloadOutlined />} loading={downloadingId === backup.id} onClick={() => downloadCopy(backup)}>Download</Button>
                        <Tooltip title="Delete from the server">
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`Delete the backup from ${utils.formatDateTime(backup.createdAt)}`} onClick={() => confirmDelete(backup)} />
                        </Tooltip>
                    </span>
                );
            },
        },
    ];

    return (
        <main className="flex min-h-full flex-col gap-4 bg-[var(--ads-canvas)] text-[var(--ads-text)]">
            <header>
                <h1 className="m-0 text-[clamp(1.375rem,2vw,1.75rem)] font-semibold leading-tight text-[var(--ads-text-heading)]">Database backup</h1>
                <p className="m-0 mt-0.5 text-[var(--ads-text-muted)]">
                    A copy of all your business records, to keep somewhere safe. Make one now, or let the server make them on a schedule.
                </p>
            </header>

            {!canBackUp && (
                <Alert type="info" showIcon title="Only people allowed to back up the database can see backups or make them." />
            )}

            {canBackUp && overviewQuery.isError && (
                <Alert
                    type="error"
                    showIcon
                    title="Backups could not be loaded"
                    description={errorText(overviewQuery.error)}
                    action={<Button size="small" onClick={() => overviewQuery.refetch()}>Try again</Button>}
                />
            )}

            {canBackUp && !overview && !overviewQuery.isError && <Skeleton active paragraph={{ rows: 8 }} />}

            {overview && (
                <>
                    <div className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
                        <section aria-label="Backup status" className={`${CARD_CLASS} flex flex-col gap-4 p-5`}>
                            <StatusSummary overview={overview} isBackingUp={isBackingUp} />
                            <div className="flex flex-col gap-2.5 border-t border-[var(--ads-border-subtle)] pt-4">
                                <h2 className="m-0 font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold">Back up now</h2>
                                <div className="flex flex-col gap-2.5 sm:flex-row" role="radiogroup" aria-label="Where to keep the backup">
                                    <DestinationOption value="download" selected={destination === 'download'} disabled={isBackingUp} onSelect={setDestination} icon={<DownloadOutlined />} title="Download to this computer" description="Saved as a .sql file in a folder you choose" />
                                    <DestinationOption value="server" selected={destination === 'server'} disabled={isBackingUp} onSelect={setDestination} icon={<CloudServerOutlined />} title="Keep on the server" description="Listed below; download it any time" />
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="flex min-w-[220px] flex-1 items-center gap-2 text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">
                                        <LockOutlined className="text-[var(--ads-warning)]" />
                                        Contains customer details and password hashes. Store it somewhere private.
                                    </span>
                                    <Button type="primary" size="large" icon={<DatabaseOutlined />} loading={isBackingUp} onClick={backUpNow}>
                                        {isBackingUp ? 'Backing up…' : 'Back up now'}
                                    </Button>
                                </div>
                            </div>
                        </section>

                        <ScheduleCard key={overview.schedule.version} schedule={overview.schedule} onSaved={() => overviewQuery.refetch()} />
                    </div>

                    <section aria-labelledby="history-title" className={`${CARD_CLASS} overflow-hidden`}>
                        <div className="flex flex-wrap items-start gap-3 px-5 py-4">
                            <div className="min-w-0 flex-1">
                                <h2 id="history-title" className="m-0 font-[family-name:var(--ads-font-heading)] text-[length:var(--ads-font-size-h5)] font-semibold">Backup history</h2>
                                <p className="m-0 mt-0.5 text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">Every backup made, newest first. Copies kept on the server can be downloaded or deleted.</p>
                            </div>
                            <Segmented
                                aria-label="Show"
                                value={where}
                                onChange={(value) => { setWhere(value); setLimit(10); }}
                                options={[{ value: 'all', label: 'All' }, { value: 'server', label: 'On the server' }, { value: 'downloaded', label: 'Downloaded' }]}
                            />
                        </div>
                        <Table
                            rowKey="id"
                            size="middle"
                            columns={columns}
                            dataSource={overview.history}
                            pagination={false}
                            loading={overviewQuery.isFetching && !isBackingUp}
                            locale={{ emptyText: where === 'all' ? 'No backups yet.' : 'No backups here yet.' }}
                            scroll={{ x: 'max-content' }}
                        />
                        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--ads-border-subtle)] px-5 py-3 text-[length:var(--ads-font-size-body-sm)] text-[var(--ads-text-muted)]">
                            <span className="flex-1">
                                Showing {overview.history.length} of {overview.total} · {overview.keptCount} kept on the server ({utils.formatBytes(overview.keptBytes)})
                            </span>
                            {overview.history.length < overview.total && limit < 50 && (
                                <Button type="link" size="small" onClick={() => setLimit((current) => Math.min(current + 20, 50))}>Show more</Button>
                            )}
                        </div>
                    </section>
                </>
            )}
        </main>
    );
}
