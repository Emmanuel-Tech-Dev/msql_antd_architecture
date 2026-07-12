// src/core/dataProviders/mysqlOrmProvider.js

import qs from "qs";
import apiClient from "../../services/apiClient";
import {
  normalizeListResponse,
  normalizeRecordResponse,
  toDataProviderError,
  unwrapResponseEnvelope,
} from "../data/contracts";

const buildQueryParams = ({ pagination, filters, sorters } = {}) => {
  const params = {};

  if (pagination) {
    params.page = pagination.current ?? 1;
    params.limit = pagination.pageSize ?? 20;
  }

  if (filters) {
    Object.entries(filters).forEach(([key, val]) => {
      if (val === null || val === undefined || val === "") return;
      params[key] = Array.isArray(val) ? val.join(",") : val;
    });
  }

  const sorter = Array.isArray(sorters) ? sorters[0] : sorters;
  if (sorter?.field && sorter?.order) {
    params.sort_by = sorter.field;
    params.sort_order = sorter.order === "descend" ? "desc" : "asc";
  }

  return qs.stringify(params, { encodeValuesOnly: true });
};

// strips trailing slash from base, leading slash from path
// so any combination always produces one clean slash between them
const joinUrl = (base, path) => {
  const cleanBase = base.replace(/\/$/, "");
  const cleanPath = path.replace(/^\//, "");
  return `${cleanBase}/${cleanPath}`;
};

const mysqlOrmProvider = (baseUrl) => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    try {
      const queryString = buildQueryParams({ pagination, filters, sorters });
      const tableConfig = meta?.mysql?.tableConfig;

      const customEndpoint = tableConfig?.endpoint;
      const resolvedPath = customEndpoint ?? `api/${resource}/table`;
      const headers = tableConfig
        ? {
            "x-table-config": JSON.stringify({
              ...tableConfig,
              table: tableConfig.table || resource || "",
            }),
          }
        : {};

      const url = joinUrl(baseUrl, resolvedPath);
      const { data } = await apiClient.get(
        queryString ? `${url}?${queryString}` : url,
        { headers },
      );

      return normalizeListResponse(data, {
        page: pagination?.current ?? 1,
        limit: pagination?.pageSize ?? 20,
      });
    } catch (e) {
      throw toDataProviderError(e);
    }
  },

  getOne: async ({ resource, id }) => {
    try {
      const { data } = await apiClient.get(
        joinUrl(baseUrl, `api/${resource}/${id}`),
      );
      return normalizeRecordResponse(data);
    } catch (e) {
      throw toDataProviderError(e);
    }
  },

  getMany: async ({ resource, ids }) => {
    try {
      const queryString = qs.stringify(
        { id_in: ids.join(",") },
        { encodeValuesOnly: true },
      );
      const { data } = await apiClient.get(
        `${joinUrl(baseUrl, `api/${resource}/table`)}?${queryString}`,
      );
      return normalizeListResponse(data);
    } catch (e) {
      throw toDataProviderError(e);
    }
  },

  create: async ({ resource, variables, meta }) => {
    try {
      if (meta?.mysql?.hasFile) {
        const { data } = await apiClient.post(
          joinUrl(baseUrl, `api/${resource}/file`),
          variables,
          { headers: { "Content-Type": "multipart/form-data" } },
        );
        return normalizeRecordResponse(data);
      }

      const { data } = await apiClient.post(
        joinUrl(baseUrl, `api/${resource}`),
        variables,
      );
      return normalizeRecordResponse(data);
    } catch (e) {
      throw toDataProviderError(e);
    }
  },

  update: async ({ resource, id, variables }) => {
    try {
      const { data } = await apiClient.put(
        joinUrl(baseUrl, `api/${resource}/${id}`),
        variables,
      );
      return normalizeRecordResponse(data);
    } catch (e) {
      throw toDataProviderError(e);
    }
  },

  deleteOne: async ({ resource, id }) => {
    try {
      const { data } = await apiClient.delete(
        joinUrl(baseUrl, `api/${resource}/${id}`),
      );
      return normalizeRecordResponse(data);
    } catch (e) {
      throw toDataProviderError(e);
    }
  },

  custom: async ({ url, method = "get", payload, headers, unwrap = false }) => {
    try {
      // if url is already absolute use it directly
      // otherwise join cleanly with baseUrl
      const resolvedUrl = url.startsWith("http") ? url : joinUrl(baseUrl, url);

      const { data } = await apiClient({
        url: resolvedUrl,
        method,
        ...(method.toLowerCase() === "get"
          ? { params: payload }
          : { data: payload }),
        headers: headers ?? {},
      });

      return {
        data: unwrap ? unwrapResponseEnvelope(data) : data,
        raw: data,
      };
    } catch (e) {
      throw toDataProviderError(e);
    }
  },
});

export default mysqlOrmProvider;
