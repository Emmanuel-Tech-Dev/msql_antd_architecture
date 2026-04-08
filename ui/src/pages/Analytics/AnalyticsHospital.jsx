import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  Card, Statistic, Tag, Table, Segmented, Progress, Alert,
  DatePicker, Typography, Row, Col, Flex, Badge, Timeline,
  Input,
} from 'antd'
import {
  ArrowUpOutlined, ArrowDownOutlined,
  HeartOutlined, MedicineBoxOutlined,
  UserOutlined, AlertOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

// ── Data ─────────────────────────────────────────────────────────
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12']

const ADMISSIONS = WEEKS.map(w => ({
  week: w,
  admissions: Math.round(48 + Math.sin(WEEKS.indexOf(w) / 2) * 12 + Math.random() * 8),
  discharges: Math.round(44 + Math.cos(WEEKS.indexOf(w) / 2) * 10 + Math.random() * 6),
  emergency: Math.round(14 + Math.random() * 8),
}))

const DEPT_OCCUPANCY = [
  { dept: 'Cardiology', occupancy: 88, capacity: 40 },
  { dept: 'Orthopedics', occupancy: 72, capacity: 30 },
  { dept: 'Pediatrics', occupancy: 61, capacity: 35 },
  { dept: 'ICU', occupancy: 94, capacity: 20 },
  { dept: 'Oncology', occupancy: 79, capacity: 25 },
  { dept: 'Neurology', occupancy: 55, capacity: 28 },
]

const DIAGNOSIS = [
  { name: 'Cardiovascular', value: 28 },
  { name: 'Respiratory', value: 22 },
  { name: 'Orthopedic', value: 18 },
  { name: 'Neurological', value: 14 },
  { name: 'Other', value: 18 },
]

const WAIT_TIMES = WEEKS.map((w, i) => ({
  week: w,
  er: Math.round(24 + Math.sin(i / 3) * 8 + Math.random() * 6),
  outpatient: Math.round(8 + Math.cos(i / 4) * 3 + Math.random() * 3),
}))

const RECENT_ALERTS = [
  { key: 1, dept: 'ICU', msg: 'Bed capacity at 94%', severity: 'error', time: '8 min ago' },
  { key: 2, dept: 'Pharmacy', msg: 'Insulin stock below threshold', severity: 'warning', time: '22 min ago' },
  { key: 3, dept: 'Cardiology', msg: '3 critical patients admitted', severity: 'error', time: '41 min ago' },
  { key: 4, dept: 'Lab', msg: 'PCR results delayed >2h', severity: 'warning', time: '1 hr ago' },
  { key: 5, dept: 'Orthopedics', msg: 'OR schedule updated', severity: 'success', time: '2 hr ago' },
]

const STAFF_SHIFTS = [
  { key: 1, name: 'Dr. Mensah, K.', role: 'Cardiologist', shift: 'Morning', status: 'on-duty' },
  { key: 2, name: 'Dr. Kowalski, A.', role: 'Neurologist', shift: 'Morning', status: 'on-duty' },
  { key: 3, name: 'Nurse Diallo, F.', role: 'Head Nurse ICU', shift: 'Morning', status: 'on-duty' },
  { key: 4, name: 'Dr. Chen, L.', role: 'Surgeon', shift: 'Afternoon', status: 'on-call' },
  { key: 5, name: 'Dr. Okafor, B.', role: 'Pediatrician', shift: 'Night', status: 'off-duty' },
]

const TICK = { fontSize: 11, fill: 'var(--color-text-tertiary)' }
const GRID = { stroke: 'var(--color-border)', strokeDasharray: '3 3' }

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

const ALERT_COLS = [
  {
    title: 'Dept', dataIndex: 'dept', key: 'dept', width: 100,
    render: v => <Tag>{v}</Tag>
  },
  {
    title: 'Alert', dataIndex: 'msg', key: 'msg',
    render: v => <Text style={{ fontSize: 13 }}>{v}</Text>
  },
  {
    title: 'Severity', dataIndex: 'severity', key: 'severity', width: 90,
    render: v => <Tag color={v}>{v}</Tag>
  },
  {
    title: 'Time', dataIndex: 'time', key: 'time', width: 100,
    render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
  },
]

const STAFF_COLS = [
  {
    title: 'Name', dataIndex: 'name', key: 'name',
    render: v => <Text style={{ fontSize: 13 }}>{v}</Text>
  },
  {
    title: 'Role', dataIndex: 'role', key: 'role',
    render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>
  },
  { title: 'Shift', dataIndex: 'shift', key: 'shift', width: 90 },
  {
    title: 'Status', dataIndex: 'status', key: 'status', width: 90,
    render: v => <Tag color={
      v === 'on-duty' ? 'success' : v === 'on-call' ? 'warning' : 'default'
    }>{v}</Tag>
  },
]

export function AnalyticsHospital() {
  const [view, setView] = useState('12w')
  const accent = cv('--color-accent')
  const info = cv('--color-info')
  const success = cv('--color-success')
  const error = cv('--color-error')
  const warning = cv('--color-warning')
  const disabled = cv('--color-text-disabled')
  const PIE_COLORS = [error, warning, accent, info, disabled]

  const criticalCount = DEPT_OCCUPANCY.filter(d => d.occupancy >= 90).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Critical alert banner */}
      {criticalCount > 0 && (
        <Alert
          type="error"
          showIcon
          message={`${criticalCount} department${criticalCount > 1 ? 's' : ''} at critical capacity`}
          description="ICU at 94% occupancy. Consider activating overflow protocol."
          closable
        />
      )}

      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Hospital analytics</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            St. Cross Medical Centre · operations dashboard
          </Text>
        </div>
        <Flex gap={8} wrap="wrap">
          <RangePicker size="small" picker="week" />
          {/* <Input /> */}
          <Segmented size="small" value={view} onChange={setView}
            options={['4w', '8w', '12w']} />
        </Flex>
      </Flex>

      {/* KPIs */}
      <Row gutter={[16, 16]}>
        {[
          { icon: <UserOutlined />, title: 'Current inpatients', value: '312', delta: '+14', up: true },
          { icon: <MedicineBoxOutlined />, title: 'Avg length of stay', value: '4.2d', delta: '-0.3d', up: true },
          { icon: <HeartOutlined />, title: 'Patient satisfaction', value: '4.6★', delta: '+0.2', up: true },
          { icon: <AlertOutlined />, title: 'Critical incidents', value: '2', delta: '+1', up: false },
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
                  <Text style={{
                    fontSize: 11, letterSpacing: '0.05em',
                    textTransform: 'uppercase', color: 'var(--color-text-tertiary)'
                  }}>
                    {k.title}
                  </Text>
                  <div style={{
                    fontSize: 22, fontFamily: 'var(--font-display)',
                    fontWeight: 700, lineHeight: 1.3, color: 'var(--color-text-primary)'
                  }}>
                    {k.value}
                  </div>
                  <Flex align="center" gap={4} style={{ marginTop: 2 }}>
                    {k.up
                      ? <ArrowUpOutlined style={{ color: 'var(--color-success)', fontSize: 10 }} />
                      : <ArrowDownOutlined style={{ color: 'var(--color-error)', fontSize: 10 }} />}
                    <Text style={{
                      fontSize: 11,
                      color: k.up ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {k.delta}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>vs last period</Text>
                  </Flex>
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Admissions + Diagnosis mix */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Admissions & discharges</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Weekly</Text>}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ADMISSIONS} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAdm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={success} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID.stroke} strokeDasharray={GRID.strokeDasharray} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 12 }}
                  formatter={v => <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>} />
                <Area type="monotone" dataKey="admissions" name="Admissions"
                  stroke={accent} strokeWidth={2} fill="url(#gAdm)"
                  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="discharges" name="Discharges"
                  stroke={success} strokeWidth={2} fill="url(#gDis)"
                  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="emergency" name="Emergency"
                  stroke={error} strokeWidth={1.5} strokeDasharray="4 4"
                  dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card size="small" style={{ height: '100%' }}
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Diagnosis mix</span>}
          >
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={DIAGNOSIS} cx="50%" cy="50%" innerRadius={42} outerRadius={64}
                  paddingAngle={2} dataKey="value">
                  {DIAGNOSIS.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {DIAGNOSIS.map((d, i) => (
                <Flex key={d.name} justify="space-between">
                  <Flex align="center" gap={6}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i] }} />
                    <Text style={{ fontSize: 11 }}>{d.name}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>{d.value}%</Text>
                </Flex>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Dept occupancy + Wait times */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={11}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Department occupancy</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              {DEPT_OCCUPANCY.map(d => {
                const color = d.occupancy >= 90
                  ? 'var(--color-error)'
                  : d.occupancy >= 75
                    ? 'var(--color-warning)'
                    : 'var(--color-success)'
                return (
                  <div key={d.dept}>
                    <Flex justify="space-between" style={{ marginBottom: 3 }}>
                      <Flex align="center" gap={6}>
                        {d.occupancy >= 90 && <Badge status="error" />}
                        <Text style={{ fontSize: 12 }}>{d.dept}</Text>
                      </Flex>
                      <Text style={{ fontSize: 12, color }}>
                        {d.occupancy}% · {Math.round(d.capacity * d.occupancy / 100)}/{d.capacity} beds
                      </Text>
                    </Flex>
                    <Progress percent={d.occupancy} showInfo={false} size="small" strokeColor={color} />
                  </div>
                )
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={13}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Avg wait times</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Minutes</Text>}
          >
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ADMISSIONS} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID.stroke} strokeDasharray={GRID.strokeDasharray} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 12 }}
                  formatter={v => <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>} />
                <Line type="monotone" dataKey="emergency" name="ER wait (min)"
                  stroke={error} strokeWidth={2}
                  dot={{ fill: error, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="discharges" name="Outpatient (min)"
                  stroke={info} strokeWidth={2}
                  dot={{ fill: info, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Alerts + Staff */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Active alerts</span>}
            extra={
              <Flex align="center" gap={6}>
                <Badge status="error" />
                <Text type="secondary" style={{ fontSize: 12 }}>2 critical</Text>
              </Flex>
            }
          >
            <Table dataSource={RECENT_ALERTS} columns={ALERT_COLS} pagination={false} size="small" />
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Staff on shift</span>}
          >
            <Table dataSource={STAFF_SHIFTS} columns={STAFF_COLS} pagination={false} size="small" />
          </Card>
        </Col>
      </Row>

    </div>
  )
}
