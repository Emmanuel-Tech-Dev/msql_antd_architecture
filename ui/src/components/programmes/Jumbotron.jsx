import { useEffect } from 'react'
import useApi from '../../hooks/useApi'
import { Button, Card, Progress, Space, Tag } from 'antd';
import { BankOutlined, CalendarOutlined, ClockCircleOutlined, EditOutlined, FlagOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { PageHeader } from '../PageHeader';
import utils from '../../utils/function_utils';

const STATUS_THEME = {
    active: { color: '#10b981', bg: '#ecfdf5', tag: 'success' },
    planning: { color: '#3b82f6', bg: '#eff6ff', tag: 'processing' },
    completed: { color: '#6366f1', bg: '#f5f3ff', tag: 'default' },
};



function StatsPanel({
    projectCount = 3,
    startDate = '1 Jan 2025',
    endDate = '31 Dec 2026',
}) {
    return (
        <div className="w-[280px] shrink-0 self-stretch font-sans">

            {/* Projects count — hero stat */}
            <div className="bg-indigo-50 rounded-lg p-4 mb-3 text-center">
                <div className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
                    Projects
                </div>
                <div className="text-indigo-600 text-4xl font-extrabold tracking-tight">
                    {projectCount}
                </div>
            </div>

            {/* Date + Progress grid */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">

                {/* Start Date */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                            <CalendarOutlined />
                        </div>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Start</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{utils.formatDateV3(startDate)}</span>
                </div>

                {/* End Date */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                            <FlagOutlined />
                        </div>
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">End</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{utils.formatDateV3(endDate)}</span>
                </div>

                {/* Duration Progress */}
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-[10px]">
                                <ClockCircleOutlined />
                            </div>
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Progress</span>
                        </div>
                        <span className="text-sm font-bold text-indigo-600">{utils.getDurationProgress(startDate, endDate)}%</span>
                    </div>

                    {/* Ant Design Progress Component */}
                    <Progress
                        percent={utils.getDurationProgress(startDate, endDate)}
                        showInfo={false}
                        strokeColor="#6366f1"
                        trailColor="#f1f5f9"
                        strokeWidth={8}
                        className="m-0 p-0"
                    />
                </div>

            </div>
        </div>
    );
}

const Jumbotron = ({ cid }) => {

    const { run, data } = useApi("get", `/api/ngo/programme/${cid}`)


    useEffect(() => {
        run()
        // `run` is recreated by this legacy hook; the programme id is the request trigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cid])


    return (
        <>

            <PageHeader
                title={data?.data.name}
                items={[
                    {
                        title: 'Home',
                    },
                    {
                        title: <a href="/admin/programmes">Programmes</a>,
                    },
                    {
                        title: <>{data?.data.name}</>,
                    },
                ]}

                actions={
                    <>
                        <Space>
                            <Button icon={<EditOutlined />} className="border-slate-200 text-slate-600">Edit</Button>
                            <Button type="primary" icon={<PlusOutlined />} className="bg-indigo-600 border-none shadow-md shadow-indigo-100">
                                New Project
                            </Button>
                        </Space>

                    </>
                }
            />

            <div className='bg-white p-4 rounded border border-slate-100 flex justify-between gap-2 items-center'>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">
                            {data?.data.sector || 'General'}
                        </span>
                        <Tag color={STATUS_THEME[data?.data.status]?.tag} className="m-0 border-none text-[10px] font-bold uppercase">
                            {data?.data.status}
                        </Tag>
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                        {data?.data.name}
                    </h2>
                    <div className="text-slate-500 text-sm max-w-2xl leading-relaxed space-y-2">
                        <p>{data?.data.description}</p>
                        <div className="notes-callout" id="notesCallout" className='bg-amber-50 border-l-4 border-amber-300 p-3'>
                            {data?.data.notes}
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mt-4 text-slate-400">
                        <div className="flex items-center gap-2 text-xs">
                            <CalendarOutlined />
                            <span className="font-medium text-slate-600">Jan 2026 — Dec 2026</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <TeamOutlined />
                            <span className="font-medium text-slate-600">{data?.data.manager_name}</span>
                        </div><div className="flex items-center gap-2 text-xs">
                            <BankOutlined />
                            <span className="font-medium text-slate-600">{data?.data.office_name}</span>
                        </div>
                    </div>
                </div>

                <StatsPanel projectCount={data?.data.project_count} endDate={data?.data?.end_date} startDate={data?.data?.start_date} />

            </div>
        </>


    )
}

export default Jumbotron
