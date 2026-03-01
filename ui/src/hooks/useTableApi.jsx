import { useRequest } from "ahooks";
import { useState, useCallback, useRef, useMemo } from "react";
import useNotification from "./useNotification";
import { apiRequest } from "../services/apiClient";
import Settings from "../utils/Settings";
import qs from "qs";
import Highlighter from "react-highlight-words";
import { Button, Input, Space, Table } from "antd";
import { SearchOutlined } from "@ant-design/icons";

/**
 * useTableApi
 *
 * A unified Ant Design table hook that supports:
 *  - Server-side pagination, filtering, sorting, and column search (when `endpoint` is provided)
 *  - Client-side filtering, sorting, and column search (when `endpoint` is omitted)
 *
 * Column search behaviour:
 *  - Client-side mode  → `onFilter` handles filtering locally; no HTTP request is fired.
 *  - Server-side mode  → on confirm the search term is merged into `tableParams.filters`
 *                        and a new request is fired with `?<dataIndex>=<term>` appended.
 *
 * @param {object}  initParams   - Initial tableParams (pagination / filters / sorter overrides).
 * @param {object}  reqOptions   - ahooks useRequest options passed through.
 * @param {string}  endpoint     - API path (e.g. "/users"). Omit for client-side mode.
 * @param {string}  rowkey       - Row key field name (default: "id").
 */
const useTableApi = (
    initParams = {},
    reqOptions = { manual: false },
    rowkey = "id",
    tableConfig = {}
) => {
    const { message } = useNotification();
    const isClientSide = !tableConfig?.table;

    // ─── Data ────────────────────────────────────────────────────────────────
    const [record, setRecord] = useState([]);


    // ─── Column-search UI state ───────────────────────────────────────────────
    const [searchText, setSearchText] = useState("");
    const [searchedColumn, setSearchedColumn] = useState("");
    const searchInput = useRef(null);

    // ─── Table params ─────────────────────────────────────────────────────────
    const [tableParams, setTableParams] = useState(() => ({
        pagination: {
            current: 1,
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
            ...initParams?.pagination,
        },
        filters: initParams?.filters || {},
        sorter: initParams?.sorter || {},
        ...initParams,
    }));

    //RowSelections

    const [allowSelection, setAllowSelection] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [currentSelectedRow, setCurrentSelectedRow] = useState()

    const [selectionType, setSelectionType] = useState("checkbox")

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const buildConfigParams = useCallback(() => {
        if (!tableConfig || Object.keys(tableConfig).length === 0) return {};
        return Object.fromEntries(
            Object.entries(tableConfig).map(([key, val]) => [`_${key}`, val])
        );
    }, [tableConfig]);


    const getQueryParams = useCallback((params) => {
        console.log(params)
        if (isClientSide) return
        const queryParams = {
            page: params.pagination?.current || 1,
            limit: params.pagination?.pageSize || 10,

        };

        if (params.filters) {
            Object.entries(params.filters).forEach(([key, val]) => {
                if (val !== null && val !== undefined && val !== "") {
                    queryParams[key] = Array.isArray(val) ? val.join(",") : val;
                }
            });
        }

        if (params.sorter?.field) {
            queryParams.sort_by = params.sorter.field;
            queryParams.sort_order =
                params.sorter.order === "ascend" ? "asc" : "desc";
            // if (queryParams.sortBy) {
            //     queryParams.sortBy = params.sorter.field;
            //     queryParams.sortOrder =
            //         params.sorter.order === "ascend" ? "asc" : "desc";
            // }

        }


        if (params.search?.trim()) {
            queryParams.search = params.search.trim();
        }



        return queryParams;
    }, [isClientSide]);



    // ─── Request ──────────────────────────────────────────────────────────────
    const { loading, error, params, run } = useRequest(
        ({ tableParams: tp } = {}) => {
            if (isClientSide) return Promise.resolve(null);
            const queryParams = getQueryParams(tp);
            const queryString = qs.stringify(queryParams, { encodeValuesOnly: true });
            const headers = Object.keys(tableConfig).length
                ? { "x-table-config": JSON.stringify(tableConfig) }
                : {};
            return apiRequest("get", `${Settings.baseUrl}/${tableConfig?.table}/table?${queryString}`, null, { headers });
        },
        {
            ...reqOptions,
            defaultParams: [{ tableParams }],
            onError: (err) => {
                message.error(err?.message || "Something went wrong", 6);
                setRecord([]);
            },
            onSuccess: (data) => {
                if (isClientSide) return;
                const res = data?.data;
                setRecord(res);
                if (res?.pagination) {
                    setTableParams((prev) => ({
                        ...prev,
                        pagination: {
                            ...prev.pagination,
                            total: res.pagination.total || 0,
                            current: res.pagination.page || prev.pagination.current,
                            pageSize: res.pagination.limit || prev.pagination.pageSize,
                        },
                    }));
                } else {
                    message.warn(
                        "Pagination data missing in response: Try a paginated endpoint"
                    );
                }
            },
        }
    );

    // ─── Table change (pagination / filter / sort) ────────────────────────────
    const handleTableChange = useCallback(
        (pagination, filters, sorter) => {
            const newTableParams = {
                ...tableParams,
                pagination: {
                    ...tableParams.pagination,
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                },
                filters: {
                    ...tableParams.filters,
                    ...Object.fromEntries(
                        Object.entries(filters).filter(([, v]) => v !== null)
                    ),
                },
                sorter,
            };

            setTableParams(newTableParams);

            if (!isClientSide) {
                run({ tableParams: newTableParams });
                return;
            }

            // Client-side sort — sorter:true gives no comparator so we do it manually
            if (sorter?.field) {
                const { field, order } = sorter;
                const sorted = [...(record?.result || record || [])].sort((a, b) => {
                    const aVal = a[field] ?? "";
                    const bVal = b[field] ?? "";
                    const cmp = typeof aVal === "number" && typeof bVal === "number"
                        ? aVal - bVal
                        : String(aVal).localeCompare(String(bVal));
                    return order === "descend" ? -cmp : cmp;
                });
                setRecord(sorted);
            }
        },
        [run, tableParams, isClientSide, record]  // ← record added to deps
    );



    const handleGlobalSearch = useCallback(
        (term) => {
            const newTableParams = {
                ...tableParams,
                pagination: { ...tableParams.pagination, current: 1 },
                search: term?.trim() || "",
            };
            setTableParams(newTableParams);
            if (!isClientSide) run({ tableParams: newTableParams });
        },
        [isClientSide, tableParams, run]
    );

    // ─── Column search handlers ───────────────────────────────────────────────

    /**
     * Called when the user clicks "Search" inside the filter dropdown.
     *
     * Client-side: antd's built-in `onFilter` takes over — nothing extra needed.
     * Server-side: merge the term into filters and fire a new request.
     */
    const handleSearch = useCallback(
        (selectedKeys, confirm, dataIndex) => {
            confirm();
            const term = selectedKeys[0] ?? "";
            setSearchText(term);
            setSearchedColumn(dataIndex);

            const newTableParams = {
                ...tableParams,
                pagination: { ...tableParams.pagination, current: 1 },
                filters: {
                    ...tableParams.filters,
                    [`${dataIndex}_like`]: term || undefined,
                },
            };
            setTableParams(newTableParams);
            if (!isClientSide) run({ tableParams: newTableParams });
        },
        [isClientSide, tableParams, run]
    );

    const handleReset = useCallback(
        (clearFilters, dataIndex) => {
            clearFilters();
            setSearchText("");
            setSearchedColumn("");

            const newFilters = { ...tableParams.filters };
            delete newFilters[`${dataIndex}_like`];

            const newTableParams = {
                ...tableParams,
                pagination: { ...tableParams.pagination, current: 1 },
                filters: newFilters,
            };
            setTableParams(newTableParams);
            if (!isClientSide) run({ tableParams: newTableParams });
        },
        [isClientSide, tableParams, run]
    );

    const getColumnSearchProps = useCallback(
        (dataIndex) => ({
            filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
                <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
                    <Input
                        ref={searchInput}
                        placeholder={`Search ${dataIndex}`}
                        value={selectedKeys[0]}
                        onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                        onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
                        style={{ marginBottom: 8, display: "block" }}
                    />
                    <Space>
                        <Button
                            type="primary"
                            onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
                            icon={<SearchOutlined />}
                            size="small"
                            style={{ width: 90 }}
                        >
                            Search
                        </Button>
                        <Button
                            onClick={() => clearFilters && handleReset(clearFilters, dataIndex)}
                            size="small"
                            style={{ width: 90 }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="link"
                            size="small"
                            onClick={() => {
                                confirm({ closeDropdown: false });
                                setSearchText(selectedKeys[0]);
                                setSearchedColumn(dataIndex);
                            }}
                        >
                            Filter
                        </Button>
                        <Button type="link" size="small" onClick={close}>Close</Button>
                    </Space>
                </div>
            ),
            filterIcon: (filtered) => (
                <SearchOutlined style={{ color: filtered ? "#1677ff" : undefined }} />
            ),
            onFilter: (value, row) => {
                if (!isClientSide) return true;
                return row[dataIndex]
                    ?.toString()
                    .toLowerCase()
                    .includes(value.toLowerCase());
            },
            filterDropdownProps: {
                onOpenChange(open) {
                    if (open) setTimeout(() => searchInput.current?.select(), 100);
                },
            },
            render: (text) =>
                searchedColumn === dataIndex ? (
                    <Highlighter
                        highlightStyle={{ backgroundColor: "#ffc069", padding: 0 }}
                        searchWords={[searchText]}
                        autoEscape
                        textToHighlight={text ? text.toString() : ""}
                    />
                ) : (
                    text
                ),
        }),
        [searchText, searchedColumn, handleSearch, handleReset, isClientSide]
    );


    // ─── Manual re-fetch ──────────────────────────────────────────────────────
    const runRequest = useCallback(() => {
        const newFilters = { ...tableParams.filters };


        const newTableParams = {
            ...tableParams,
            pagination: { ...tableParams.pagination, current: 1 },
            filters: newFilters,
        };
        setTableParams(newTableParams);

        run({ tableParams: { ...newTableParams } });
    }, [run, tableParams]);


    //rowSelections 

    const rowSelectionConfig = useMemo(() => {
        if (!allowSelection) return null; // Changed from undefined to null

        return {
            type: selectionType,
            selectedRowKeys,
            selections: [
                Table.SELECTION_ALL,
                Table.SELECTION_INVERT,
                Table.SELECTION_NONE,
            ],
            onChange: (selRowKeys, selRows) => {
                setSelectedRowKeys(selRowKeys);
                setSelectedRows(selRows);
            },
            onSelect: (record, selected, selectedRows, nativeEvent) => {
                setCurrentSelectedRow({ record, selected, selectedRows, nativeEvent });
            },
            onSelectAll: (selected, selectedRows) => {
                // console.log('Select all triggered:', { selected, selectedRows });
            },
        };
    }, [allowSelection, selectionType, selectedRowKeys]);


    // ─── Public API ───────────────────────────────────────────────────────────
    return {
        record,
        setRecord,
        params,
        loading,
        error,
        tableParams,
        tableProps: {
            rowSelection: rowSelectionConfig,
            rowKey: rowkey,
            dataSource: record?.result || record || [],
            loading,
            size: "small",
            pagination: tableParams.pagination,
            onChange: handleTableChange,
        },
        getColumnSearchProps,
        runRequest,
        handleGlobalSearch,
        selectedRows,
        setSelectedRows,
        rowSelectionConfig,
        setAllowSelection,
        selectionType,
        setSelectionType,
        currentSelectedRow,
        setCurrentSelectedRow,
        selectedRowKeys,
        setSelectedRowKeys,
    };
};

export default useTableApi;