import { useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Radio,
    Row,
    Skeleton,
    Space,
    Statistic,
    Tag,
    Typography,
} from 'antd';
import {
    CheckCircleOutlined,
    CloudServerOutlined,
    DatabaseOutlined,
    DownloadOutlined,
    FileProtectOutlined,
    FolderOpenOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import { saveAs } from 'file-saver';
import apiClient from '../../services/apiClient';
import useCan from '../../core/hooks/access/useCan';
import useNotification from '../../hooks/useNotification';

const { Paragraph, Text, Title } = Typography;

const PANEL_CLASS = [
    'overflow-hidden border border-[var(--ads-border-subtle)]',
    'bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)]',
    '[&_.ant-card-head]:min-h-[52px] [&_.ant-card-head]:border-b-[var(--ads-border-subtle)]',
    '[&_.ant-card-head]:bg-[var(--ads-surface-raised)] [&_.ant-card-head]:px-5',
    '[&_.ant-card-head-title]:font-semibold [&_.ant-card-body]:p-5',
].join(' ');

const DESTINATION_CLASS = [
    '!m-0 flex min-h-[82px] w-full items-start rounded-[var(--ads-radius-lg)]',
    'border border-[var(--ads-border)] bg-[var(--ads-surface)] p-3 transition-colors',
    'hover:border-[var(--ads-accent)] [&.ant-radio-wrapper-checked]:border-[var(--ads-accent)]',
    '[&.ant-radio-wrapper-checked]:bg-[var(--ads-accent-soft)] [&_.ant-radio]:mt-1',
    '[&>span:last-child]:flex [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1 [&>span:last-child]:items-start [&>span:last-child]:gap-3',
].join(' ');

const formatBytes = (bytes = 0) => {
    if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(Number(bytes)) / Math.log(1024)), units.length - 1);
    return `${(Number(bytes) / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
};

const suggestedFileName = () => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    return `database-backup-${timestamp}.sql`;
};

const responseFileName = (headers) => {
    const disposition = headers?.['content-disposition'] ?? '';
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
    try {
        return decodeURIComponent(encoded ?? plain ?? suggestedFileName());
    } catch {
        return plain ?? suggestedFileName();
    }
};

const formatDateTime = (value) => {
    if (!value) return 'Completed just now';
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
};

export default function DatabaseBackup() {
    const [destination, setDestination] = useState('download');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [lastBackup, setLastBackup] = useState(null);
    const [backupError, setBackupError] = useState(null);
    const canCreateBackup = useCan('create:database_backup');
    const { message } = useNotification();

    const destinationDescription = useMemo(
        () => destination === 'server'
            ? "The SQL file remains in the server's protected backup directory."
            : 'The SQL file is transferred to this device and removed from temporary server storage.',
        [destination],
    );

    const createBackup = async () => {
        let fileHandle = null;
        setBackupError(null);

        if (destination === 'download' && 'showSaveFilePicker' in window) {
            try {
                fileHandle = await window.showSaveFilePicker({
                    suggestedName: suggestedFileName(),
                    types: [{
                        description: 'MySQL SQL backup',
                        accept: { 'application/sql': ['.sql'] },
                    }],
                });
            } catch (error) {
                if (error?.name === 'AbortError') return;
                const errorMessage = 'The folder picker could not be opened. Choose the download destination and try again.';
                setBackupError(errorMessage);
                message.error(errorMessage);
                return;
            }
        }

        setIsBackingUp(true);
        try {
            if (destination === 'server') {
                const response = await apiClient.post(
                    '/api/v1/system/backups',
                    { destination },
                    { timeout: 0 },
                );
                setLastBackup(response.data.data);
                message.success('Database backup stored on the server.');
                return;
            }

            const response = await apiClient.post(
                '/api/v1/system/backups',
                { destination },
                { responseType: 'blob', timeout: 0 },
            );
            const fileName = responseFileName(response.headers);

            if (fileHandle) {
                const writable = await fileHandle.createWritable();
                await writable.write(response.data);
                await writable.close();
            } else {
                saveAs(response.data, fileName);
            }

            const completed = {
                fileName: fileHandle?.name ?? fileName,
                sizeBytes: response.data.size,
                sha256: response.headers?.['x-backup-sha256'],
                createdAt: new Date().toISOString(),
                destination,
            };
            setLastBackup(completed);
            message.success('Database backup saved to your computer.');
        } catch (error) {
            const errorMessage = error?.message || 'Database backup failed. Check the server connection and try again.';
            setBackupError(errorMessage);
            message.error(errorMessage);
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <main className="min-h-full bg-[var(--ads-canvas)] p-3 text-[var(--ads-text)] md:p-4 xl:p-5">
            <header className="mx-auto grid max-w-[var(--app-content-max-width)] grid-cols-1 items-center gap-4 border-b border-[var(--ads-border-subtle)] pb-4 min-[1080px]:grid-cols-[minmax(0,1fr)_auto] min-[1080px]:gap-6" aria-labelledby="backup-title">
                <div className="flex min-w-0 items-start gap-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-[var(--ads-radius-md)] border border-[var(--ads-border)] bg-[var(--ads-surface)] text-lg text-[var(--ads-accent)] shadow-[var(--ads-shadow-xs)]" aria-hidden="true"><DatabaseOutlined /></span>
                    <div>
                        <Title id="backup-title" level={2} className="!mb-1 !text-[clamp(1.5rem,2vw,2rem)] !leading-tight">Database Backup</Title>
                        <Paragraph className="!mb-0 !max-w-[680px] !text-[var(--ads-text-muted)]">
                            Create a complete logical snapshot of application data and database objects.
                        </Paragraph>
                    </div>
                </div>
                <div className="flex max-w-[390px] items-center gap-3 rounded-[var(--ads-radius-lg)] border border-[var(--ads-success-border)] bg-[var(--ads-success-soft)] px-4 py-3 text-[var(--ads-success)]">
                    <SafetyCertificateOutlined className="text-xl" aria-hidden="true" />
                    <span className="min-w-0">
                        <strong className="block text-sm">Protected transfer</strong>
                        <small className="block text-xs leading-relaxed text-[var(--ads-text-muted)]">Encrypted transport and permission-controlled access</small>
                    </span>
                </div>
            </header>

            <section className="mx-auto mt-3 grid max-w-[var(--app-content-max-width)] grid-cols-1 items-center overflow-hidden rounded-[var(--ads-radius-lg)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface)] shadow-[var(--ads-shadow-xs)] sm:grid-cols-3 xl:grid-cols-[1fr_1.5fr_1fr_auto] [&>div]:border-b [&>div]:border-[var(--ads-border-subtle)] [&>div]:px-4 [&>div]:py-3 sm:[&>div]:border-b-0 sm:[&>div]:border-r [&>div>span]:block [&>div>span]:text-xs [&>div>span]:text-[var(--ads-text-muted)] [&>div>strong]:mt-0.5 [&>div>strong]:block [&>.ant-tag]:m-3" aria-label="Backup coverage">
                <div><span>Format</span><strong>MySQL SQL</strong></div>
                <div><span>Coverage</span><strong>Complete logical snapshot</strong></div>
                <div><span>Access</span><strong>{canCreateBackup ? 'Authorized' : 'Restricted'}</strong></div>
                <Tag icon={<LockOutlined />} color="success" bordered={false}>Encrypted transport</Tag>
            </section>

            {backupError && (
                <Alert
                    className="mx-auto mt-4 max-w-[var(--app-content-max-width)]"
                    type="error"
                    showIcon
                    closable
                    title="The backup could not be completed"
                    description={backupError}
                    onClose={() => setBackupError(null)}
                />
            )}

            <div className="mx-auto mt-4 grid max-w-[var(--app-content-max-width)] grid-cols-1 items-start gap-4 xl:grid-cols-12">
                <section className="min-w-0 xl:col-span-8">
                    <Card
                        className={PANEL_CLASS}
                        bordered={false}
                        title="Backup Destination"
                        extra={<FileProtectOutlined className="text-[var(--ads-accent)]" aria-hidden="true" />}
                    >
                        <div className="mb-4">
                            <Title level={4} className="!mb-1">Where should the snapshot be stored?</Title>
                            <Text type="secondary">Choose one destination before starting the export.</Text>
                        </div>

                        <Radio.Group
                            className="!grid w-full !grid-cols-1 gap-3 min-[900px]:!grid-cols-2"
                            aria-label="Backup destination"
                            value={destination}
                            onChange={(event) => setDestination(event.target.value)}
                            disabled={isBackingUp}
                        >
                            <Radio value="download" className={DESTINATION_CLASS}>
                                <span className="grid size-9 shrink-0 place-items-center rounded-[var(--ads-radius-md)] bg-[var(--ads-accent-soft)] text-base text-[var(--ads-accent)]"><FolderOpenOutlined /></span>
                                <span className="min-w-0">
                                    <strong className="block text-sm">My computer</strong>
                                    <small className="mt-1 block text-xs leading-relaxed text-[var(--ads-text-muted)]">Choose a local folder or use your browser downloads</small>
                                </span>
                            </Radio>
                            <Radio value="server" className={DESTINATION_CLASS}>
                                <span className="grid size-9 shrink-0 place-items-center rounded-[var(--ads-radius-md)] bg-[var(--ads-accent-soft)] text-base text-[var(--ads-accent)]"><CloudServerOutlined /></span>
                                <span className="min-w-0">
                                    <strong className="block text-sm">Server storage</strong>
                                    <small className="mt-1 block text-xs leading-relaxed text-[var(--ads-text-muted)]">Keep the snapshot in the configured backup directory</small>
                                </span>
                            </Radio>
                        </Radio.Group>

                        <div className="my-4 border-y border-[var(--ads-border-subtle)] py-4">
                            <Text strong className="mb-3 block">Snapshot contents</Text>
                            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                                <li className="flex items-center gap-2 text-sm"><CheckCircleOutlined className="text-[var(--ads-success)]" />Schema and records</li>
                                <li className="flex items-center gap-2 text-sm"><CheckCircleOutlined className="text-[var(--ads-success)]" />Triggers and routines</li>
                                <li className="flex items-center gap-2 text-sm"><CheckCircleOutlined className="text-[var(--ads-success)]" />Scheduled events</li>
                                <li className="flex items-center gap-2 text-sm"><CheckCircleOutlined className="text-[var(--ads-success)]" />Database metadata</li>
                            </ul>
                        </div>

                        <Alert
                            className="mb-4"
                            type="warning"
                            showIcon
                            title="Backups contain sensitive application data"
                            description="Store the SQL file securely. It may contain personal records, password hashes, and encrypted system values."
                        />

                        <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--ads-radius-lg)] bg-[var(--ads-surface-raised)] p-4 sm:flex-row sm:items-center">
                            <div className="max-w-[520px]">
                                <Text strong className="block">{destination === 'server' ? 'Persistent server copy' : 'Local SQL download'}</Text>
                                <Text type="secondary" className="mt-1 block text-sm leading-relaxed">{destinationDescription}</Text>
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                icon={destination === 'server' ? <DatabaseOutlined /> : <DownloadOutlined />}
                                loading={isBackingUp}
                                disabled={!canCreateBackup}
                                onClick={createBackup}
                            >
                                {isBackingUp ? 'Creating snapshot…' : 'Create Backup'}
                            </Button>
                        </div>

                        {!canCreateBackup && (
                            <Alert
                                className="mt-4"
                                type="error"
                                showIcon
                                title="You do not have permission to create database backups."
                            />
                        )}
                    </Card>
                </section>

                <aside className="min-w-0 xl:sticky xl:top-4 xl:col-span-4 xl:self-start">
                    <Card className={PANEL_CLASS} bordered={false} title="Session Status">
                        {isBackingUp ? (
                            <div className="flex min-h-[220px] flex-col gap-2" aria-live="polite">
                                <Text strong>Creating a protected snapshot…</Text>
                                <Text type="secondary" className="mb-3">Keep this page open while the database export completes.</Text>
                                <Skeleton active title={false} paragraph={{ rows: 4 }} />
                            </div>
                        ) : lastBackup ? (
                            <Space direction="vertical" size={18} style={{ width: '100%' }}>
                                <div className="flex items-start gap-3 rounded-[var(--ads-radius-lg)] border border-[var(--ads-success-border)] bg-[var(--ads-success-soft)] p-4">
                                    <CheckCircleOutlined className="mt-0.5 text-xl text-[var(--ads-success)]" />
                                    <div>
                                        <Text strong className="block">Snapshot ready</Text>
                                        <Text type="secondary" className="mt-1 block break-all text-xs">{lastBackup.fileName}</Text>
                                        <Text type="secondary" className="mt-0.5 block text-xs">{formatDateTime(lastBackup.createdAt)}</Text>
                                    </div>
                                </div>
                                <Row gutter={[12, 12]}>
                                    <Col span={12}>
                                        <Statistic title="File size" value={formatBytes(lastBackup.sizeBytes)} />
                                    </Col>
                                    <Col span={12}>
                                        <Statistic
                                            title="Destination"
                                            value={lastBackup.destination === 'server' ? 'Server' : 'Local'}
                                        />
                                    </Col>
                                </Row>
                                {lastBackup.sha256 && (
                                    <div className="rounded-[var(--ads-radius-md)] border border-[var(--ads-border-subtle)] bg-[var(--ads-surface-raised)] p-3 [&_.ant-typography]:block [&_code]:mt-1 [&_code]:max-w-full [&_code]:overflow-hidden [&_code]:text-ellipsis">
                                        <Text type="secondary" className="text-xs">SHA-256 checksum</Text>
                                        <Text code copyable={{ text: lastBackup.sha256 }}>{lastBackup.sha256}</Text>
                                    </div>
                                )}
                            </Space>
                        ) : (
                            <div className="grid min-h-[220px] place-items-center text-center">
                                <div>
                                <DatabaseOutlined className="mb-4 text-4xl text-[var(--ads-text-subtle)]" />
                                <div>
                                    <Text strong className="block">No session backup yet</Text>
                                    <Text type="secondary" className="mt-1 block text-sm">Completed backup details will appear here.</Text>
                                </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </aside>
            </div>
        </main>
    );
}
