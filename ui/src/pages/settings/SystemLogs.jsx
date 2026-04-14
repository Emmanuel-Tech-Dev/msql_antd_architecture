import { useState, useCallback } from 'react';
import {
    Table, Tag, Input, Select, DatePicker, Button,
    Space, Card, Typography, Tooltip, Drawer, Badge,
} from 'antd';
import {
    ReloadOutlined, EyeOutlined,
    WarningOutlined, BugOutlined, SafetyOutlined,
    ThunderboltOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useCustom } from '../../core/hooks/data/useCustom';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const LOG_TYPES = [
    { value: 'combined', label: 'All Logs' },
    { value: 'error', label: 'Errors' },
    { value: 'security', label: 'Security' },
    { value: 'access', label: 'Access' },
    { value: 'query', label: 'Queries' },
    { value: 'performance', label: 'Performance' },
    { value: 'critical', label: 'Critical' },
    { value: 'app', label: 'App' },
];

const LEVEL_OPTIONS = [
    { value: '', label: 'All Levels' },
    { value: 'error', label: 'Error' },
    { value: 'warn', label: 'Warn' },
    { value: 'info', label: 'Info' },
    { value: 'http', label: 'HTTP' },
    { value: 'verbose', label: 'Verbose' },
    { value: 'debug', label: 'Debug' },
    { value: 'critical', label: 'Critical' },
];

const LEVEL_COLORS = {
    error: 'red',
    warn: 'orange',
    info: 'blue',
    http: 'cyan',
    verbose: 'purple',
    debug: 'default',
    critical: 'magenta',
    unknown: 'default',
};

const LEVEL_ICONS = {
    error: <BugOutlined />,
    warn: <WarningOutlined />,
    critical: <ThunderboltOutlined />,
    security: <SafetyOutlined />,
    info: <InfoCircleOutlined />,
};

const TYPE_BADGE_COLORS = {
    error: 'error',
    security: 'warning',
    critical: 'error',
    access: 'processing',
    query: 'default',
    performance: 'default',
    app: 'processing',
    combined: 'default',
};

export default function SystemLogs() {
    const [logType, setLogType] = useState('combined');
    const [dateRange, setDateRange] = useState([
        dayjs().subtract(6, 'day'),
        dayjs(),
    ]);
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 50;
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeEntry, setActiveEntry] = useState(null);
    const [searchInput, setSearchInput] = useState('');

    const start = dateRange[0]?.format('YYYY-MM-DD') ?? dayjs().subtract(6, 'day').format('YYYY-MM-DD');
    const end = dateRange[1]?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD');

    const { data, isLoading, refetch } = useCustom({
        url: 'api/v1/logs',
        method: 'get',
        payload: {
            type: logType,
            start,
            end,
            page,
            limit: pageSize,
            ...(search ? { search } : {}),
            ...(level ? { level } : {}),
        },
        queryOptions: {
            queryKey: ['system-logs', logType, start, end, page, search, level],
            staleTime: 0,
        },
    });

    const logs = data?.data?.data ?? [];
    const pagination = data?.data?.pagination ?? { total: 0, page: 1, limit: pageSize };
    const meta = data?.data?.meta ?? {};

    const handleSearch = useCallback(() => {
        setSearch(searchInput.trim());
        setPage(1);
    }, [searchInput]);

    const handleSearchChange = useCallback((e) => {
        setSearchInput(e.target.value);
        if (!e.target.value) {
            setSearch('');
            setPage(1);
        }
    }, []);

    const handleTypeChange = useCallback((val) => {
        setLogType(val);
        setPage(1);
    }, []);

    const handleRangeChange = useCallback((range) => {
        if (range && range[0] && range[1]) {
            setDateRange(range);
            setPage(1);
        }
    }, []);

    const handleLevelChange = useCallback((val) => {
        setLevel(val);
        setPage(1);
    }, []);

    const openDetail = useCallback((record) => {
        setActiveEntry(record);
        setDrawerOpen(true);
    }, []);

    const rangePresets = [
        { label: 'Today', value: [dayjs(), dayjs()] },
        { label: 'Yesterday', value: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
        { label: 'Last 7 days', value: [dayjs().subtract(6, 'day'), dayjs()] },
        { label: 'Last 14 days', value: [dayjs().subtract(13, 'day'), dayjs()] },
        { label: 'Last 30 days', value: [dayjs().subtract(29, 'day'), dayjs()] },
    ];

    const columns = [
        {
            title: 'Timestamp',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            render: (val) => val
                ? <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                    {dayjs(val).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
                : '—',
        },
        {
            title: 'Level',
            dataIndex: 'level',
            key: 'level',
            width: 100,
            render: (val) => (
                <Tag color={LEVEL_COLORS[val] ?? 'default'} icon={LEVEL_ICONS[val]}>
                    {val?.toUpperCase() ?? 'UNKNOWN'}
                </Tag>
            ),
        },
        {
            title: 'Category',
            key: 'category',
            width: 110,
            render: (_, record) => {
                const cat = record?.metadata?.category ?? record?.category;
                return cat ? <Tag color="geekblue">{cat}</Tag> : '—';
            },
        },
        {
            title: 'Message',
            dataIndex: 'message',
            key: 'message',
            ellipsis: true,
            render: (val) => (
                <Text style={{ fontSize: 13 }}>{val}</Text>
            ),
        },
        {
            title: 'Service',
            key: 'service',
            width: 90,
            render: (_, record) => {
                const svc = record?.metadata?.service ?? record?.service;
                return svc
                    ? <Text type="secondary" style={{ fontSize: 12 }}>{svc}</Text>
                    : '—';
            },
        },
        {
            title: '',
            key: 'actions',
            width: 50,
            render: (_, record) => (
                <Tooltip title="View details">
                    <Button
                        size="small"
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => openDetail(record)}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>System Logs</h2>
                    <p style={{ margin: 0, color: '#8c8c8c', fontSize: 13 }}>
                        Browse and search application log files
                    </p>
                </div>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => refetch()}
                    loading={isLoading}
                >
                    Refresh
                </Button>
            </div>

            <Card style={{ marginBottom: 16 }}>
                <Space wrap size={12}>
                    <Select
                        value={logType}
                        onChange={handleTypeChange}
                        style={{ width: 140 }}
                        options={LOG_TYPES.map((t) => ({
                            value: t.value,
                            label: (
                                <Space size={6}>
                                    <Badge status={TYPE_BADGE_COLORS[t.value]} />
                                    {t.label}
                                </Space>
                            ),
                        }))}
                    />

                    <RangePicker
                        value={dateRange}
                        onChange={handleRangeChange}
                        allowClear={false}
                        disabledDate={(d) => d && d.isAfter(dayjs(), 'day')}
                        presets={rangePresets}
                    />

                    <Select
                        value={level}
                        onChange={handleLevelChange}
                        style={{ width: 130 }}
                        options={LEVEL_OPTIONS}
                    />

                    <Input.Search
                        placeholder="Search logs..."
                        value={searchInput}
                        onChange={handleSearchChange}
                        onSearch={handleSearch}
                        style={{ width: 220 }}
                        allowClear
                    />

                    <Space size={4}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {pagination.total} entries
                        </Text>
                        {meta.filesFound !== undefined && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                · {meta.filesFound}/{meta.datesScanned} files
                            </Text>
                        )}
                    </Space>
                </Space>
            </Card>

            <Table
                rowKey={(_, index) => index}
                dataSource={logs}
                columns={columns}
                loading={isLoading}
                size="small"
                scroll={{ x: 900 }}
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: pagination.total,
                    showSizeChanger: false,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                    onChange: (p) => setPage(p),
                }}
                rowClassName={(record) => {
                    if (record.level === 'error' || record.level === 'critical') return 'log-row-error';
                    if (record.level === 'warn') return 'log-row-warn';
                    return '';
                }}
            />

            <Drawer
                title="Log Entry Detail"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={560}
                destroyOnClose
            >
                {activeEntry && (
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>

                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Timestamp</Text>
                            <div style={{ marginTop: 4 }}>
                                <Text style={{ fontFamily: 'monospace' }}>
                                    {activeEntry.timestamp
                                        ? dayjs(activeEntry.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS')
                                        : '—'}
                                </Text>
                            </div>
                        </div>

                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Level</Text>
                            <div style={{ marginTop: 4 }}>
                                <Tag
                                    color={LEVEL_COLORS[activeEntry.level] ?? 'default'}
                                    icon={LEVEL_ICONS[activeEntry.level]}
                                >
                                    {activeEntry.level?.toUpperCase()}
                                </Tag>
                            </div>
                        </div>

                        {(activeEntry?.metadata?.category ?? activeEntry?.category) && (
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>Category</Text>
                                <div style={{ marginTop: 4 }}>
                                    <Tag color="geekblue">
                                        {activeEntry?.metadata?.category ?? activeEntry?.category}
                                    </Tag>
                                </div>
                            </div>
                        )}

                        <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Message</Text>
                            <div style={{
                                background: '#f5f5f5',
                                padding: '8px 12px',
                                borderRadius: 4,
                                marginTop: 4,
                            }}>
                                <Text style={{ fontFamily: 'monospace', fontSize: 13 }}>
                                    {activeEntry.message}
                                </Text>
                            </div>
                        </div>

                        {activeEntry.metadata
                            && Object.keys(activeEntry.metadata).filter(k => k !== 'stack').length > 0
                            && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Metadata</Text>
                                    <pre style={{
                                        background: '#f5f5f5',
                                        padding: '8px 12px',
                                        borderRadius: 4,
                                        marginTop: 4,
                                        fontSize: 12,
                                        overflow: 'auto',
                                        maxHeight: 400,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all',
                                    }}>
                                        {JSON.stringify(
                                            Object.fromEntries(
                                                Object.entries(activeEntry.metadata)
                                                    .filter(([k]) => k !== 'stack')
                                            ),
                                            null, 2
                                        )}
                                    </pre>
                                </div>
                            )}

                        {activeEntry.metadata?.stack && (
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>Stack Trace</Text>
                                <pre style={{
                                    background: '#fff1f0',
                                    padding: '8px 12px',
                                    borderRadius: 4,
                                    marginTop: 4,
                                    fontSize: 11,
                                    color: '#cf1322',
                                    overflow: 'auto',
                                    maxHeight: 300,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                }}>
                                    {activeEntry.metadata.stack}
                                </pre>
                            </div>
                        )}

                    </Space>
                )}
            </Drawer>

            <style>{`
                .log-row-error td { background: #fff1f0 !important; }
                .log-row-warn  td { background: #fffbe6 !important; }
            `}</style>
        </div>
    );
}