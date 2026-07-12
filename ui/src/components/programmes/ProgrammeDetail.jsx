import { ArrowLeftOutlined, CalendarOutlined, EditOutlined, GlobalOutlined, HeatMapOutlined, PlusOutlined, TeamOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Drawer, Empty, Progress, Tabs, Tag, Card } from "antd";
import { useState } from "react";
import utils from "../../utils/function_utils";
import Activities from "../../components/programmes/Activities"
import Enrolment from "./Enrolment";
import DirectionsMap from "../map/Direction";
import useModal from "../../hooks/useModal"



const STATUS_THEME = {
    active: { color: '#10b981', bg: '#ecfdf5', tag: 'success' },
    planning: { color: '#3b82f6', bg: '#eff6ff', tag: 'processing' },
    completed: { color: '#6366f1', bg: '#f5f3ff', tag: 'default' },
};


function ProgrammeDetail({ programme, isMobile }) {
    const [selectedProject, setSelectedProject] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const mapModel = useModal({ width: 700, draggable: true, resetOnClose: true })

    console.log(programme)

    if (!programme) return (
        <div className="flex-1 flex items-center justify-center h-full bg-slate-50">
            <Empty
                description={<span className="text-slate-400 text-sm">Select a programme to view details</span>}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
        </div>
    );




    const pct = utils.getDurationProgress(programme?.start_date, programme?.end_date);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-blend-soft-light">
            {/* Header Section */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 p-6">


                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Button

                                icon={<HeatMapOutlined />}
                                onClick={() => mapModel.openModal({
                                    title: `Map Direction for ${programme.name}`,
                                    content: <>
                                        <DirectionsMap beneficiary={programme} />
                                    </>,
                                    footer: null
                                })}
                            >

                            </Button>
                            <Tag color={STATUS_THEME[programme.status]?.tag} className="m-0 border-none text-[10px] font-bold uppercase">
                                {programme.status}
                            </Tag>
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                            {programme.name}
                        </h2>
                        <div className="text-slate-500 text-sm max-w-2xl leading-relaxed space-y-2">
                            <p>{programme?.description}</p>
                            <div className="notes-callout" id="notesCallout" className='bg-amber-50 border-l-4 border-amber-300 p-3'>
                                {programme?.notes ||
                                    "N/A"}
                            </div>
                        </div>


                        <div className="flex items-center gap-6 mt-4 text-slate-400">
                            <div className="flex items-center gap-2 text-xs">
                                <CalendarOutlined />
                                <span className="font-medium text-slate-600">{utils.formatDateV3(programme?.start_date)} — {utils.formatDateV3(programme?.end_date)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <TeamOutlined />
                                <span className="font-medium text-slate-600">{programme.manager_name}</span>
                            </div>
                        </div>
                    </div>



                </div>
            </div>

            <div className="py-4">
                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[

                        { label: 'Budget', value: utils.currencyConvertor(programme.budget), icon: <WalletOutlined /> },
                        { label: 'Active Enrolment', value: programme.enrolment_count, icon: <TeamOutlined /> },
                        { label: 'Activities', value: programme.activity_count || 0, icon: <PlusOutlined /> },
                        { label: 'Completion', value: `${pct}`, icon: <Progress type="circle" percent={pct} size={12} strokeWidth={20} /> },
                    ].map((s, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-between">
                                {s.label}
                                <span className="opacity-70 text-[14px]">{s.icon}</span>
                            </div>
                            <div className="text-xl font-bold text-slate-800 tracking-tight">
                                {s.value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Table Section */}
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Activities & Enrolements Breakdown
                    </h3>
                </div>

                <div className="">
                    <Card>
                        <Tabs
                            items={[
                                {
                                    key: "activities",
                                    label: "Activities",
                                    children: (<>
                                        <Activities customID={programme?.custom_id} />
                                    </>)
                                }, {
                                    key: "enrolment",
                                    label: "Enrolment",
                                    children: (<>
                                        <Enrolment customID={programme?.custom_id} />
                                    </>)
                                }
                            ]}
                        />
                    </Card>

                </div>
            </div>

            {/* Project Drawer */}
            <Drawer
                title={
                    <div className="py-1">
                        <div className="text-slate-900 text-base font-bold">{selectedProject?.name}</div>
                        <div className="text-slate-500 text-xs font-normal mt-0.5">{programme.name}</div>
                    </div>
                }
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelectedProject(null); }}
                width={isMobile ? '100%' : 480}
                className="precision-drawer"
            >
                {/* Content Component goes here */}
                <div className="p-2 text-slate-600">Project specific details and activity logs...</div>
            </Drawer>

            {mapModel.modalJSX()}
        </div>
    );
}



export default ProgrammeDetail
