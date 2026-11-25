const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3001",
  "http://localhost:5173",
  "https://my-production-app.com",
  "https://staging-app.com",
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const resolvedAllowedOrigins = allowedOrigins.length
  ? allowedOrigins
  : DEFAULT_ALLOWED_ORIGINS;

function isAllowedOrigin(origin) {
  return !origin || resolvedAllowedOrigins.includes(origin);
}

function validateOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error("Not allowed by CORS"));
}

module.exports = {
  allowedOrigins: resolvedAllowedOrigins,
  isAllowedOrigin,
  validateOrigin,
};
