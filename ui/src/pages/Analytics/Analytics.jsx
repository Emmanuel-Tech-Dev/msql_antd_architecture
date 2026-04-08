import { useState, useMemo } from 'react'
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
    Card, Statistic, Tag, Table, Segmented, Progress,
    DatePicker, Space, Typography, Row, Col, Flex,
} from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

// ── CSS var reader ────────────────────────────────────────────────
const cv = (n) =>
    getComputedStyle(document.documentElement).getPropertyValue(n).trim()

// ── Data ─────────────────────────────────────────────────────────
function makeSeries(days) {
    const volume = []
    const errors = []
    for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - (days - i) * 864e5)
        const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
        volume.push({
            date: label,
            uploads: Math.round(200 + Math.sin(i / 3) * 100 + Math.random() * 60),
            downloads: Math.round(120 + Math.cos(i / 4) * 70 + Math.random() * 40),
        })
        errors.push({
            date: label,
            errors: Math.round(Math.max(0, 4 + Math.sin(i) * 3 + Math.random() * 2)),
        })
    }
    return { volume, errors }
}

const NODE_DATA = ['N-01', 'N-02', 'N-03', 'N-04', 'N-05', 'N-06'].map(n => ({
    node: n,
    throughput: Math.round(120 + Math.random() * 200),
}))

const PIE_DATA = [
    { type: 'Video', value: 38 },
    { type: 'Archive', value: 27 },
    { type: 'Images', value: 19 },
    { type: 'Docs', value: 10 },
    { type: 'Other', value: 6 },
]

const SHARDS = [
    { label: 'Shard A', used: 78 },
    { label: 'Shard B', used: 54 },
    { label: 'Shard C', used: 91 },
    { label: 'Shard D', used: 33 },
]

const FILES = [
    { key: 1, name: 'dataset_q4_final.zip', size: '2.1 GB', node: 'N-03', status: 'active', ts: '2 min ago' },
    { key: 2, name: 'backup_nov_enc.tar.gz', size: '890 MB', node: 'N-01', status: 'active', ts: '14 min ago' },
    { key: 3, name: 'render_batch_07.mp4', size: '4.4 GB', node: 'N-05', status: 'pending', ts: '1 hr ago' },
    { key: 4, name: 'schema_migration.sql', size: '12 KB', node: 'N-02', status: 'active', ts: '3 hr ago' },
    { key: 5, name: 'audit_log_oct.csv', size: '340 MB', node: 'N-04', status: 'error', ts: '5 hr ago' },
    { key: 6, name: 'model_weights_v3.bin', size: '7.2 GB', node: 'N-03', status: 'active', ts: '8 hr ago' },
]

const STATUS_COLOR = { active: 'success', pending: 'warning', error: 'error' }

const COLS = [
    {
        title: 'Filename', dataIndex: 'name', key: 'name',
        render: v => (
            <Text style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</Text>
        ),
    },
    { title: 'Size', dataIndex: 'size', key: 'size', width: 90 },
    {
        title: 'Node', dataIndex: 'node', key: 'node', width: 72,
        render: v => <Tag>{v}</Tag>
    },
    {
        title: 'Status', dataIndex: 'status', key: 'status', width: 90,
        filters: [
            { text: 'Active', value: 'active' },
            { text: 'Pending', value: 'pending' },
            { text: 'Error', value: 'error' },
        ],
        onFilter: (v, r) => r.status === v,
        render: v => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    {
        title: 'Uploaded', dataIndex: 'ts', key: 'ts', width: 110,
        render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
]

// ── Shared chart styles ───────────────────────────────────────────
const TICK_STYLE = { fontSize: 11, fill: 'var(--color-text-tertiary)' }
const GRID_STYLE = { stroke: 'var(--color-border)', strokeDasharray: '3 3' }

// ── Custom tooltip ────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: 'var(--color-bg-container)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            boxShadow: 'none',
        }}>
            <div style={{ color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{label}</div>
            {payload.map(p => (
                <Flex key={p.dataKey} gap={8} align="center">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                    <Text style={{ fontSize: 12 }}>{p.name}:</Text>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>{p.value}</Text>
                </Flex>
            ))}
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────────
export function Analytics() {
    const [grain, setGrain] = useState('Week')
    const days = grain === 'Day' ? 14 : grain === 'Week' ? 30 : 90
    const { volume, errors } = useMemo(() => makeSeries(days), [days])

    // thin out x-axis labels so they don't overlap
    const tickInterval = grain === 'Day' ? 1 : grain === 'Week' ? 4 : 14

    const accent = cv('--color-accent')
    const info = cv('--color-info')
    const success = cv('--color-success')
    const error = cv('--color-error')
    const warning = cv('--color-warning')
    const disabled = cv('--color-text-disabled')

    const PIE_COLORS = [accent, info, success, warning, disabled]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Header ── */}
            <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Analytics</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Platform metrics · real-time overview
                    </Text>
                </div>
                <Space wrap>
                    <RangePicker size="small" className="py-2" />
                    <Segmented
                        size="small"
                        value={grain}
                        onChange={setGrain}
                        options={['Day', 'Week', 'Month']}
                    />
                </Space>
            </Flex>

            {/* ── KPI strip ── */}
            <Row gutter={[16, 16]}>
                {[
                    { title: 'Total files', value: '24,881', delta: '+3.4%', up: true },
                    { title: 'Storage used', value: '18.4 TB', delta: '+1.1 TB', up: true },
                    { title: 'Active nodes', value: '6 / 6', delta: '100%', up: true },
                    { title: 'Avg throughput', value: '312 MB/s', delta: '-4.2%', up: false },
                ].map(k => (
                    <Col xs={12} sm={12} md={6} key={k.title}>
                        <Card size="small" style={{ height: '100%' }}>
                            <Statistic
                                title={
                                    <Text style={{
                                        fontSize: 11,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        color: 'var(--color-text-tertiary)',
                                    }}>
                                        {k.title}
                                    </Text>
                                }
                                value={k.value}
                                valueStyle={{
                                    fontSize: 22,
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 700,
                                }}
                            />
                            <Flex align="center" gap={6} style={{ marginTop: 6 }}>
                                {k.up
                                    ? <ArrowUpOutlined style={{ color: 'var(--color-success)', fontSize: 11 }} />
                                    : <ArrowDownOutlined style={{ color: 'var(--color-error)', fontSize: 11 }} />
                                }
                                <Text style={{
                                    fontSize: 12,
                                    color: k.up ? 'var(--color-success)' : 'var(--color-error)',
                                }}>
                                    {k.delta}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>vs last period</Text>
                            </Flex>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* ── Main charts ── */}
            <Row gutter={[16, 16]}>

                {/* Area: upload vs download */}
                <Col xs={24} md={16}>
                    <Card
                        size="small"
                        title={
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                                Upload vs download volume
                            </span>
                        }
                        extra={<Text type="secondary" style={{ fontSize: 12 }}>MB/s</Text>}
                    >
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={volume} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={accent} stopOpacity={0.25} />
                                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gDn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={info} stopOpacity={0.2} />
                                        <stop offset="100%" stopColor={info} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} strokeDasharray={GRID_STYLE.strokeDasharray} />
                                <XAxis
                                    dataKey="date"
                                    tick={TICK_STYLE}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={tickInterval}
                                />
                                <YAxis
                                    tick={TICK_STYLE}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend
                                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                    formatter={v => <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="uploads"
                                    name="Uploads"
                                    stroke={accent}
                                    strokeWidth={2}
                                    fill="url(#gUp)"
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="downloads"
                                    name="Downloads"
                                    stroke={info}
                                    strokeWidth={2}
                                    fill="url(#gDn)"
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Donut: storage by type */}
                <Col xs={24} md={8}>
                    <Card
                        size="small"
                        style={{ height: '100%' }}
                        title={
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                                Storage by type
                            </span>
                        }
                    >
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie
                                    data={PIE_DATA}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={46}
                                    outerRadius={72}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {PIE_DATA.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length) return null
                                        const d = payload[0]
                                        return (
                                            <div style={{
                                                background: 'var(--color-bg-container)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 6, padding: '6px 10px', fontSize: 12,
                                            }}>
                                                <Text style={{ fontSize: 12 }}>{d.name}: </Text>
                                                <Text style={{ fontSize: 12, fontWeight: 600 }}>{d.value}%</Text>
                                            </div>
                                        )
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 4 }}>
                            {PIE_DATA.map((d, i) => (
                                <Flex key={d.type} align="center" gap={5}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: 2,
                                        background: PIE_COLORS[i], flexShrink: 0,
                                    }} />
                                    <Text style={{ fontSize: 12 }}>{d.type}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{d.value}%</Text>
                                </Flex>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ── Secondary charts ── */}
            <Row gutter={[16, 16]}>

                {/* Bar: node throughput */}
                <Col xs={24} md={10}>
                    <Card
                        size="small"
                        title={
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                                Node throughput
                            </span>
                        }
                    >
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={NODE_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} strokeDasharray={GRID_STYLE.strokeDasharray} />
                                <XAxis dataKey="node" tick={TICK_STYLE} tickLine={false} axisLine={false} />
                                <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar
                                    dataKey="throughput"
                                    name="MB/s"
                                    fill={accent}
                                    radius={[3, 3, 0, 0]}
                                    maxBarSize={36}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Line: error rate */}
                <Col xs={24} md={8}>
                    <Card
                        size="small"
                        title={
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                                Error rate
                            </span>
                        }
                    >
                        <ResponsiveContainer width="100%" height={160}>
                            <LineChart
                                data={errors.slice(-14)}
                                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} strokeDasharray={GRID_STYLE.strokeDasharray} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ ...TICK_STYLE, fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={3}
                                />
                                <YAxis tick={TICK_STYLE} tickLine={false} axisLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="errors"
                                    name="Errors"
                                    stroke={error}
                                    strokeWidth={2}
                                    dot={{ fill: error, r: 3, strokeWidth: 0 }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Card>
                </Col>

                {/* Progress: shard quota */}
                <Col xs={24} md={6}>
                    <Card
                        size="small"
                        style={{ height: '100%' }}
                        title={
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                                Shard quota
                            </span>
                        }
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
                            {SHARDS.map(s => {
                                const color = s.used > 85
                                    ? 'var(--color-error)'
                                    : s.used > 65
                                        ? 'var(--color-warning)'
                                        : 'var(--color-success)'
                                return (
                                    <div key={s.label}>
                                        <Flex justify="space-between" style={{ marginBottom: 4 }}>
                                            <Text style={{ fontSize: 12 }}>{s.label}</Text>
                                            <Text style={{ fontSize: 12, color }}>{s.used}%</Text>
                                        </Flex>
                                        <Progress
                                            percent={s.used}
                                            showInfo={false}
                                            size="small"
                                            strokeColor={color}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ── Recent files ── */}
            <Card
                size="small"
                title={
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>
                        Recent uploads
                    </span>
                }
                extra={<Text type="secondary" style={{ fontSize: 12 }}>Last 24 hours</Text>}
            >
                <Table
                    dataSource={FILES}
                    columns={COLS}
                    pagination={false}
                    size="small"
                />
            </Card>

        </div>
    )
}