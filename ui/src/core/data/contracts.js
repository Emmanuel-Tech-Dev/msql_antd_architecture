export class DataProviderError extends Error {
  constructor(message, options = {}) {
    super(message || "Request failed");
    this.name = "DataProviderError";
    this.statusCode = options.statusCode ?? 500;
    this.errorCode = options.errorCode ?? "ERR_UNKNOWN";
    this.details = options.details ?? null;
    this.isNetworkError = options.isNetworkError === true;
    this.cause = options.cause;
  }
}

export function toDataProviderError(error) {
  if (error instanceof DataProviderError) return error;

  const response = error?.response;
  const payload = response?.data;
  return new DataProviderError(
    payload?.details?.message ?? payload?.message ?? error?.message ?? "Request failed",
    {
      statusCode: response?.status ?? 500,
      errorCode: payload?.errorCode ?? "ERR_UNKNOWN",
      details: payload?.details ?? null,
      isNetworkError: !response,
      cause: error,
    },
  );
}

export function unwrapResponseEnvelope(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }
  return Object.hasOwn(payload, "data") ? payload.data : payload;
}

export function normalizePagination(pagination, fallback = {}) {
  const total = Number(pagination?.total ?? fallback.total ?? 0);
  const page = Number(pagination?.page ?? fallback.page ?? 1);
  const limit = Number(pagination?.limit ?? fallback.limit ?? 20);
  const totalPages = Number(
    pagination?.totalPages ?? Math.ceil(Math.max(total, 0) / Math.max(limit, 1)),
  );

  return {
    total: Number.isFinite(total) ? total : 0,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    totalPages: Number.isFinite(totalPages) ? totalPages : 0,
    hasNext: pagination?.hasNext ?? page < totalPages,
    hasPrev: pagination?.hasPrev ?? page > 1,
  };
}

export function normalizeListResponse(payload, fallback = {}) {
  const envelope = unwrapResponseEnvelope(payload);
  const rows = Array.isArray(envelope)
    ? envelope
    : Array.isArray(envelope?.result)
      ? envelope.result
      : Array.isArray(envelope?.data)
        ? envelope.data
        : [];
  const pagination = normalizePagination(envelope?.pagination, {
    total: rows.length,
    page: fallback.page,
    limit: fallback.limit ?? (rows.length || 20),
  });

  return {
    data: rows,
    total: pagination.total,
    pagination,
    meta: envelope?.meta ?? {},
    raw: payload,
  };
}

export function normalizeRecordResponse(payload) {
  return {
    data: unwrapResponseEnvelope(payload),
    raw: payload,
  };
}
