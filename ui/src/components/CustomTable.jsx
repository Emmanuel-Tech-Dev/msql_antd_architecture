import { CalendarOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Table, Tooltip } from 'antd';
import utils from '../utils/function_utils';

const CustomTable = ({ tableConfig, columns, showToolbar = true, label = 'Data records' }) => {
    const tableProps = tableConfig?.tableProps ?? {};
    return (
        <Card
            className="overflow-hidden rounded-[calc(var(--app-radius,8px)+2px)] border-[var(--color-border)] shadow-[var(--shadow-sm)]"
            aria-busy={Boolean(tableConfig?.loading)}
            aria-label={label}
            role="region"
            styles={{ body: { padding: 0 } }}
        >
            {showToolbar && (
                <div>
                    <Space className="flex min-h-[68px] w-full items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-container)] px-[18px] py-3.5 max-sm:flex-col max-sm:items-stretch" size="medium">
                        <Input
                            className="!w-full !max-w-[360px] !p-2 max-sm:!max-w-none"
                            prefix={<SearchOutlined aria-hidden="true" />}
                            allowClear
                            aria-label="Search table records"
                            placeholder="Search records…"
                            onPressEnter={(event) => tableConfig.handleGlobalSearch(event.currentTarget.value)}
                            onChange={(event) => {
                                if (!event.target.value) tableConfig.handleGlobalSearch('');
                            }}
                        />
                        <div className="flex items-center gap-2.5 max-sm:justify-between">
                            <Tooltip title="Refresh data">
                                <Button

                                    aria-label="Refresh table data"
                                    icon={<ReloadOutlined spin={tableConfig?.loading} />}
                                    onClick={() => tableConfig.runRequest()}
                                />
                            </Tooltip>
                            <Button className="inline-flex min-h-[var(--app-control-height)] items-center gap-2 rounded-[var(--app-radius)] border-[var(--color-border)] px-3 tabular-nums !text-[var(--color-text-secondary)]">
                                <CalendarOutlined aria-hidden="true" />
                                {utils.getCurrentDate()}
                            </Button>
                        </div>
                    </Space>
                </div>

            )}
            <div className="min-w-0 bg-[var(--color-bg-container)] px-3.5 pb-1 max-sm:p-0 [&_.ant-table-wrapper]:!rounded-none [&_.ant-table-wrapper]:!border-0 [&_.ant-table-thead>tr>th]:whitespace-nowrap [&_.ant-table-tbody>tr>td]:align-middle [&_.ant-pagination]:px-1.5">
                <Table
                    {...tableProps}
                    columns={columns}
                />
            </div>
        </Card>
    );
};

export default CustomTable;
