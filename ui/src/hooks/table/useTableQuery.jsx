// src/hooks/table/useTableQuery.js

import { useEffect, useRef } from "react";
import useList from "../../core/hooks/data/useList";
import useNotification from "../useNotification";
import qs from "qs";

const EMPTY_RECORD = [];

const normalizeFilters = (filters = {}) => {
  const result = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (!value || value.length === 0) return;
    const hasOperator = /_(like|min|max|in|not_in)$/.test(key);
    const backendKey = hasOperator
      ? key
      : Array.isArray(value)
        ? `${key}_in`
        : key;
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

  // isClientSide: true when no table AND no custom endpoint provided
  const isClientSide = !tableConfig?.table && !tableConfig?.endpoint;

  const resource = tableConfig?.table ?? "";
  const cacheKey = tableConfig?.endpoint || resource

  // custom endpoint overrides the default api/{resource}/table URL
  // passed through meta.mysql.tableConfig — useList/mysqlOrmProvider
  // picks it up and uses it directly when present
  const hasCustomEndpoint = !!tableConfig?.endpoint;

  const filters = {
    ...(tableConfig.params ?? {}),
    ...normalizeFilters(tableParams.filters),
    ...(tableParams.search ? { search: tableParams.search } : {}),
  };

  const { data, isLoading, error, errorUpdatedAt, isError, refetch } = useList({
    // when a custom endpoint is provided, resource can be empty string —
    // the provider uses meta.mysql.tableConfig.endpoint instead
    cacheKey,
    resource,
    pagination: {
      current: tableParams.pagination.current,
      pageSize: tableParams.pagination.pageSize,
    },
    filters,
    sorters: tableParams.sorter,
    meta: {
      mysql: {
        tableConfig: Object.keys(tableConfig).length ? tableConfig : undefined,
      },
    },
    queryOptions: {
      // enable when: not client-side AND (has table name OR has custom endpoint)
      enabled: !isClientSide && (!!resource || hasCustomEndpoint),
      ...queryOptions,
    },
  });

  const handledErrorAt = useRef(0);
  useEffect(() => {
    if (!isError || !errorUpdatedAt || handledErrorAt.current === errorUpdatedAt) return;
    handledErrorAt.current = errorUpdatedAt;
    message.warning(
      "Search results are temporarily unavailable. Please refresh or try a different filter.",
      6,
    );
    console.error(error?.message);
  }, [error, errorUpdatedAt, isError, message]);

  // Keep the empty value referentially stable. A fresh [] on every render can
  // retrigger consumer effects that mirror query results into local tables.
  const record = data?.data ?? EMPTY_RECORD;
  const pagination = data?.pagination ?? {};

  return {
    record,
    pagination,
    meta: data?.meta ?? {},
    isLoading,
    error,
    refetch: isClientSide ? () => { } : refetch,
    isClientSide,
  };
};

export default useTableQuery;
