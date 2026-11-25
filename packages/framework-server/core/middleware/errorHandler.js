const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");

const errorHandler = (logger) => {
  return (err, req, res, next) => {
    // Set defaults for non-AppError instances

    const jwtStatus =
      err?.message === "jwt expired" ? 401 : err.statusCode || 500;

    err.statusCode = err.statusCode || jwtStatus || 500;
    err.status = err.status || "error";
    err.errorCode = err.errorCode || "ERR_INTERNAL_SERVER";

    // Build context for logging
    const logContext = {
      requestId: req.requestId,
      path: req.originalUrl?.split("?")[0] ?? req.path,
      route: req.route?.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.sub ?? req.user?.id ?? req.user?.custom_id,
      bodyKeys:
        req.body && typeof req.body === "object" ? Object.keys(req.body) : [],
      params: utils.redactSensitiveData(req.params),
      queryKeys: Object.keys(req.query ?? {}),
      errorMetadata: utils.redactSensitiveData(err.metadata || {}),
      internalCause:
        err.cause instanceof Error ? err.cause.message : undefined,
    };

    // Use smartError for operational errors, regular error for unexpected ones
    if (err.isOperational) {
      logger.smartError(err, logContext, err?.metadata?.level);
    } else {
      // Log unexpected errors with full stack trace
      logger.error(err, {
        ...logContext,
        errorType: "UNEXPECTED_ERROR",
        isOperational: false,
      });
    }

    // Don't leak error details in production for non-operational errors
    if (process.env.NODE_ENV === "production" && !err.isOperational) {
      return res.status(500).json({
        status: "error",
        errorCode: "ERR_INTERNAL_SERVER",
        message: "Something went wrong. Please try again later.",
        requestId: req.requestId,
      });
    }

    // Send error response
    const response = {
      status: err.status,
      errorCode: err.errorCode,
      message: err.message,
      requestId: req.requestId,
    };

    // Add metadata/details if present
    if (err.metadata && Object.keys(err.metadata).length > 0) {
      response.details = err.metadata;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === "development") {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
  };
};

module.exports = errorHandler;
