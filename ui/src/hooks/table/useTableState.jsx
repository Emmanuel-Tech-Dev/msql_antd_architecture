// src/hooks/table/useTableState.js

import { useState, useRef, useCallback, useEffect } from "react";

const DEFAULT_PAGINATION = {
  current: 1,
  pageSize: 10,
  showSizeChanger: false,
  showQuickJumper: false,
  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
};

const useTableState = (initParams = {}) => {
  // stabilize initParams so callbacks don't re-create on every render
  const initParamsRef = useRef(initParams);

  const [tableParams, setTableParams] = useState(() => ({
    pagination: { ...DEFAULT_PAGINATION, ...initParams?.pagination },
    filters: initParams.filters ?? {},
    sorter: initParams?.sorter ?? {},
    search: "",
  }));

  const tableParamsRef = useRef(tableParams);

  useEffect(() => {
    tableParamsRef.current = tableParams;
  }, [tableParams]);

  const updateParams = useCallback((updates) => {
    setTableParams((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetParams = useCallback(() => {
    setTableParams({
      pagination: {
        ...DEFAULT_PAGINATION,
        ...initParamsRef.current?.pagination,
      },
      filters: {},
      sorter: {},
      search: "",
    });
  }, []);

  const setPage = useCallback((page, pageSize) => {
    setTableParams((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        current: page,
        pageSize: pageSize ?? prev.pagination.pageSize,
      },
    }));
  }, []);

  const setSearch = useCallback((term) => {
    setTableParams((prev) => ({
      ...prev,
      search: term?.trim() ?? "",
      pagination: { ...prev.pagination, current: 1 },
    }));
  }, []);

  const setFilters = useCallback((filters) => {
    setTableParams((prev) => ({
      ...prev,
      filters,
      pagination: { ...prev.pagination, current: 1 },
    }));
  }, []);

  const setSorter = useCallback((sorter) => {
    setTableParams((prev) => ({ ...prev, sorter }));
  }, []);

  return {
    tableParams,
    tableParamsRef,
    updateParams,
    resetParams,
    setPage,
    setSearch,
    setFilters,
    setSorter,
  };
};

export default useTableState;
