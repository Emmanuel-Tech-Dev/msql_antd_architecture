// The framework server as a factory, so a project adds its own routes,
// middleware and ABAC policies without editing framework files:
//
//   createServer({ routes: [InvoiceRoute], policies: [branchPolicy] }).start();
//
// Options
//   routes      route classes, each `new Route(app)` like the framework's own;
//               registered after the token check and authorization, before
//               the generic /api/:resources routes (so /api/v1/... paths win)
//   publicRoutes route classes that answer without a token (before the check)
//   beforeAuth  middleware run before the token check
//   afterAuth   middleware run after authorization, before any route
//   policies    ABAC policies added to the framework's engine (deny-only)
//   paths       { logs, backups, uploads, migrations } folders; default: the
//               env variables LOG_PATH, BACKUP_PATH, UPLOAD_PATH,
//               MIGRATIONS_PATH, then resources/<name> in the folder the
//               server runs from. `migrations` is the project's own folder;
//               the framework's stay in the framework
//   port        default PORT, then 3000
//
// Returns { app, server, start }. start() loads settings, starts realtime and
// the background schedules (backups, upload clean-up) and listens.

function applyPaths(paths = {}) {
  // Read by the logger, backup service and migration tools when they load,
  // so they are set before any of them is required.
  if (paths.logs) process.env.LOG_PATH = paths.logs;
  if (paths.backups) process.env.BACKUP_PATH = paths.backups;
  if (paths.uploads) process.env.UPLOAD_PATH = paths.uploads;
  if (paths.migrations) process.env.MIGRATIONS_PATH = paths.migrations;
}

function createServer({
  routes = [],
  publicRoutes = [],
  beforeAuth = [],
  afterAuth = [],
  policies = [],
  paths,
  port = process.env.PORT || 3000,
} = {}) {
  applyPaths(paths);

  const express = require("express");
  require("express-async-errors"); // errors thrown in async handlers reach errorHandler
  const cors = require("cors");
  const cookieParser = require("cookie-parser");
  const helmet = require("helmet");
  const http = require("http");

  const AppError = require("./shared/helpers/AppError");
  const logger = require("./shared/helpers/logger");
  const SettingsManager = require("./core/lib/systemSettings");
  const backupHistoryService = require("./core/lib/backupHistoryService");
  const uploadTracking = require("./core/lib/uploadTracking");
  const authMiddleWare = require("./core/middleware/authMiddleWare");
  const { authorization, clearPermissionCache, defaultAbacEngine } = require("./core/middleware/authorization");
  const errorHandler = require("./core/middleware/errorHandler");
  const requestLogger = require("./core/middleware/requestLogger");
  const { createRateLimits } = require("./core/middleware/rateLimits");
  const { validateOrigin } = require("./core/config/origins");
  const { initRealtime } = require("./core/realtime/socketServer");
  const AuthRoute = require("./route/authRoute");
  const LogRoute = require("./route/LogRoute");
  const BackupRoute = require("./route/BackupRoute");
  const UiSettingsRoute = require("./route/UiSettingsRoute");
  const AdminStatisticsRoute = require("./route/AdminStatisticsRoute");
  const UserDirectoryRoute = require("./route/UserDirectoryRoute");
  const MetadataRoute = require("./route/MetadataRoute");
  const MetadataAdminRoute = require("./route/MetadataAdminRoute");
  const AccessRoute = require("./route/acessRoute");
  const BaseRoute = require("./route/baseRoute");

  const app = express();
  const server = http.createServer(app);
  const settings = new SettingsManager();

  for (const policy of policies) defaultAbacEngine.registry.register(policy);

  app.disable("x-powered-by");
  // Behind a reverse proxy (nginx, a load balancer) set TRUST_PROXY, e.g. 1 for
  // one proxy, so req.ip is the visitor's address and not the proxy's.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set("trust proxy", Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
  }
  app.use(requestLogger(logger));
  app.use(cookieParser());
  // A CSV import sends up to 5,000 rows; every other request keeps the default
  // 100 kB limit.
  app.use("/api/v1/metadata-admin/import", express.json({ limit: "10mb" }));
  app.use(express.json());
  const { perIpLimit, perUserLimit } = createRateLimits({
    perIp: Number(process.env.RATE_LIMIT_PER_IP) || undefined,
    perUser: Number(process.env.RATE_LIMIT_PER_USER) || undefined,
  });
  app.use(perIpLimit);
  app.use(express.urlencoded({ extended: true }));
  app.use(cors({
    origin: validateOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-table-config"],
    exposedHeaders: ["Content-Disposition", "X-Backup-SHA256"],
    optionsSuccessStatus: 200,
  }));
  app.use(helmet());
  app.get("/favicon.ico", (req, res) => res.status(204));
  app.get("/ws", (req, res) => res.status(426).send("WebSocket only"));
  app.use((req, res, next) => (req.method === "OPTIONS" ? res.sendStatus(200) : next()));
  for (const middleware of beforeAuth) app.use(middleware);

  // Permissions may have changed while the server was down.
  clearPermissionCache();

  // Sign-in, refresh and password recovery work without a token, so they are
  // registered before the auth check. Everything after it needs a valid token
  // and passes authorization.
  new AuthRoute(app);
  for (const Route of publicRoutes) new Route(app);
  app.use(authMiddleWare);
  app.use(perUserLimit);
  app.use(authorization);
  for (const middleware of afterAuth) app.use(middleware);
  new LogRoute(app);
  new BackupRoute(app);
  new UiSettingsRoute(app);
  new AdminStatisticsRoute(app);
  new UserDirectoryRoute(app);
  new MetadataRoute(app);
  new MetadataAdminRoute(app);
  new AccessRoute(app);
  for (const Route of routes) new Route(app);
  new BaseRoute(app);

  app.all("*", (req, res, next) => {
    next(new AppError("ERR_ENDPOINT_NOT_FOUND", `Route ${req.originalUrl} not found`));
  });
  app.use(errorHandler(logger));

  // Automatic database backups: checked often so the chosen hour is kept, and
  // a backup missed while the server was off is made soon after it starts.
  const BACKUP_SCHEDULE_CHECK_MS = 5 * 60 * 1000;
  function scheduleAutomaticBackups() {
    const run = () => backupHistoryService.runDueAutomaticBackup()
      .catch((error) => logger.error(error, { context: "Automatic database backup" }));
    run();
    setInterval(run, BACKUP_SCHEDULE_CHECK_MS).unref();
  }

  // Uploads never saved with a record (after 24 hours) and replaced or cleared
  // files are deleted from storage.
  const UPLOAD_PURGE_MS = 60 * 60 * 1000;
  function scheduleUploadCleanup() {
    const run = () => uploadTracking.purgeUploads()
      .catch((error) => logger.error(error, { context: "Upload clean-up" }));
    run();
    setInterval(run, UPLOAD_PURGE_MS).unref();
  }

  async function shutDown(signal) {
    logger.app(`${signal} received; shutting down`);
    await logger.close();
    process.exit(0);
  }

  async function start() {
    process.on("SIGTERM", () => shutDown("SIGTERM"));
    process.on("SIGINT", () => shutDown("SIGINT"));
    try {
      await logger.initialize();
      initRealtime(server);
      await settings.preloadAll();
      app.locals.settings = settings;
      scheduleAutomaticBackups();
      scheduleUploadCleanup();
      await new Promise((resolve) => server.listen(port, resolve));
      logger.app("Server started", { port: Number(port) });
      return server;
    } catch (error) {
      logger.critical("Server startup failed", {
        errorMessage: error.message,
        stack: error.stack,
      });
      process.exitCode = 1;
      return null;
    }
  }

  return { app, server, start };
}

module.exports = { createServer };
