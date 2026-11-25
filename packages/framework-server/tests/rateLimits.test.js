const express = require("express");
const { createRateLimits } = require("../core/middleware/rateLimits");

// The same order as index.js: per address, then the token check, then per user.
function startApp({ perIp, perUser }) {
  const app = express();
  const { perIpLimit, perUserLimit } = createRateLimits({ perIp, perUser });
  app.use(perIpLimit);
  app.post("/auth/login", (req, res) => res.json({ ok: true }));
  app.use((req, res, next) => {
    const user = req.headers["x-test-user"];
    if (user) req.user = { sub: user };
    next();
  });
  app.use(perUserLimit);
  app.get("/api/things", (req, res) => res.json({ ok: true }));
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function hit(server, path, { user, method = "GET", times = 1 } = {}) {
  const { port } = server.address();
  const statuses = [];
  for (let index = 0; index < times; index += 1) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: user ? { "x-test-user": user } : {} });
    statuses.push(response.status);
  }
  return statuses;
}

let server;
afterEach(() => new Promise((resolve) => server.close(resolve)));

describe("rate limits", () => {
  test("users behind one address each get their own limit", async () => {
    server = await startApp({ perIp: 100, perUser: 3 });
    expect(await hit(server, "/api/things", { user: "ama", times: 4 })).toEqual([200, 200, 200, 429]);
    expect(await hit(server, "/api/things", { user: "kofi", times: 3 })).toEqual([200, 200, 200]);
  });

  test("the per-address limit still stops a flood, including sign-in", async () => {
    server = await startApp({ perIp: 5, perUser: 100 });
    const statuses = await hit(server, "/auth/login", { method: "POST", times: 6 });
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(await hit(server, "/api/things", { user: "efua" })).toEqual([429]);
  });

  test("the refusal says what happened, with the framework's error shape", async () => {
    server = await startApp({ perIp: 1, perUser: 100 });
    await hit(server, "/api/things");
    const { port } = server.address();
    const body = await (await fetch(`http://127.0.0.1:${port}/api/things`)).json();
    expect(body).toEqual({ status: "error", errorCode: "ERR_TOO_MANY_REQUESTS", message: "Too many requests, please try again in a few minutes." });
  });
});
