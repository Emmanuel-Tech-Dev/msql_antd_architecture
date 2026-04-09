// src/hooks/useTableApi.js

import { useCallback } from 'react';
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

    const query = useTableQuery({
        tableParams: state.tableParams,
        tableConfig,
        queryOptions: {
            enabled: !reqOptions?.manual,
        },
    });

    const columns = useTableColumns({
        isClientSide: query.isClientSide,
        tableParams: state.tableParams,
        updateParams: state.updateParams,
    });

    const selection = useRowSelection();

    // ─── Table onChange — wires AntD Table events to state ───────────────────
    const handleTableChange = useCallback((pagination, filters, sorter) => {
        const normalizedFilters = {};
        Object.entries(filters ?? {}).forEach(([key, value]) => {
            if (!value || value.length === 0) return;
            normalizedFilters[`${key}_like`] = Array.isArray(value)
                ? value.join(',')
                : value;
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

        // client-side sort
        if (query.isClientSide && sorter?.field) {
            const { field, order } = sorter;
            const sorted = [...(query.record ?? [])].sort((a, b) => {
                const aVal = a[field] ?? '';
                const bVal = b[field] ?? '';
                const cmp = typeof aVal === 'number' && typeof bVal === 'number'
                    ? aVal - bVal
                    : String(aVal).localeCompare(String(bVal));
                return order === 'descend' ? -cmp : cmp;
            });
            // for client-side, data is passed in externally so we return sorted
            return sorted;
        }
    }, [state, query]);

    const handleGlobalSearch = useCallback((term) => {
        state.setSearch(term);
    }, [state]);

    // ─── runRequest — reset and refetch ──────────────────────────────────────
    const runRequest = useCallback(() => {
        state.resetParams();
        query.refetch();
    }, [state, query]);

    // ─── tableProps — spread directly onto AntD Table ────────────────────────
    const tableProps = {
        rowKey: rowkey,
        dataSource: query.record?.result ?? query.record ?? [],
        loading: query.isLoading,
        size: 'small',
        pagination: {
            ...state.tableParams.pagination,
            total: query.pagination?.total ?? 0,
            current: query.pagination?.page ?? state.tableParams.pagination.current,
            pageSize: query.pagination?.limit ?? state.tableParams.pagination.pageSize,
        },
        onChange: handleTableChange,
        rowSelection: selection.rowSelectionConfig,
    };

    return {
        // data
        record: query.record,
        setRecord: () => { },
        loading: query.isLoading,
        error: query.error,
        tableParams: state.tableParams,
        tableProps,

        // actions
        runRequest,
        handleGlobalSearch,

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