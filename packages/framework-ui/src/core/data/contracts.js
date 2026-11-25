export class DataProviderError extends Error {
  constructor(message, options = {}) {
    super(message || "Request failed");
    this.name = "DataProviderError";
    this.statusCode = options.statusCode ?? 500;
    this.errorCode = options.errorCode ?? "ERR_UNKNOWN";
    this.details = options.details ?? null;
    this.technicalMessage = options.technicalMessage ?? null;
    this.isNetworkError = options.isNetworkError === true;
    this.cause = options.cause;
  }
}

const USER_MESSAGES_BY_ERROR_CODE = {
  ERR_ACCESS_DENIED: "You don't have permission to complete this action.",
  ERR_FORBIDDEN: "You don't have permission to complete this action.",
  ERR_INSUFFICIENT_PERMISSIONS: "You don't have permission to complete this action.",
  ERR_NO_RESOURCES: "Your account does not currently have access to this feature.",
  ERR_INVALID_CREDENTIALS: "The details you entered are incorrect.",
  ERR_AUTHENTICATION_REQUIRED: "Your session has expired. Please sign in again.",
  ERR_AUTH_USER_INVALID: "Your session has expired. Please sign in again.",
  ERR_TOKEN_EXPIRED: "This link or session has expired. Please try again.",
  ERR_TOKEN_REVOKED: "This session is no longer valid. Please sign in again.",
  ERR_TOKEN_INVALID: "This link or session is no longer valid. Please try again.",
  ERR_VALIDATION_FAILED: "Please check the information you entered and try again.",
  ERR_INVALID_INPUT: "Please check the information you entered and try again.",
  ERR_MISSING_REQUIRED_FIELD: "Please complete the required information and try again.",
  ERR_NOT_FOUND: "The requested information could not be found.",
  ERR_RECORD_NOT_FOUND: "The requested record could not be found.",
  ERR_ENDPOINT_NOT_FOUND: "This action is currently unavailable.",
  ERR_DUPLICATE_ENTRY: "A record with these details already exists.",
  ERR_EMAIL_ALREADY_EXISTS: "An account with this email address already exists.",
  ERR_CONFLICT: "This action conflicts with an existing record.",
  ERR_RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment and try again.",
  ERR_TOO_MANY_REQUESTS: "Too many requests. Please wait a moment and try again.",
};

export function getUserFacingErrorMessage({ errorCode, statusCode, isNetworkError } = {}) {
  if (isNetworkError) {
    return "We couldn't connect to the server. Check your connection and try again.";
  }
  if (USER_MESSAGES_BY_ERROR_CODE[errorCode]) {
    return USER_MESSAGES_BY_ERROR_CODE[errorCode];
  }
  if (statusCode === 401) return "We couldn't verify your request. Please sign in and try again.";
  if (statusCode === 403) return "You don't have permission to complete this action.";
  if (statusCode === 404) return "The requested information could not be found.";
  if (statusCode === 409) return "This action conflicts with an existing record.";
  if (statusCode === 429) return "Too many requests. Please wait a moment and try again.";
  if (statusCode >= 500) return "Something went wrong. Please try again later.";
  return "We couldn't complete that action. Please try again.";
}

export function toDataProviderError(error) {
  if (error instanceof DataProviderError) return error;

  const response = error?.response;
  const payload = response?.data;
  const statusCode = response?.status ?? 500;
  const errorCode = payload?.errorCode ?? "ERR_UNKNOWN";
  const isNetworkError = Boolean(error?.request && !response);
  const technicalMessage = payload?.details?.message
    ?? payload?.message
    ?? error?.message
    ?? "Request failed";

  return new DataProviderError(
    getUserFacingErrorMessage({ errorCode, statusCode, isNetworkError }),
    {
      statusCode,
      errorCode,
      details: payload?.details ?? null,
      technicalMessage,
      isNetworkError,
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
