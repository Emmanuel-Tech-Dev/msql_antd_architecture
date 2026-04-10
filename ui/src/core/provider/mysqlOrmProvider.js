// src/core/dataProviders/mysqlOrmProvider.js

import qs from "qs";
import apiClient from "../../services/apiClient";

const normalizeError = (error) => {
  const res = error?.response?.data;
  throw {
    message: res?.message ?? error.message ?? "Request failed",
    statusCode: error?.response?.status ?? 500,
    errorCode: res?.errorCode ?? "ERR_UNKNOWN",
    errors: res?.details?.errors ?? [],
  };
};

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

  if (sorters?.field) {
    params.sort_by = sorters.field;
    params.sort_order = sorters.order === "descend" ? "desc" : "asc";
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
      const headers = tableConfig
        ? {
            "x-table-config": JSON.stringify({
              ...tableConfig,
              table: resource,
            }),
          }
        : {};

      const { data } = await apiClient.get(
        `${joinUrl(baseUrl, `api/${resource}/table`)}?${queryString}`,
        { headers },
      );

      return {
        data: data.data?.result ?? [],
        total: data.data?.pagination?.total ?? 0,
        pagination: data.data?.pagination,
      };
    } catch (e) {
      normalizeError(e);
    }
  },

  getOne: async ({ resource, id }) => {
    try {
      const { data } = await apiClient.get(
        joinUrl(baseUrl, `api/${resource}/${id}`),
      );
      return { data: data.data };
    } catch (e) {
      normalizeError(e);
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
      return { data: data.data?.result ?? [] };
    } catch (e) {
      normalizeError(e);
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
        return { data };
      }

      const { data } = await apiClient.post(
        joinUrl(baseUrl, `api/${resource}`),
        variables,
      );
      return { data };
    } catch (e) {
      normalizeError(e);
    }
  },

  update: async ({ resource, id, variables }) => {
    try {
      const { data } = await apiClient.put(
        joinUrl(baseUrl, `api/${resource}/${id}`),
        variables,
      );
      return { data };
    } catch (e) {
      normalizeError(e);
    }
  },

  deleteOne: async ({ resource, id }) => {
    try {
      const { data } = await apiClient.delete(
        joinUrl(baseUrl, `api/${resource}/${id}`),
      );
      return { data };
    } catch (e) {
      normalizeError(e);
    }
  },

  custom: async ({ url, method = "get", payload, headers }) => {
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

      return { data };
    } catch (e) {
      normalizeError(e);
    }
  },
});

export default mysqlOrmProvider;
