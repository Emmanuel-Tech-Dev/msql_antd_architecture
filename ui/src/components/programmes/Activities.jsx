import { useEffect } from 'react'
import { Tag, Skeleton } from 'antd'
import { CalendarOutlined, ArrowRightOutlined, CheckOutlined } from '@ant-design/icons'
import useApi from '../../hooks/useApi'
import utils from '../../utils/function_utils'

const STATUS_CONFIG = {
    completed: { label: 'Completed', dot: '#639922', badge: 'success' },
    in_progress: { label: 'In progress', dot: '#378ADD', badge: 'processing' },
    planned: { label: 'Planned', dot: '#888780', badge: 'default' },
    cancelled: { label: 'Cancelled', dot: '#E24B4A', badge: 'error' },
}



const initials = name => name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

const Activities = ({ customID }) => {
    const { run, data, loading } = useApi('get', `/api/projects/activities/${customID}`)

    useEffect(() => { run() }, [customID])

    const activities = data?.data || []

    if (loading) return <Skeleton active paragraph={{ rows: 4 }} />

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">Activities</span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {activities.length} total
                </span>
            </div>

            {/* List */}
            <div className="border border-slate-100 rounded-lg overflow-hidden bg-white">
                {activities.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                        No activities yet
                    </div>
                ) : (
                    activities.map((a, i) => {
                        const s = STATUS_CONFIG[a.status] || STATUS_CONFIG.planned
                        return (
                            <div
                                key={a.custom_id}
                                className="grid gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                                style={{
                                    gridTemplateColumns: '8px 1fr auto',
                                    borderBottom: i < activities.length - 1
                                        ? '1px solid #f1f5f9' : 'none'
                                }}
                            >
                                {/* Status dot */}
                                <div
                                    className="rounded-full mt-1.5 flex-shrink-0"
                                    style={{ width: 8, height: 8, background: s.dot }}
                                />

                                {/* Body */}
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-800 truncate mb-0.5">
                                        {a.name}
                                    </div>
                                    <div className="text-xs text-slate-500 leading-relaxed mb-2 line-clamp-2">
                                        {a.description}
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                            <CalendarOutlined />
                                            {utils.formatDateV3(a.start_date)}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                            <ArrowRightOutlined />
                                            {utils.formatDateV3(a.end_date)}
                                        </span>
                                    </div>
                                    {a.output && (
                                        <div className="mt-2 pl-2 py-1.5 text-xs text-slate-500
                                    border-l-2 border-green-400 leading-relaxed">
                                            <CheckOutlined className="text-green-500 mr-1" />
                                            {a.output}
                                        </div>
                                    )}
                                </div>

                                {/* Right */}
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <Tag
                                        color={s.badge}
                                        className="text-[11px] m-0 border-none"
                                    >
                                        {s.label}
                                    </Tag>
                                    {a.assigned_to_name && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600
                                      text-[9px] font-medium flex items-center justify-center">
                                                {initials(a.assigned_to_name)}
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {a.assigned_to_name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default Activities