// src/hooks/table/useTableQuery.js

import { useCallback } from "react";
import useList from "../../core/hooks/data/useList";
import useNotification from "../useNotification";
import qs from "qs";

const normalizeFilters = (filters = {}) => {
  const result = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (!value || value.length === 0) return;
    // Add _like suffix (lowercase) for backend queries - avoid duplicates
    const backendKey = key.endsWith('_like') ? key : `${key}_like`;
    result[backendKey] = Array.isArray(value) ? value.join(",") : value;
  });

  return result;
};

const useTableQuery = ({
  tableParams,
  tableConfig = {},
  queryOptions = {},
}) => {
  const { message } = useNotification();
  const isClientSide = !tableConfig?.table;
  const resource = tableConfig?.table ?? "";

  const filters = {
    ...normalizeFilters(tableParams.filters),
    ...(tableParams.search ? { search: tableParams.search } : {}),
  };

  const { data, isLoading, error, refetch } = useList({
    resource,
    pagination: {
      current: tableParams.pagination.current,
      pageSize: tableParams.pagination.pageSize,
    },
    filters: filters,
    sorters: tableParams.sorter,
    meta: {
      mysql: {
        tableConfig: Object.keys(tableConfig).length ? tableConfig : undefined,
      },
    },
    queryOptions: {
      enabled: !isClientSide,
      onError: (err) => {
        message.warning(
          "Search results are temporarily unavailable. Please refresh or try a different filter.",
          6,
        );
        console.error(err.message);
      },
      ...queryOptions,
    },
  });



  const record = data?.data ?? [];

  const pagination = data?.pagination ?? {};

  return {
    record,
    pagination,
    isLoading,
    error,
    refetch,
    isClientSide,
  };
};

export default useTableQuery;
