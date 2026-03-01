import { useState, useCallback, useRef, useEffect } from 'react';
import { useRequest } from 'ahooks';
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Highlighter from "react-highlight-words";
import qs from 'qs';
import apiClient from '../services/apiClient';
import Settings from '../utils/Settings';


const useTableLogic = (endpoint, options = {}) => {
    const [searchText, setSearchText] = useState("");
    const [searchedColumn, setSearchedColumn] = useState("");

    const lastParams = useRef({
        page: 1,
        limit: options.defaultPageSize || 10,
    });

    const [pageSize, setPageSize] = useState(options.defaultPageSize || 10);
    const searchInput = useRef(null);

    // Per-column filter option cache  { [dataIndex]: FilterOption[] }
    const [columnFilters, setColumnFilters] = useState({});

    // Separate state so stale data is cleared on error
    const [tableData, setTableData] = useState(null);

    // ─── Data Fetching ────────────────────────────────────────────────────────
    const { loading, error, run } = useRequest(
        ({ queryParams, bodyOptions }) => {
            const queryString = qs.stringify(queryParams, { arrayFormat: 'comma' });
            return apiClient.post(
                `${Settings.baseUrl}${endpoint}?${queryString}`,
                bodyOptions
            );
        },
        {
            manual: true, // we control all firing via runRequest + useEffect
            onSuccess: (res) => {
                console.log(res?.data?.data)
                setTableData(res?.data?.data);
            },
            onError: () => {
                // Interceptor already shows the notification.
                // Clear stale data so the table doesn't show the last successful response.
                setTableData(null);
            },
        }
    );
    // ─── Internal run helper ──────────────────────────────────────────────────
    const runRequest = useCallback((queryParams) => {
        lastParams.current = queryParams;
        run({
            queryParams,
            bodyOptions: options.bodyOptions || {},
        });
    }, [run, options.bodyOptions]);

    // ─── Initial fetch on mount ───────────────────────────────────────────────
    // useRequest with manual: false will auto-fire BUT it passes no args to the
    // fetcher on the first call, so we trigger it ourselves with the right shape.
    useEffect(() => {
        runRequest(lastParams.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Table onChange bridge ────────────────────────────────────────────────
    const handleTableChange = useCallback((pagination, filters, sorter) => {
        const params = {
            page: pagination.current,
            limit: pagination.pageSize,
        };

        // Carry forward the active search term across page / sort changes
        // if (lastParams.current.search) {
        //     params.search = lastParams.current.search;
        // }

        // Filters → ?status=active  or  ?status_in=active,inactive
        Object.entries(filters).forEach(([column, values]) => {
            if (!values || values.length === 0) return;
            if (values.length === 1) {
                params[column] = values[0];
            } else {
                params[`${column}_in`] = values.join(',');
            }
        });

        // Sorter → ?sort_by=name&sort_order=ASC
        const activeSorter = Array.isArray(sorter)
            ? sorter.find((s) => s.order)
            : sorter?.order ? sorter : null;

        if (activeSorter) {
            params.sort_by = activeSorter.field;
            params.sort_order = activeSorter.order === 'descend' ? 'DESC' : 'ASC';
        }

        setPageSize(pagination.pageSize);
        runRequest(params);
    }, [runRequest]);

    // ─── Column: Search ───────────────────────────────────────────────────────
    const getColumnSearchProps = useCallback((dataIndex) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                <Input
                    ref={searchInput}
                    placeholder={`Search ${dataIndex}`}
                    value={selectedKeys[0]}
                    onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                    onPressEnter={() => {
                        confirm();
                        setSearchText(selectedKeys[0]);
                        setSearchedColumn(dataIndex);
                        runRequest({ ...lastParams.current, search: selectedKeys[0], page: 1 });
                    }}
                    style={{ marginBottom: 8, display: 'block' }}
                />
                <Space>
                    <Button
                        type="primary"
                        onClick={() => {
                            confirm();
                            setSearchText(selectedKeys[0]);
                            setSearchedColumn(dataIndex);
                            runRequest({ ...lastParams.current, search: selectedKeys[0], page: 1 });
                        }}
                        icon={<SearchOutlined />}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Search
                    </Button>
                    <Button
                        onClick={() => {
                            clearFilters?.();
                            setSearchText('');
                            setSearchedColumn('');
                            const { search, ...rest } = lastParams.current;
                            runRequest({ ...rest, page: 1 });
                        }}
                        size="small"
                        style={{ width: 90 }}
                    >
                        Reset
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered) => (
            <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
        ),
        onFilterDropdownOpenChange: (open) => {
            if (open) setTimeout(() => searchInput.current?.select(), 100);
        },
        onFilter: () => true, // server-side; don't let AntD filter locally
        render: (text) =>
            searchedColumn === dataIndex ? (
                <Highlighter
                    highlightStyle={{ backgroundColor: '#ffc069', padding: 0 }}
                    searchWords={[searchText]}
                    autoEscape
                    textToHighlight={text ? text.toString() : ''}
                />
            ) : text,
    }), [searchText, searchedColumn, runRequest]);

    // ─── Column: Enum / Checkbox Filter ──────────────────────────────────────
    /**
     * Filter option sources (pick one):
     *   • Static:  { filters: [{ text: 'Active', value: 'active' }] }
     *   • Remote:  { filterEndpoint: '/api/statuses', filterBody: {} }
     *              POSTs once per column, caches result. Must return [{ text, value }].
     */
    const getColumnFilterProps = useCallback((dataIndex, filterOptions = {}) => {
        const { filters: staticFilters, filterEndpoint, filterBody = {}, multiple = true } = filterOptions;

        if (filterEndpoint && columnFilters[dataIndex] === undefined) {
            // Reserve immediately to block duplicate fetches on re-renders
            setColumnFilters((prev) => ({ ...prev, [dataIndex]: [] }));

            apiClient.post(`${Settings.baseUrl}${filterEndpoint}`, filterBody)
                .then((res) => {
                    // Support both { data: [...] } and a raw array response
                    const opts = Array.isArray(res) ? res : res?.data ?? [];
                    setColumnFilters((prev) => ({ ...prev, [dataIndex]: opts }));
                })
                .catch(() => {
                    console.error(`Failed to fetch filter options for column: ${dataIndex}`);
                });
        }

        // Resolve: remote cache → static → []
        const resolvedFilters = columnFilters[dataIndex] ?? staticFilters ?? [];

        return {
            filters: resolvedFilters,
            filterMultiple: multiple,
        };
    }, [columnFilters]);

    // ─── Column: Sorter ───────────────────────────────────────────────────────
    const getColumnSorterProps = useCallback((dataIndex, { serverSide = true, compareFn } = {}) => ({
        sorter: serverSide
            ? true
            : compareFn || ((a, b) => {
                const va = a[dataIndex], vb = b[dataIndex];
                if (typeof va === 'number') return va - vb;
                return String(va ?? '').localeCompare(String(vb ?? ''));
            }),
        showSorterTooltip: true,
    }), []);

    // ─── Convenience combiners ────────────────────────────────────────────────
    const getColumnSearchSorterProps = useCallback((dataIndex, sorterOptions) => ({
        ...getColumnSearchProps(dataIndex),
        ...getColumnSorterProps(dataIndex, sorterOptions),
    }), [getColumnSearchProps, getColumnSorterProps]);

    const getColumnFilterSorterProps = useCallback((dataIndex, filterOptions, sorterOptions) => ({
        ...getColumnFilterProps(dataIndex, filterOptions),
        ...getColumnSorterProps(dataIndex, sorterOptions),
    }), [getColumnFilterProps, getColumnSorterProps]);

    return {
        tableProps: {
            // Normalise response shape: supports { data: { result, pagination } }
            // or { result, pagination } or { data: [], meta: { pagination: {} } }
            dataSource: tableData?.result ?? [],
            loading,
            onChange: handleTableChange,
            pagination: {
                total: tableData?.pagination?.total ?? 0,
                current: tableData?.pagination?.page ?? 1,
                pageSize,
                showSizeChanger: true,
            },
        },
        getColumnSearchProps,
        getColumnFilterProps,
        getColumnSorterProps,
        getColumnSearchSorterProps,
        getColumnFilterSorterProps,
        run: runRequest,
        refresh: () => runRequest(lastParams.current),
        error,
    };
};

export default useTableLogic;