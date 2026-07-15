import { CalendarOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Table, Tooltip } from 'antd';
import utils from '../utils/function_utils';
import './CustomTable.css';

const CustomTable = ({ tableConfig, columns, showToolbar = true, label = 'Data records' }) => {
    const tableProps = tableConfig?.tableProps ?? {};
    return (
        <Card
            className="data-table-shell"
            aria-busy={Boolean(tableConfig?.loading)}
            aria-label={label}
            role="region"
            styles={{ body: { padding: 0 } }}
        >
            {showToolbar && (
                <div className="data-table-toolbar">
                    <Input
                        className="data-table-toolbar__search"
                        prefix={<SearchOutlined aria-hidden="true" />}
                        allowClear
                        aria-label="Search table records"
                        placeholder="Search records…"
                        onPressEnter={(event) => tableConfig.handleGlobalSearch(event.currentTarget.value)}
                        onChange={(event) => {
                            if (!event.target.value) tableConfig.handleGlobalSearch('');
                        }}
                    />
                    <div className="data-table-toolbar__tools">
                        <Tooltip title="Refresh data">
                            <Button
                                aria-label="Refresh table data"
                                icon={<ReloadOutlined spin={tableConfig?.loading} />}
                                onClick={() => tableConfig.runRequest()}
                            />
                        </Tooltip>
                        <span className="data-table-toolbar__date">
                            <CalendarOutlined aria-hidden="true" />
                            {utils.getCurrentDate()}
                        </span>
                    </div>
                </div>
            )}
            <div className="data-table-shell__viewport">
                <Table
                    {...tableProps}
                    columns={columns}
                    scroll={{ x: 'max-content', ...tableProps.scroll }}
                />
            </div>
        </Card>
    );
};

export default CustomTable;
