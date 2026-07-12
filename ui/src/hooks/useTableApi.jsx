// src/hooks/useTableApi.js

import { useCallback, useEffect, useMemo, useState } from 'react';
import useTableState from './table/useTableState';
import useTableQuery from './table/useTableQuery';
import useTableColumns from './table/useTableColumns';
import useRowSelection from './table/useRowSelection';

const useTableApi = (
    initParams = {},
    reqOptions = { manual: false },
    rowkey = 'id',
    tableConfig = {}
) => {
    const state = useTableState(initParams);
    const [loading, setLoading] = useState(false)
    // ── Offline record — set via setRecord() for external/static data ─────────
    // null means "not set" — falls through to query result
    // [] or any array takes priority over the API query
    const [localRecord, setLocalRecord] = useState(null);

    // isOffline: true when caller has fed us data via setRecord()
    const isOffline = localRecord !== null;

    const query = useTableQuery({
        tableParams: state.tableParams,
        tableConfig,
        queryOptions: {
            // disable API query entirely when offline or manual with no table
            enabled: !reqOptions?.manual && !isOffline,
        },
    });
    const refetch = query.refetch;

    // isClientSide is true when: no table config (offline) OR query says so
    const isClientSide = isOffline || query.isClientSide;

    const columns = useTableColumns({
        isClientSide,
        tableParams: state.tableParams,
        updateParams: state.updateParams,
    });

    const selection = useRowSelection();

    // ── Offline processing — filter, search, sort, paginate in the hook ───────
    // When online, Ant Design gets dataSource from the API and the server handles
    // all of this. When offline, we have the full array so we do it here.
    const processedOfflineData = useMemo(() => {
        if (!isOffline) return null;

        const { search, filters, sorter, pagination } = state.tableParams;
        let data = [...(localRecord ?? [])];

        // 1. Global search — checks every string field
        if (search) {
            const term = search.toLowerCase();
            data = data.filter((row) =>
                Object.values(row).some((val) =>
                    String(val ?? '').toLowerCase().includes(term)
                )
            );
        }

        // 2. Column filters — applied by getColumnSearchProps onFilter
        //    but we also handle the _like keys here for consistency
        if (filters && Object.keys(filters).length > 0) {
            data = data.filter((row) =>
                Object.entries(filters).every(([key, value]) => {
                    if (!value) return true;
                    const col = key.replace(/_(like|min|max|in|not_in)$/, '');
                    const rowValue = row[col];
                    const values = Array.isArray(value) ? value : String(value).split(',');
                    if (key.endsWith('_like')) {
                        return values.some((item) =>
                            String(rowValue ?? '').toLowerCase().includes(String(item).toLowerCase())
                        );
                    }
                    if (key.endsWith('_not_in')) {
                        return values.every((item) => String(rowValue) !== String(item));
                    }
                    if (key.endsWith('_in') || Array.isArray(value)) {
                        return values.some((item) => String(rowValue) === String(item));
                    }
                    if (key.endsWith('_min')) return Number(rowValue) >= Number(value);
                    if (key.endsWith('_max')) return Number(rowValue) <= Number(value);
                    return String(rowValue) === String(value);
                })
            );
        }

        // 3. Sort
        if (sorter?.field && sorter?.order) {
            const { field, order } = sorter;
            data.sort((a, b) => {
                const aVal = a[field] ?? '';
                const bVal = b[field] ?? '';
                const cmp =
                    typeof aVal === 'number' && typeof bVal === 'number'
                        ? aVal - bVal
                        : String(aVal).localeCompare(String(bVal));
                return order === 'descend' ? -cmp : cmp;
            });
        }

        const total = data.length;

        // 4. Paginate
        const { current = 1, pageSize = 10 } = pagination;
        const start = (current - 1) * pageSize;
        const paged = data.slice(start, start + pageSize);

        return { data: paged, total };
    }, [isOffline, localRecord, state.tableParams]);

    // ── handleTableChange — wires Ant Design Table events to state ────────────
    const handleTableChange = useCallback((pagination, filters, sorter) => {
        const normalizedFilters = {};
        Object.entries(filters ?? {}).forEach(([key, value]) => {
            if (!value || value.length === 0) return;
            normalizedFilters[key] = value;
        });

        state.updateParams({
            pagination: {
                ...state.tableParams.pagination,
                current: pagination.current,
                pageSize: pagination.pageSize,
            },
            filters: normalizedFilters,
            sorter,
        });
        // No return needed — processedOfflineData reacts to state.tableParams via useMemo
    }, [state]);

    const handleGlobalSearch = useCallback((term) => {
        // Reset to page 1 on new search
        state.setSearch(term);
    }, [state]);

    // ── Auto-refetch when tableParams change (online + manual mode) ───────────
    useEffect(() => {
        if (!isOffline && reqOptions?.manual && refetch) {
            refetch();
        }
    }, [state.tableParams, refetch, isOffline, reqOptions?.manual]);

    // ── runRequest — reset params and refetch (online only) ───────────────────
    const runRequest = useCallback(() => {
        if (!isOffline) refetch();
    }, [refetch, isOffline]);

    // ── Resolve final dataSource and pagination for tableProps ────────────────
    const dataSource = isOffline
        ? (processedOfflineData?.data ?? [])
        : (query.record ?? []);

    const paginationConfig = isOffline
        ? {
            ...state.tableParams.pagination,
            total: processedOfflineData?.total ?? 0,
        }
        : {
            ...state.tableParams.pagination,
            total: query.pagination?.total ?? 0,
            current: query.pagination?.page ?? state.tableParams.pagination.current,
            pageSize: query.pagination?.limit ?? state.tableParams.pagination.pageSize,
        };

    // ── tableProps — spread directly onto Ant Design <Table> ─────────────────
    const tableProps = {
        rowKey: rowkey,
        dataSource,
        loading: isOffline ? false : query.isLoading,
        // Let ConfigProvider's application density own the default. Individual
        // tables may still opt into a deliberate size through tableConfig.
        ...(tableConfig.size ? { size: tableConfig.size } : {}),
        pagination: paginationConfig,
        onChange: handleTableChange,
        rowSelection: selection.rowSelectionConfig,
    };

    return {
        // data
        record: isOffline ? localRecord : query.record,
        setRecord: setLocalRecord,   // call with array → offline mode, null → back to API
        loading: isOffline ? loading : query.isLoading,
        setLoading,
        error: query.error,
        meta: isOffline ? {} : query.meta,
        tableParams: state.tableParams,
        tableProps,
        // actions
        runRequest,
        handleGlobalSearch,
        setPage: state.setPage,
        setFilters: state.setFilters,
        setSorter: state.setSorter,
        resetParams: state.resetParams,

        // column helpers
        getColumnSearchProps: columns.getColumnSearchProps,
        getColumnFilterProps: columns.getColumnFilterProps,
        setColFilters: columns.setColFilters,

        // row selection
        selectedRows: selection.selectedRows,
        setSelectedRows: selection.setSelectedRows,
        selectedRowKeys: selection.selectedRowKeys,
        setSelectedRowKeys: selection.setSelectedRowKeys,
        currentSelectedRow: selection.currentSelectedRow,
        setCurrentSelectedRow: selection.setCurrentSelectedRow,
        rowSelectionConfig: selection.rowSelectionConfig,
        setAllowSelection: selection.setAllowSelection,
        selectionType: selection.selectionType,
        setSelectionType: selection.setSelectionType,
    };
};

export default useTableApi;
