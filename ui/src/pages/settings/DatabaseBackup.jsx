import { useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Radio,
    Row,
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
    FolderOpenOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import { saveAs } from 'file-saver';
import apiClient from '../../services/apiClient';
import useCan from '../../core/hooks/access/useCan';
import useNotification from '../../hooks/useNotification';
import './DatabaseBackup.css';

const { Paragraph, Text, Title } = Typography;

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

export default function DatabaseBackup() {
    const [destination, setDestination] = useState('download');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [lastBackup, setLastBackup] = useState(null);
    const canCreateBackup = useCan('create:database_backup');
    const { message } = useNotification();

    const destinationDescription = useMemo(
        () => destination === 'server'
            ? 'The SQL file remains in the server’s protected backup directory.'
            : 'The SQL file is transferred to this device and removed from temporary server storage.',
        [destination],
    );

    const createBackup = async () => {
        let fileHandle = null;

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
                message.error('The folder picker could not be opened.');
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
            message.error(error?.message || 'Database backup failed.');
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <main className="backup-page">
            <section className="backup-hero" aria-labelledby="backup-title">
                <div className="backup-hero__mark" aria-hidden="true">
                    <DatabaseOutlined />
                </div>
                <div>
                    <Text className="backup-eyebrow">SYSTEM RECOVERY</Text>
                    <Title id="backup-title" level={2}>Database backup</Title>
                    <Paragraph>
                        Create a complete logical snapshot containing the database schema,
                        records, triggers, routines, and scheduled events.
                    </Paragraph>
                </div>
                <Tag icon={<LockOutlined />} color="green">Encrypted transport</Tag>
            </section>

            <Row gutter={[20, 20]}>
                <Col xs={24} xl={16}>
                    <Card className="backup-control" bordered={false}>
                        <div className="backup-section-heading">
                            <div>
                                <Text className="backup-step">01 / DESTINATION</Text>
                                <Title level={4}>Where should this backup go?</Title>
                            </div>
                            <SafetyCertificateOutlined className="backup-section-icon" />
                        </div>

                        <Radio.Group
                            className="backup-destinations"
                            value={destination}
                            onChange={(event) => setDestination(event.target.value)}
                            disabled={isBackingUp}
                        >
                            <Radio value="download" className="backup-destination">
                                <span className="backup-destination__icon"><FolderOpenOutlined /></span>
                                <span>
                                    <strong>My computer</strong>
                                    <small>Choose a local folder or use your browser downloads</small>
                                </span>
                            </Radio>
                            <Radio value="server" className="backup-destination">
                                <span className="backup-destination__icon"><CloudServerOutlined /></span>
                                <span>
                                    <strong>Server storage</strong>
                                    <small>Keep the snapshot in the configured backup directory</small>
                                </span>
                            </Radio>
                        </Radio.Group>

                        <Alert
                            className="backup-notice"
                            type="warning"
                            showIcon
                            message="Backups contain sensitive application data"
                            description="Store the SQL file securely. It may contain personal records, password hashes, and encrypted system values."
                        />

                        <div className="backup-action-row">
                            <div>
                                <Text strong>{destination === 'server' ? 'Persistent server copy' : 'Local SQL download'}</Text>
                                <Text type="secondary">{destinationDescription}</Text>
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                icon={destination === 'server' ? <DatabaseOutlined /> : <DownloadOutlined />}
                                loading={isBackingUp}
                                disabled={!canCreateBackup}
                                onClick={createBackup}
                            >
                                {isBackingUp ? 'Creating snapshot…' : 'Create backup'}
                            </Button>
                        </div>

                        {!canCreateBackup && (
                            <Alert
                                className="backup-permission-alert"
                                type="error"
                                showIcon
                                message="You do not have permission to create database backups."
                            />
                        )}
                    </Card>
                </Col>

                <Col xs={24} xl={8}>
                    <Card className="backup-status" bordered={false}>
                        <Text className="backup-step">LAST COMPLETED IN THIS SESSION</Text>
                        {lastBackup ? (
                            <Space direction="vertical" size={18} style={{ width: '100%' }}>
                                <div className="backup-success-line">
                                    <CheckCircleOutlined />
                                    <div>
                                        <Text strong>Snapshot ready</Text>
                                        <Text type="secondary">{lastBackup.fileName}</Text>
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
                                    <div className="backup-checksum">
                                        <Text type="secondary">SHA-256 checksum</Text>
                                        <code>{lastBackup.sha256}</code>
                                    </div>
                                )}
                            </Space>
                        ) : (
                            <div className="backup-empty">
                                <DatabaseOutlined />
                                <Text>No backup has been created during this session.</Text>
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>
        </main>
    );
}
