const rateLimiter = require("express-rate-limit");

// Two limits per 15 minutes. Per address, before sign-in is checked: a flood
// guard that also covers sign-in and recovery (which have their own lockout),
// generous because staff behind one office router share an address. Per
// signed-in user, after the token is verified (so a forged token cannot pick
// its own key): the everyday limit.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const tooManyRequests = {
  status: "error",
  errorCode: "ERR_TOO_MANY_REQUESTS",
  message: "Too many requests, please try again in a few minutes.",
};

function createRateLimits({ perIp = 3000, perUser = 500, windowMs = RATE_WINDOW_MS } = {}) {
  const common = { windowMs, standardHeaders: true, legacyHeaders: false, message: tooManyRequests };
  return {
    perIpLimit: rateLimiter({ ...common, max: perIp }),
    perUserLimit: rateLimiter({
      ...common,
      max: perUser,
      keyGenerator: (req) => `user:${req.user.sub}`,
      skip: (req) => !req.user?.sub,
    }),
  };
}

module.exports = { createRateLimits };
