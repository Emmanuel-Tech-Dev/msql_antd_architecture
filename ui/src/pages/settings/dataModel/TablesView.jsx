import { useState } from 'react';
import { Alert, Button, Input, Segmented, Skeleton, Table, Tag } from 'antd';
import { LockOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMetadataTables } from '../../../core/metadata/useMetadataAdmin';
import { Panel } from './dataModelShared';

function Count({ label, value }) {
    return (
        <div className="flex flex-col gap-1 rounded-[calc(var(--app-radius,6px)*2.3)] border border-[var(--color-border)] bg-[var(--color-bg-container)] px-[18px] py-4">
            <span className="text-[13px] text-[var(--color-text-secondary)]">{label}</span>
            <strong className="font-[var(--font-heading)] text-[26px] font-semibold">{value}</strong>
        </div>
    );
}

const formSummary = (form) => {
    if (!form) return '—';
    const container = { modal: 'Modal', drawer: 'Drawer', page: 'Page' }[form.layout] ?? form.layout;
    return form.stepper ? `Steps · ${form.sections} sections` : `${container} · ${form.columns} column${form.columns === 2 ? 's' : ''}`;
};

// Every table the builder may describe, described or not.
export default function TablesView({ go }) {
    const { data: tables = [], isLoading, error } = useMetadataTables();
    const [search, setSearch] = useState('');
    const [show, setShow] = useState('all');

    if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
    if (error) return <Alert type="error" showIcon title="The tables could not be loaded" description={error.message} />;

    const described = tables.filter((table) => table.described);
    const shown = tables
        .filter((table) => show === 'all' || (show === 'described') === table.described)
        .filter((table) => `${table.table} ${table.label}`.toLowerCase().includes(search.trim().toLowerCase()));

    const columns = [
        {
            title: 'Table',
            key: 'table',
            render: (_, row) => (
                <div className="flex flex-col">
                    <strong className="font-semibold">{row.described ? row.label : row.table}</strong>
                    <span className="font-[var(--font-mono)] text-[12.5px] text-[var(--color-text-secondary)]">{row.described ? row.table : `${row.columns} columns`}</span>
                </div>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, row) => (row.described
                ? <Tag color={row.enabled ? 'success' : 'default'}>{row.enabled ? 'Described' : 'Described · off'}</Tag>
                : <Tag className="!border-dashed">Not described</Tag>),
        },
        { title: 'Fields', dataIndex: 'fields', key: 'fields', render: (value, row) => (row.described ? value : '—') },
        { title: 'Form', key: 'form', render: (_, row) => <span className="text-[var(--color-text-secondary)]">{formSummary(row.form)}</span> },
        {
            title: 'Last change',
            key: 'updated',
            render: (_, row) => (row.described ? <span className="text-[var(--color-text-secondary)]">v{row.version} · {dayjs(row.updatedAt).format('D MMM YYYY')}</span> : '—'),
        },
        {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_, row) => (row.described
                ? <Button type="link" onClick={() => go({ view: 'designer', table: row.table })}>Open</Button>
                : <Button onClick={() => go({ view: 'describe', table: row.table })}>Describe</Button>),
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
                <Count label="Described tables" value={described.length} />
                <Count label="Not described yet" value={tables.length - described.length} />
                <Count label="Fields described" value={described.reduce((sum, table) => sum + table.fields, 0)} />
            </div>
            <Panel>
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
                    <Input allowClear prefix={<SearchOutlined />} placeholder="Search tables" aria-label="Search tables" value={search}
                        onChange={(event) => setSearch(event.target.value)} className="!w-full !max-w-[360px]" />
                    <Segmented value={show} onChange={setShow} options={[
                        { value: 'all', label: `All ${tables.length}` },
                        { value: 'described', label: 'Described' },
                        { value: 'undescribed', label: 'Not described' },
                    ]} />
                    <span className="grow" />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => go({ view: 'new-table' })}>New table</Button>
                </div>
                <Table rowKey="table" columns={columns} dataSource={shown} pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: 860 }} />
                <div className="flex items-center gap-2.5 border-t border-[var(--color-border)] bg-[var(--color-bg-sunken)] px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    <LockOutlined aria-hidden="true" /> Credential, token, log and framework tables are never listed and can&apos;t be described.
                </div>
            </Panel>
        </div>
    );
}
