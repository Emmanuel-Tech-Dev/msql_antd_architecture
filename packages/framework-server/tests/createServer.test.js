jest.mock("../core/config/conn", () => ({ query: jest.fn(async () => [[]]), getConnection: jest.fn() }));
jest.mock("../shared/helpers/logger", () => ({
  error: jest.fn(), app: jest.fn(), info: jest.fn(), warn: jest.fn(), security: jest.fn(), critical: jest.fn(),
  http: jest.fn(), access: jest.fn(), debug: jest.fn(), initialize: jest.fn(), close: jest.fn(), smartError: jest.fn(),
}));

const { createServer } = require("../createServer");

class InvoiceRoute {
  constructor(app) {
    app.get("/api/v1/invoices/summary", (req, res) => res.json({ total: 3 }));
  }
}
class HealthRoute {
  constructor(app) {
    app.get("/health", (req, res) => res.json({ ok: true, seenBy: req.seenBy }));
  }
}
const branchPolicy = { id: "branch-only", description: "Records of your own branch", evaluate: () => ({ decision: "NOT_APPLICABLE" }) };
const markRequest = (req, res, next) => { req.seenBy = "beforeAuth"; next(); };
const afterAuthMiddleware = (req, res, next) => next();

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
}

describe("createServer", () => {
  const { app } = createServer({
    routes: [InvoiceRoute],
    publicRoutes: [HealthRoute],
    beforeAuth: [markRequest],
    afterAuth: [afterAuthMiddleware],
    policies: [branchPolicy],
    origins: ["https://invoices.example.com/"],
    paths: { logs: "/tmp/project/logs", backups: "/tmp/project/backups", migrations: "/tmp/project/migrations" },
  });
  const paths = app._router.stack.map((layer) => layer.route?.path ?? layer.name);

  test("a public route answers without a token, after the beforeAuth middleware", async () => {
    const server = await listen(app);
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, seenBy: "beforeAuth" });

      const refused = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/invoices/summary`);
      expect(refused.status).toBe(401);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("CORS allows the origins passed to createServer and refuses others", async () => {
    const server = await listen(app);
    const preflight = (origin) => fetch(`http://127.0.0.1:${server.address().port}/api/v1/invoices/summary`, {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "GET" },
    });
    try {
      const allowed = await preflight("https://invoices.example.com");
      expect(allowed.headers.get("access-control-allow-origin")).toBe("https://invoices.example.com");
      expect(allowed.headers.get("access-control-allow-credentials")).toBe("true");

      const refused = await preflight("https://elsewhere.example.com");
      expect(refused.headers.get("access-control-allow-origin")).toBeNull();
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("project routes sit behind the token check and before the generic /api/:resources routes", () => {
    const at = (path) => paths.indexOf(path);
    expect(at("/health")).toBeLessThan(paths.indexOf("authMiddleWare"));
    expect(paths.indexOf("afterAuthMiddleware")).toBeLessThan(at("/api/v1/invoices/summary"));
    expect(at("/api/v1/invoices/summary")).toBeGreaterThan(paths.indexOf("authMiddleWare"));
    expect(at("/api/v1/invoices/summary")).toBeLessThan(at("/api/:resources/:id"));
  });

  test("project policies join the framework's ABAC engine, and paths are applied", () => {
    const { defaultAbacEngine } = require("../core/middleware/authorization");
    expect(defaultAbacEngine.registry.list().map((policy) => policy.id)).toContain("branch-only");
    expect(process.env.LOG_PATH).toBe("/tmp/project/logs");
    expect(process.env.BACKUP_PATH).toBe("/tmp/project/backups");
    expect(process.env.MIGRATIONS_PATH).toBe("/tmp/project/migrations");
  });
});
