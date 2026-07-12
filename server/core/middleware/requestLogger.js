const crypto = require("crypto");

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

function requestLogger(logger) {
  return (req, res, next) => {
    const suppliedRequestId = String(req.get("x-request-id") ?? "").trim();
    const requestId = REQUEST_ID_PATTERN.test(suppliedRequestId)
      ? suppliedRequestId
      : crypto.randomUUID();
    const startedAt = process.hrtime.bigint();
    let completed = false;

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    const writeAccessLog = (aborted = false) => {
      if (completed) return;
      completed = true;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      logger.access("HTTP request completed", {
        requestId,
        method: req.method,
        path: req.originalUrl?.split("?")[0] ?? req.path,
        route: req.route?.path,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        contentLength: Number(res.getHeader("content-length") ?? 0) || undefined,
        ip: req.ip,
        userAgent: req.get("user-agent"),
        referrer: req.get("referer"),
        userId: req.user?.sub ?? req.user?.id ?? req.user?.custom_id,
        queryKeys: Object.keys(req.query ?? {}),
        aborted,
      });
    };

    res.once("finish", () => writeAccessLog(false));
    res.once("close", () => {
      if (!res.writableEnded) writeAccessLog(true);
    });
    next();
  };
}

module.exports = requestLogger;
