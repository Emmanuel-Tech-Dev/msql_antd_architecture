import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  Card, Statistic, Tag, Table, Segmented, Progress,
  DatePicker, Typography, Row, Col, Flex, Avatar, Badge,
} from 'antd'
import {
  ArrowUpOutlined, ArrowDownOutlined,
  BookOutlined, TeamOutlined, TrophyOutlined, ClockCircleOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

// ── Data ─────────────────────────────────────────────────────────
const MONTHS = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May']

const ATTENDANCE = MONTHS.map(m => ({
  month: m,
  present: Math.round(88 + Math.random() * 8),
  absent:  Math.round(4  + Math.random() * 8),
}))

const GRADES_DIST = [
  { grade: 'A', count: 142 },
  { grade: 'B', count: 218 },
  { grade: 'C', count: 176 },
  { grade: 'D', count:  89 },
  { grade: 'F', count:  31 },
]

const SUBJECT_PERF = [
  { subject: 'Math',    score: 74 },
  { subject: 'English', score: 81 },
  { subject: 'Science', score: 68 },
  { subject: 'History', score: 77 },
  { subject: 'Arts',    score: 89 },
  { subject: 'PE',      score: 92 },
]

const ENROLLMENT = MONTHS.map((m, i) => ({
  month: m,
  enrolled: 1200 + i * 12 + Math.round(Math.random() * 20),
}))

const TOP_STUDENTS = [
  { key:1, name:'Amara Osei',     grade:'A+', gpa:'4.0', subject:'Science',  attendance:'98%' },
  { key:2, name:'Lucas Ferreira', grade:'A',  gpa:'3.9', subject:'Math',     attendance:'96%' },
  { key:3, name:'Yuki Tanaka',    grade:'A',  gpa:'3.8', subject:'Arts',     attendance:'100%' },
  { key:4, name:'Sara Al-Amin',   grade:'A-', gpa:'3.7', subject:'English',  attendance:'94%' },
  { key:5, name:'James Boateng',  grade:'A-', gpa:'3.7', subject:'History',  attendance:'97%' },
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

const COLS = [
  { title: 'Student', dataIndex: 'name', key: 'name',
    render: (v) => (
      <Flex align="center" gap={8}>
        <Avatar size={28} style={{ background: 'var(--color-accent)', fontSize: 11 }}>
          {v.split(' ').map(w => w[0]).join('')}
        </Avatar>
        <Text style={{ fontSize: 13 }}>{v}</Text>
      </Flex>
    ),
  },
  { title: 'GPA',     dataIndex: 'gpa',        key: 'gpa',        width: 60 },
  { title: 'Grade',   dataIndex: 'grade',      key: 'grade',      width: 70,
    render: v => <Tag color={v.startsWith('A') ? 'success' : v === 'B' ? 'processing' : 'default'}>{v}</Tag> },
  { title: 'Top subject', dataIndex: 'subject', key: 'subject',   width: 100 },
  { title: 'Attendance',  dataIndex: 'attendance', key: 'attendance', width: 100,
    render: v => <Text style={{ fontSize: 12, color: 'var(--color-success)' }}>{v}</Text> },
]

export function AnalyticsSchool() {
  const [term, setTerm] = useState('Semester')
  const accent  = cv('--color-accent')
  const info    = cv('--color-info')
  const success = cv('--color-success')
  const error   = cv('--color-error')
  const warning = cv('--color-warning')
  const disabled= cv('--color-text-disabled')
  const GRADE_COLORS = [success, info, accent, warning, error]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <div>
          <Title level={2} style={{ margin: 0 }}>School analytics</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Westfield Academy · 2024 – 2025 academic year
          </Text>
        </div>
        <Flex gap={8} wrap="wrap">
          <RangePicker size="small" picker="month" />
          <Segmented size="small" value={term} onChange={setTerm}
            options={['Term', 'Semester', 'Year']} />
        </Flex>
      </Flex>

      {/* KPIs */}
      <Row gutter={[16, 16]}>
        {[
          { icon: <TeamOutlined />,        title: 'Total students',  value: '1,284', delta: '+48',   up: true  },
          { icon: <BookOutlined />,        title: 'Avg GPA',         value: '3.24',  delta: '+0.12', up: true  },
          { icon: <ClockCircleOutlined />, title: 'Attendance rate', value: '93.4%', delta: '-0.6%', up: false },
          { icon: <TrophyOutlined />,      title: 'Honor roll',      value: '342',   delta: '+28',   up: true  },
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
                    <Text type="secondary" style={{ fontSize: 11 }}>vs last term</Text>
                  </Flex>
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Attendance + Enrollment */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Daily attendance</span>}
            extra={<Text type="secondary" style={{ fontSize: 12 }}>% of enrolled</Text>}
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={ATTENDANCE} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={success} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={success} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={error} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={error} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={GRID.stroke} strokeDasharray={GRID.strokeDasharray} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ fontSize: 12 }}
                  formatter={v => <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>} />
                <Area type="monotone" dataKey="present" name="Present %" stroke={success}
                  strokeWidth={2} fill="url(#gPresent)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="absent"  name="Absent %"  stroke={error}
                  strokeWidth={2} fill="url(#gAbsent)"  dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card size="small" style={{ height: '100%' }}
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Enrollment trend</span>}
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ENROLLMENT} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID.stroke} strokeDasharray={GRID.strokeDasharray} />
                <XAxis dataKey="month" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="enrolled" name="Students" stroke={accent}
                  strokeWidth={2} dot={{ fill: accent, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Grade dist + Subject radar */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={10}>
          <Card size="small"
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Grade distribution</span>}
          >
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={GRADES_DIST} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID.stroke} strokeDasharray={GRID.strokeDasharray} />
                <XAxis dataKey="grade" tick={TICK} tickLine={false} axisLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="count" name="Students" radius={[3,3,0,0]} maxBarSize={40}>
                  {GRADES_DIST.map((_, i) => (
                    <Cell key={i} fill={GRADE_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={7}>
          <Card size="small" style={{ height: '100%' }}
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Subject performance</span>}
          >
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={SUBJECT_PERF} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <PolarGrid stroke={cv('--color-border')} />
                <PolarAngleAxis dataKey="subject"
                  tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} />
                <Radar dataKey="score" name="Avg score" stroke={accent}
                  fill={accent} fillOpacity={0.2} strokeWidth={2} />
                <Tooltip content={<Tip />} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} md={7}>
          <Card size="small" style={{ height: '100%' }}
            title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Pass rate by subject</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              {SUBJECT_PERF.map(s => (
                <div key={s.subject}>
                  <Flex justify="space-between" style={{ marginBottom: 3 }}>
                    <Text style={{ fontSize: 12 }}>{s.subject}</Text>
                    <Text style={{ fontSize: 12,
                      color: s.score >= 80 ? 'var(--color-success)'
                           : s.score >= 70 ? 'var(--color-warning)'
                           : 'var(--color-error)' }}>
                      {s.score}%
                    </Text>
                  </Flex>
                  <Progress percent={s.score} showInfo={false} size="small"
                    strokeColor={
                      s.score >= 80 ? 'var(--color-success)'
                    : s.score >= 70 ? 'var(--color-warning)'
                    : 'var(--color-error)'
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Top students */}
      <Card size="small"
        title={<span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>Top students</span>}
        extra={<Text type="secondary" style={{ fontSize: 12 }}>By GPA this term</Text>}
      >
        <Table dataSource={TOP_STUDENTS} columns={COLS} pagination={false} size="small" />
      </Card>

    </div>
  )
}
