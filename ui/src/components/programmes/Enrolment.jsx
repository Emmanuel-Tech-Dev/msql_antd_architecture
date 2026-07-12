import React, { useEffect } from 'react'
import useApi from '../../hooks/useApi'
import { CloseOutlined, DeleteOutlined, ManOutlined, UndoOutlined, WomanOutlined } from '@ant-design/icons';
import useTableApi from '../../hooks/useTableApi';
import CustomTable from '../CustomTable';
import { Avatar, Button, Popconfirm, Tag } from 'antd';
import useDelete from '../../hooks/useDelete';
import utils from '../../utils/function_utils';


const STATUS_THEME = {
    active: { color: '#10b981', tag: 'success' },
    pending: { color: '#f59e0b', tag: 'warning' },
    exited: { color: '#ef4444', tag: 'error' },
};

const GENDER_ICON = {
    male: <ManOutlined className="text-blue-400" style={{ fontSize: '11px' }} />,
    female: <WomanOutlined className="text-pink-400" style={{ fontSize: '11px' }} />,
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
};

const Enrolment = ({ customID }) => {

    const table = useTableApi(
        { pagination: { current: 1, pageSize: 10 } },
        { manual: true },
        'custom_id',
        {
        }
    )

    const del = useDelete({ resource: 'enrolements' });


    const { run, data, loading } = useApi('get', `/api/projects/enrolment/${customID}`)

    useEffect(() => { run() }, [customID, del.saveCompleted])

    function init(data) {
        if (data?.status === "ok") {
            // setInstances(data.data || []);
            table.setRecord(data?.data || []);
        }
    }


    useEffect(() => {
        table.setLoading(loading)
        init(data);
    }, [data]);

    const columns = [
        {
            title: 'Beneficiary',
            dataIndex: 'first_name',
            key: 'beneficiary',
            render: (text, record) => {
                const isExited = record.status === 'exited';
                return (
                    <div className="flex items-center gap-3">
                        <Avatar
                            size={26}
                            src={record.photo_url}
                            className="bg-indigo-50 text-indigo-600 font-semibold flex-shrink-0"
                            style={!record.photo_url ? { backgroundColor: '#eef2ff', color: '#4f46e5' } : {}}
                        >
                            {record.first_name?.charAt(0)}
                            {record.last_name?.charAt(0)}
                        </Avatar>
                        <div>
                            <span className={`flex items-center gap-1.5 text-sm font-semibold ${isExited ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {record.first_name} {record.last_name}
                                {GENDER_ICON[record.gender]}
                            </span>
                            <span className="text-xs text-slate-400 block">
                                {record.community}, {record.district}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'ID',
            dataIndex: 'custom_id',
            key: 'custom_id',
            className: 'hidden lg:table-cell', // Hide on smaller screens
            render: (id) => <span className="font-mono text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{id}</span>,
        },
        {
            title: 'Enrolled',
            dataIndex: 'enrolled_at',
            key: 'enrolled_at',
            className: 'hidden md:table-cell',
            sorter: true,
            render: (date) => <span className="text-xs text-slate-600 font-medium">{utils.formatDateV3(date)}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            filters: [
                { text: 'Active', value: 'active' },
                { text: 'Exited', value: 'exited' },
            ],
            // onFilter: (value, record) => record.status.indexOf(value) === 0,
            render: (status) => (
                <Tag
                    color={STATUS_THEME[status]?.tag}
                    className="m-0 border-none text-[10px] font-bold uppercase tracking-wide"
                >
                    {status}
                </Tag>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 120,
            render: (_, record) => {
                const isExited = record.status === 'exited';
                return (
                    <div className="flex justify-end">
                        {isExited ? (
                            <Button
                                type="text"
                                icon={<UndoOutlined />}
                                // onClick={() => handleStatusToggle(record.id, record.status)}
                                className="text-indigo-500 hover:text-indigo-700 text-xs"
                                size="small"
                            >
                                Re-enrol
                            </Button>
                        ) : (
                            <>
                                {del.confirm(
                                    record.id,
                                    'Unenrol this beneficiary?',
                                    <Button type='link' danger icon={<CloseOutlined />} >Unenrol </Button>,
                                )}
                            </>
                        )}
                    </div>
                );
            },
        },
    ];


    console.log(data, loading)
    return (
        <div>
            <CustomTable tableConfig={table} columns={columns} />
        </div>
    )
}

export default Enrolment