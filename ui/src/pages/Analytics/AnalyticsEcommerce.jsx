import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  Card, Statistic, Tag, Table, Segmented, Badge,
  DatePicker, Typography, Row, Col, Flex, Rate,
} from 'antd'
import {
  ArrowUpOutlined, ArrowDownOutlined,
  ShoppingCartOutlined, DollarOutlined,
  UserOutlined, StarOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

// ── Data ─────────────────────────────────────────────────────────
const DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (30 - i) * 864e5)
  return {
    date:     d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    revenue:  Math.round(4200 + Math.sin(i / 4) * 1800 + Math.random() * 800),
    orders:   Math.round(82  + Math.sin(i / 3) * 30   + Math.random() * 20),
    visitors: Math.round(1400 + Math.cos(i / 5) * 400  + Math.random() * 200),
  }
})

const CATEGORIES = [
  { name: 'Electronics',  revenue: 48200, orders: 312, growth: 12.4 },
  { name: 'Clothing',     revenue: 31600, orders: 541, growth:  8.1 },
  { name: 'Home & Garden',revenue: 22800, orders: 198, growth: 18.7 },
  { name: 'Books',        revenue: 11400, orders: 423, growth: -2.3 },
  { name: 'Sports',       revenue: 19700, orders: 267, growth: 21.0 },
]

const TRAFFIC = [
  { source: 'Organic',  value: 34 },
  { source: 'Social',   value: 26 },
  { source: 'Direct',   value: 21 },
  { source: 'Email',    value: 12 },
  { source: 'Paid',     value:  7 },
]

const FUNNEL = [
  { stage: 'Visitors',   count: 18420 },
  { stage: 'Product view', count: 7640 },
  { stage: 'Add to cart', count: 2180 },
  { stage: 'Checkout',   count: 1340 },
  { stage: 'Purchased',  count:  890 },
]

const RECENT_ORDERS = [
  { key:1, id:'#ORD-8821', customer:'Kwame Asante',   product:'MacBook Pro 14"', amount:'$2,499', status:'shipped',    time:'5 min ago' },
  { key:2, id:'#ORD-8820', customer:'Priya Nair',     product:'Nike Air Max 90', amount:'$129',   status:'processing', time:'12 min ago' },
  { key:3, id:'#ORD-8819', customer:'Tom Eriksson',   product:'IKEA KALLAX',     amount:'$219',   status:'delivered',  time:'34 min ago' },
  { key:4, id:'#ORD-8818', customer:'Aisha Conteh',   product:'The Lean Startup',amount:'$18',    status:'delivered',  time:'1 hr ago' },
  { key:5, id:'#ORD-8817', customer:'Marco Bianchi',  product:'Yoga mat',        amount:'$64',    status:'cancelled',  time:'2 hr ago' },
]

const STATUS_COLOR = {
  shipped:    'processing',
  processing: 'warning',
  delivered:  'success',
  cancelled:  'error',
}

const TICK  = { fontSize: 11, fill: 'var(--color-text-tertiary)' }
const GRID  = { stroke: 'var(--color-border)', strokeDasharray: '3 3' }
const $fmt  = v => `$${v.toLocaleString()}`

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--color-bg-container)', border: '1px solid var(--color-border)',
      borderRadius: 6, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <Flex key={p.dataKey} gap={8} align="center">
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          <Text style={{ fontSize: 12 }}>{p.name}: <strong>{p.value}</strong></Text>
        </Flex>
      ))}
    </div>
  )
}

const ORDER_COLS = [
  { title: 'Order',    dataIndex: 'id',       key: 'id',       width: 95,
    render: v => <Text style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v}</Text> },
  { title: 'Customer', dataIndex: 'customer', key: 'customer' },
  { title: 'Product',  dataIndex: 'product',  key: 'product',
    render: v => <Text style={{ fontSize: 12 }}>{v}</Text> },
  { title: 'Amount',   dataIndex: 'amount',   key: 'amount',   width: 90,
    render: v => <Text style={{ fontWeight: 600 }}>{v}</Text> },
  { title: 'Status',   dataIndex: 'status',   key: 'status',   width: 100,
    filters: ['shipped','processing','delivered','cancelled'].map(s => ({ text: s, value: s })),
    onFilter: (v, r) => r.status === v,
    render: v => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
  { title: 'Time',     dataIndex: 'time',     key: 'time',     width: 100,
    render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text> },
]

export function AnalyticsEcommerce() {
  const [period, setPeriod] = useState('30d')
  const accent  = cv('--color-accent')
  const info    = cv('--color-info')
  const success = cv('--color-success')
  const warning = cv('--color-warning')
  const error   = cv('--color-error')
  const disabled= cv('--color-text-disabled')
  const PIE_COLORS = [accent, info, success, warning, disabled]

  const slice = period === '7d' ? DAYS.slice(-7) : period === '14d' ? DAYS.slice(-14) : DAYS

  const totalRevenue = slice.reduce((s, d) => s + d.revenue, 0)
  const totalOrders  = slice.reduce((s, d) => s + d.orders,  0)
  const convRate     = ((890 / 18420) * 100).toFixed(1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <div>
          <Title level={2} style={{ margin: 0 }}>E-commerce analytics</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Storefront overview · live dashboard
          </Text>
        </div>
        <Flex gap={8} wrap="wrap">
          <RangePicker size="small" />
          <Segmented size="small" value={period} onChange={setPeriod}
            options={['7d', '14d', '30d']} />
        </Flex>
      </Flex>

      {/* KPIs */}
      <Row gutter={[16, 16]}>
        {[
          { icon: <DollarOutlined />,      title: 'Total revenue',   value: `$${Math.round(totalRevenue / 1000)}k`, delta: '+18.4%', up: true  },
          { icon: <ShoppingCartOutlined />,title: 'Total orders',    value: totalOrders, delta: '+12.1%',  up: true  },
          { icon: <UserOutlined />,        title: 'Unique visitors', value: '18,420',    delta: '+7.3%',   up: true  },
          { icon: <StarOutlined />,        title: 'Conversion rate', value: `${convRate}%`, delta: '-0.3%', up: false },
        ].map(k => (
          <Col xs={12} sm={12} md={6} key={k.title}>
            <Card size="small" style={{ height: '100%' }}>
              <Flex gap={10} align="flex-start">
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--color-accent-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-accent)', fontSize: 16, flexShrink: 0,
                }}>
                  {k.icon}
                </div>
                <div>
                  <Text style={{ fontSize: 11, letterSpacing: '0.05em',
                    textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                    {k.title}
                  </Text>
                  <div style={{ fontSize: 22, fontFamily: 'var(--font-display)',
                    fontWeight: 700, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>
                    {k.value}
                  </div>
                  <Flex align="center" gap={4} style={{ marginTop: 2 }}>
                    {k.up
                      ? <ArrowUpOutlined   style={{ color: 'var(--color-success)', fontSize: 10 }} />
                      : <ArrowDownOutlined style={{ color: 'var(--color-error)',   fontSize: 10 }} />}
                    <Text style={{ fontSize: 11,
                      color: k.up ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {k.delta}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>vs prev period</Text>
                  </Flex>
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Revenue + Traffic source */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={17}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Revenue & orders</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Daily</Text>}
          >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={slice} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={accent} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID.stroke} strokeDasharray={GRID.strokeDasharray} />
                <XAxis dataKey="date" tick={TICK} tickLine={false} axisLine={false} interval={4} />
                <YAxis yAxisId="rev" tick={TICK} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="ord" orientation="right" tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 12 }}
                  formatter={v => <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>} />
                <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue"
                  stroke={accent} strokeWidth={2} fill="url(#gRev)" dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }} />
                <Bar yAxisId="ord" dataKey="orders" name="Orders" fill={info}
                  radius={[2,2,0,0]} maxBarSize={8} opacity={0.7} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={7}>
          <Card size="small" style={{ height: '100%' }}
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Traffic sources</span>}
          >
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={TRAFFIC} cx="50%" cy="50%" innerRadius={40} outerRadius={62}
                  paddingAngle={2} dataKey="value">
                  {TRAFFIC.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`}
                  contentStyle={{
                    background: 'var(--color-bg-container)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6, fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
              {TRAFFIC.map((d, i) => (
                <Flex key={d.source} justify="space-between" align="center">
                  <Flex align="center" gap={6}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i] }} />
                    <Text style={{ fontSize: 12 }}>{d.source}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12 }}>{d.value}%</Text>
                </Flex>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Sales funnel + Category breakdown */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Sales funnel</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
              {FUNNEL.map((f, i) => {
                const pct = Math.round((f.count / FUNNEL[0].count) * 100)
                return (
                  <div key={f.stage}>
                    <Flex justify="space-between" style={{ marginBottom: 3 }}>
                      <Text style={{ fontSize: 12 }}>{f.stage}</Text>
                      <Flex gap={8}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {f.count.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 12, color: 'var(--color-accent)', minWidth: 32, textAlign: 'right' }}>
                          {pct}%
                        </Text>
                      </Flex>
                    </Flex>
                    <div style={{
                      height: 8, borderRadius: 4,
                      background: 'var(--color-bg-sunken)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        borderRadius: 4,
                        background: i === FUNNEL.length - 1
                          ? 'var(--color-success)'
                          : 'var(--color-accent)',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Category performance</span>}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={CATEGORIES} layout="vertical"
                margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={GRID.stroke} strokeDasharray={GRID.strokeDasharray} />
                <XAxis type="number" tick={TICK} tickLine={false} axisLine={false}
                  tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} axisLine={false} width={88} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="revenue" name="Revenue" fill={accent}
                  radius={[0,3,3,0]} maxBarSize={18}
                  label={{
                    position: 'right',
                    formatter: (v, _, i) => {
                      const g = CATEGORIES[i]?.growth
                      return g ? (g > 0 ? `+${g}%` : `${g}%`) : ''
                    },
                    style: {
                      fontSize: 10,
                      fill: 'var(--color-text-tertiary)',
                    },
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent orders */}
      <Card size="small"
        title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Recent orders</span>}
        extra={
          <Flex align="center" gap={6}>
            <Badge status="processing" />
            <Text type="secondary" style={{ fontSize: 12 }}>Live</Text>
          </Flex>
        }
      >
        <Table dataSource={RECENT_ORDERS} columns={ORDER_COLS} pagination={false} size="small" />
      </Card>

    </div>
  )
}
