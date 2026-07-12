import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Tag, Button, Spin, message,
    Tabs, Card, Popconfirm, Select, Modal, Form, Input,
    Empty, Space, Typography, Divider, Progress, Avatar, Row, Col, Statistic
} from 'antd';
import {
    ArrowLeftOutlined, EditOutlined, StopOutlined,
    PhoneOutlined, MailOutlined, EnvironmentOutlined,
    IdcardOutlined, CalendarOutlined, UserOutlined,
    SafetyOutlined, HomeOutlined, GlobalOutlined
} from '@ant-design/icons';
import useApi from '../../hooks/useApi';
import useTableApi from '../../hooks/useTableApi';
import CustomTable from '../CustomTable';
import useDrawer from '../../hooks/useDrawer';
import DirectionsMap from '../map/Direction';

const STATUS_COLOR = {
    active: 'green', inactive: 'orange', exited: 'default',
};

const { Title, Text, Paragraph } = Typography;

export default function BeneficiaryInfo({ customId }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [exitModal, setExitModal] = useState(false);
    const [form] = Form.useForm();

    const editDetailsDrawer = useDrawer({ destroyOnClose: true });

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: true },
        'custom_id',
        {}
    );

    const { run, data, loading } = useApi("get", `/api/ngo/beneficiary/${customId}`);

    useEffect(() => { run(); }, [customId]);

    const handleExit = async (values) => {
        try {
            message.success('Beneficiary exited');
            setExitModal(false);
        } catch (err) {
            message.error(err.response?.data?.data?.message || 'Failed');
        }
    };

    function init(data) {
        if (data?.status === "ok") {
            table.setRecord(data?.data?.enrolment || []);
        }
    }

    useEffect(() => {
        table.setLoading(loading);
        init(data);
    }, [data]);

    const enrolmentColumns = [
        { title: 'Programme', dataIndex: 'programme_name', render: v => <span className=" font-medium">{v}</span> },
        { title: 'Project', dataIndex: 'project_name', render: v => <span className="">{v}</span> },
        {
            title: 'Status', dataIndex: 'status', width: 90,
            render: s => <Tag color={s === 'active' ? 'green' : 'default'} className="border-0 px-2.5 py-0.5">{s}</Tag>,
        },
        {
            title: 'Enrolled', dataIndex: 'enrolled_at', width: 120,
            render: v => <span className="text-xs text-[#808a94]">
                {v ? new Date(v).toLocaleDateString() : '—'}
            </span>,
        },
    ];

    const getScoreColor = (score) => {
        if (score >= 70) return { color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.1)', text: 'High Risk' };
        if (score >= 40) return { color: '#faad14', bg: 'rgba(250, 173, 20, 0.1)', text: 'Medium Risk' };
        return { color: '#52c41a', bg: 'rgba(82, 196, 26, 0.1)', text: 'Low Risk' };
    };

    const tabItems = [
        {
            key: 'details',
            label: 'Details',
            children: (
                <div className="flex flex-col h-full gap-6">

                    {/* --- 1. Identity Header Strip --- */}
                    <div className="flex items-center gap-5 p-5 rounded-lg  border border-[#e0e0e0]">
                        <Avatar
                            size={72}
                            icon={<UserOutlined />}
                            src={data?.data.photo_url}
                            className="border border-[#1e2124]"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-xl font-semibold m-0 tracking-tight leading-none">
                                    {data?.data.first_name} {data?.data.last_name}
                                </h3>
                                <Tag color={STATUS_COLOR[data?.data.status]} className="m-0 border-0 text-xs px-2.5 py-0.5">
                                    {data?.data.status}
                                </Tag>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#a0aab4] mt-2.5">
                                <span className="bg-[#1e241f] px-2 py-0.5 rounded  font-mono">{data?.data.custom_id}</span>
                                {data?.data.gender && <span>• {data?.data.gender}</span>}
                                {data?.data.date_of_birth && <span>• Born {new Date(data?.data.date_of_birth).getFullYear()}</span>}
                            </div>
                        </div>
                    </div>

                    {/* --- 2. Vulnerability Score (Subtle Banner) --- */}
                    {(data?.data.vulnerability_score != null) && (
                        <div
                            className={`p-4 rounded-lg border  flex items-center justify-between gap-4 `}
                            style={{ background: getScoreColor(data?.data.vulnerability_score).bg, borderColor: getScoreColor(data?.data.vulnerability_score).color + '1A' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg">
                                    <SafetyOutlined style={{ fontSize: 18, color: getScoreColor(data?.data.vulnerability_score).color }} />
                                </div>
                                <div>
                                    <span className="text-[#a0aab4] text-[11px] uppercase tracking-wider block font-medium">Vulnerability Status</span>
                                    <div className="flex items-baseline gap-1.5 mt-0.5">
                                        <span className="text-xl font-bold leading-none" style={{ color: getScoreColor(data?.data.vulnerability_score).color }}>
                                            {data?.data.vulnerability_score}
                                        </span>
                                        <span className="text-[#808a94] text-xs">/ 100</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded ml-2" style={{ color: getScoreColor(data?.data.vulnerability_score).color }}>
                                            {getScoreColor(data?.data.vulnerability_score).text}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-32 hidden md:block">
                                <Progress
                                    percent={data?.data.vulnerability_score}
                                    strokeColor={getScoreColor(data?.data.vulnerability_score).color}
                                    // trailColor="#1e2124"
                                    showInfo={false}
                                    strokeWidth={6}
                                />
                            </div>
                        </div>
                    )}

                    {/* --- 3. Detailed Information Grid --- */}
                    <div className="flex flex-col gap-5">
                        {/* Personal Details */}
                        <div className=" border border-[#e0e0e0] rounded-lg p-6">
                            <Title level={5} className=" !mb-5 flex items-center gap-2.5 text-xs uppercase tracking-wider font-semibold opacity-90">
                                <UserOutlined className="text-[#a0aab4] text-xs" /> Personal Information
                            </Title>

                            <Row gutter={[24, 20]}>
                                <Col xs={12}>
                                    <div className="flex flex-col">
                                        <Text className="text-[#808a94] text-[11px] uppercase  mb-1.5">National ID</Text>
                                        <Text className="text-white text-sm font-medium">
                                            {data?.data.national_id ? `${data?.data.national_id}` : '—'}
                                        </Text>

                                    </div>

                                </Col>
                                <Col xs={12}>
                                    <div className="flex flex-col">
                                        <Text className="text-[#808a94] text-[11px] uppercase tracking-wider mb-1.5">Disability Status</Text>
                                        <Text className="text-white text-sm font-medium">
                                            {data?.data.is_disabled ? data?.data.disability_type || 'Yes' : 'None'}
                                        </Text>
                                    </div>
                                </Col>
                                <Col xs={12}>
                                    <div className="flex flex-col">
                                        <Text className="text-[#808a94] text-[11px] uppercase tracking-wider mb-1.5">Registered By</Text>
                                        <Text className="text-white text-sm font-medium">{data?.data.registered_by_name || '—'}</Text>
                                    </div>
                                </Col>
                                <Col xs={12}>
                                    <div className="flex flex-col">
                                        <Text className="text-[#808a94] text-[11px] uppercase tracking-wider mb-1.5">Registration Date</Text>
                                        <Text className="text-white text-sm font-medium">
                                            {data?.data.createdAt ? new Date(data?.data.createdAt).toLocaleDateString() : '—'}
                                        </Text>
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        {/* Household Profile */}
                        <div className=" border border-[#e0e0e0] rounded-lg p-6">
                            <Title level={5} className="!mb-5 flex items-center gap-2.5 text-xs uppercase font-semibold opacity-90">
                                <HomeOutlined className="text-[#a0aab4] text-xs" /> Household Configuration
                            </Title>

                            <div className="flex justify-between items-center bg-[#e0e0e0]/50 p-4 rounded-lg border border-[#e0e0e0]">
                                <div>
                                    <Text className="text-white font-semibold block">{data?.data.household_name || 'Individual Profile'}</Text>
                                    <span className="text-[#888f97] text-xs block mt-1.5">Assigned Office: {data?.data.office_name || '—'}</span>
                                </div>
                                {data?.data.is_household_head && (
                                    <Tag className="m-0 border-0 bg-blue-500/10 text-blue-400 px-3 py-0.5 rounded text-xs font-semibold">
                                        Head of Unit
                                    </Tag>
                                )}
                            </div>
                        </div>

                        {/* Contact & Location Details */}
                        <div className=" border border-[#e0e0e0] rounded-lg p-6">
                            <Title level={5} className=" !mb-5 flex items-center gap-2.5 text-xs uppercase tracking-wider font-semibold opacity-90">
                                <GlobalOutlined className="text-[#a0aab4] text-xs" /> Connection & Location
                            </Title>

                            <Row gutter={[24, 20]} className="mb-5">
                                <Col xs={12}>
                                    <div className="flex flex-col">
                                        <Text className="text-[#808a94] text-[11px] uppercase tracking-wider mb-1.5">Phone Number</Text>
                                        {data?.data.phone ? (
                                            <a href={`tel:${data?.data.phone}`} className="text-white hover:text-blue-400 no-underline text-sm font-semibold">
                                                {data?.data.phone}
                                            </a>
                                        ) : (
                                            <Text className="text-[#808a94] text-sm">—</Text>
                                        )}
                                    </div>
                                </Col>
                                <Col xs={12}>
                                    <div className="flex flex-col">
                                        <Text className="text-[#808a94] text-[11px] uppercase tracking-wider mb-1.5">Email Address</Text>
                                        {data?.data.email ? (
                                            <a href={`mailto:${data?.data.email}`} className="text-white hover:text-blue-400 no-underline text-sm break-all font-semibold">
                                                {data?.data.email}
                                            </a>
                                        ) : (
                                            <Text className="text-[#808a94] text-sm">—</Text>
                                        )}
                                    </div>
                                </Col>
                            </Row>

                            <div className="bg-[#e0e0e0] rounded-lg p-4 border border-[#e0e0e0]">
                                <span className="text-[#616468] text-[11px] uppercase tracking-wider block mb-1.5">Home Address</span>
                                <Text className="text-white text-sm font-semibold block mb-1.5 leading-relaxed">
                                    {data?.data.address || 'No physical address provided'}
                                </Text>
                                <div className="flex gap-2 text-xs text-[#616468] flex-wrap items-center mt-2.5">
                                    <span className="bg-[#0a0b0c] px-2.5 py-0.5 rounded border border-[#1e2124] text-white">{data?.data.community || '—'}</span>
                                    <span>•</span>
                                    <span>{data?.data.district || '—'}</span>
                                    <span>•</span>
                                    <span className="text-[#616468]">{data?.data.region || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {data?.data.notes && (
                            <div className=" border border-[#e0e0e0] rounded-lg p-6">
                                <Title level={5} className="!text-white !mb-3 text-xs uppercase tracking-wider opacity-80">Internal Notes</Title>
                                <Paragraph className="!mb-0 !text-[#616264] bg-[#1e2124] p-4 rounded-lg border border-[#1e2124] italic text-sm leading-relaxed">
                                    "{data?.data.notes}"
                                </Paragraph>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'enrolments',
            label: 'Enrolments',
            children: (
                <div className=" p-1">
                    <CustomTable tableConfig={table} columns={enrolmentColumns} />
                </div>
            ),
        },
    ];

    return (
        <div className="animate-fade-in max-w-7xl mx-auto px-4 py-3 ">
            {/* Action Header */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#1e212410]">
                <div className="flex-1">
                    <h2 className="text-white text-lg font-semibold m-0 tracking-tight">
                        {data?.data.first_name} {data?.data.last_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                        <Tag color={STATUS_COLOR[data?.data.status]} className="m-0 border-0 text-xs px-2 py-0.2">
                            {data?.data.status}
                        </Tag>
                        <span className="text-[#1c9b51] text-xs font-mono">{data?.data.custom_id}</span>
                    </div>
                </div>
                <div className="flex gap-2.5">
                    <Button
                        icon={<EditOutlined />}
                        onClick={() => editDetailsDrawer.openDrawer({
                            title: "Edit Beneficiary Details",
                            footer: (
                                <div className="flex justify-end gap-2">
                                    <Button>Cancel</Button>
                                    <Button type='primary'>Save Record</Button>
                                </div>
                            )
                        })}
                        className="border-[#1e2124] bg-[#1e2124] text-[#a0aab4] hover:text-white"
                    >
                        Edit
                    </Button>
                    {data?.data.status === 'active' && (
                        <Button
                            icon={<StopOutlined />}
                            danger
                            className="bg-red-500/10 border-0 hover:bg-red-500/20"
                            onClick={() => setExitModal(true)}
                        >
                            Exit Beneficiary
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Map View */}
                <div className="col-span-1">
                    <Card
                        className=" border border-[#1e2124] shadow-none  overflow-hidden rounded-lg"
                        styles={{ body: { padding: "0" } }}
                    >
                        <DirectionsMap beneficiary={data?.data || {}} />
                    </Card>
                </div>

                {/* Main Tabs Container */}
                <div className="col-span-1">
                    <Tabs
                        defaultActiveKey="details"
                        items={tabItems}
                        className=""
                    // tabBarStyle={{ color: '#a0aab4', marginBottom: 20, borderBottom: '1px solid #1e2124' }}
                    />
                </div>
            </div>

            {/* Exit Action Modal */}
            <Modal
                title="Exit Beneficiary Record"
                open={exitModal}
                onCancel={() => setExitModal(false)}
                onOk={() => form.submit()}
                okText="Exit Record"
                okButtonProps={{ danger: true, className: "border-0 shadow-none" }}
                cancelButtonProps={{ className: "border-[#1e2124] shadow-none" }}
            >
                <p className="text-[#a0aab4] text-sm mb-4 leading-relaxed">
                    Transitioning this record out of active monitoring. This action can be reversed manually if required later.
                </p>
                <Form form={form} layout="vertical" onFinish={handleExit}>
                    <Form.Item
                        name="exit_reason"
                        label="Reason for Departure"
                        rules={[{ required: true, message: 'Please specify departure reasoning' }]}
                    >
                        <Input.TextArea rows={3} placeholder="Please provide background details for transitioning this profile..." />
                    </Form.Item>
                </Form>
            </Modal>

            {editDetailsDrawer.drawerJSX(undefined, (
                <div className="p-4 text-white">Testing edit workflow drawer UI implementation.</div>
            ))}
        </div>
    );
}