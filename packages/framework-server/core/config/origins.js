// Browser origins allowed to call the API and open the socket: the project's
// createServer({ origins }) plus ALLOWED_ORIGINS (comma-separated). Entries are
// exact URLs or regular expressions. With neither, only the local development
// addresses are allowed, and in production no cross-origin browser at all.
const DEVELOPMENT_ORIGINS = ["http://localhost:5173", "http://localhost:3001"];

const withoutSlash = (origin) => origin.replace(/\/+$/, "");

const fromEnv = () =>
  (process.env.ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);

let configured = [];

function setAllowedOrigins(origins = []) {
  const list = Array.isArray(origins) ? origins : [origins];
  for (const origin of list) {
    if (!(typeof origin === "string" || origin instanceof RegExp)) {
      throw new TypeError(`origins: expected URL strings or regular expressions, got ${typeof origin}`);
    }
  }
  configured = list.map((origin) => (typeof origin === "string" ? withoutSlash(origin.trim()) : origin));
}

function allowedOrigins() {
  const list = [...configured, ...fromEnv().map(withoutSlash)];
  if (list.length) return list;
  return process.env.NODE_ENV === "production" ? [] : DEVELOPMENT_ORIGINS;
}

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin requests, curl and server-to-server calls send none
  const requested = withoutSlash(origin);
  return allowedOrigins().some((allowed) =>
    allowed instanceof RegExp ? allowed.test(requested) : allowed === requested);
}

function validateOrigin(origin, callback) {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error("Not allowed by CORS"));
}

module.exports = {
  DEVELOPMENT_ORIGINS,
  allowedOrigins,
  isAllowedOrigin,
  setAllowedOrigins,
  validateOrigin,
};
