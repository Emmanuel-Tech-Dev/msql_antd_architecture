require("dotenv").config();

const express = require("express");
require("express-async-errors"); // This handles async errors automatically!
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimiter = require("express-rate-limit");
const bodyPaser = require("body-parser");
const csrf = require("csurf");
const helmet = require("helmet");
const http = require("http");

const fs = require("fs");
const path = require("path");
const AppError = require("./shared/helpers/AppError");
const logger = require("./shared/helpers/logger");
const BaseRoute = require("./route/baseRoute");
const authMiddleWare = require("./core/middleware/authMiddleWare");
const SettingsManager = require("./core/lib/systemSettings");
const errorHandler = require("./core/middleware/errorHandler");
const requestLogger = require("./core/middleware/requestLogger");
const AuthService = require("./core/lib/authService");
const AuthRoute = require("./route/authRoute");
const {
  authorization,
  clearPermissionCache,
} = require("./core/middleware/authorization");

const app = express();
const server = http.createServer(app);
const settings = new SettingsManager();
// const server = http.createServer(app);

const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const specs = require("./core/config/swagger");
const LogRoute = require("./route/LogRoute");
const AccessRoute = require("./route/acessRoute");
const BackupRoute = require("./route/BackupRoute");
const UiSettingsRoute = require("./route/UiSettingsRoute");

const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(requestLogger(logger));

const limiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many login attempts, please try again later.",
  },
});

// const io = socket(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// console.log(bodyPaser.json());

app.use(cookieParser());
app.use(express.json());
app.use(limiter);
app.use(bodyPaser.json());

app.use(bodyPaser.urlencoded({ extended: true }));
const allowedOrigins = [
  "http://localhost:3001",
  "http://localhost:5173",
  "https://my-production-app.com",
  "https://staging-app.com",
];

// app.use((err, req, res, next) => {
//   logger.error(err.message);
//   res.status(err.status || 500).json({ error: err.message });
// });

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-table-config",
    ],
    exposedHeaders: ["Content-Disposition", "X-Backup-SHA256"],
    optionsSuccessStatus: 200,
  }),
);

// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader(
//     "Access-Control-Allow-Methods",
//     "GET, POST, PUT, DELETE , PATCH"
//   );
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");
//   next();
// });
app.use(helmet());
app.get("/favicon.ico", (req, res) => res.status(204));
app.get("/ws", (req, res) => res.status(426).send("WebSocket only"));
// app.use(express.static("../frontend/build"));
// const publicPath = path.resolve(__dirname, "resources/adphotos");
// const voiceNotePath = path.resolve(__dirname, "resources/voicenotes");
// const msgImgPath = path.resolve(__dirname, "resources/msgimages");
// const sysImgPath = path.resolve(__dirname, "resources/sysimg");
// const usersImgPath = path.resolve(__dirname, "resources/users");
// const pdfsFilePath = path.resolve(__dirname, "resources/pdfs");

// const staticFilesOptions = {};
// app.get("/:pic", express.static(publicPath, staticFilesOptions));
// app.get("/:voice", express.static(voiceNotePath, staticFilesOptions));
// app.get("/:img", express.static(msgImgPath, staticFilesOptions));
// app.get("/:img", express.static(sysImgPath, staticFilesOptions));
// app.get("/:img", express.static(usersImgPath, staticFilesOptions));
// app.get("/:pdf", express.static(pdfsFilePath, staticFilesOptions));

// app.get("*", (req, res) => {
//   res.sendFile(path.resolve("../frontend/build/index.html"));
// });
// app.use(authMiddleware);
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

clearPermissionCache(); // Clear cache on server start to avoid stale permissions after deployments

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
// console.log("swagger paths:", Object.keys(specs.paths || {}));
new AuthRoute(app);

app.use(authMiddleWare);
app.use(authorization);
new LogRoute(app);
new BackupRoute(app);
new UiSettingsRoute(app);
new AccessRoute(app);
new BaseRoute(app);

// clearPermissionCache(); // Clear cache on server start to avoid stale permissions after deployments

app.post("/auth/create_user", async (req, res) => {
  const record = req.body;

  const auth = new AuthService();

  await auth.createAdminUser(record);

  res.status(201).json({
    status: "ok",
    message: "Operation Successfull!",
    detalis: "User created successfully",
  });
});

app.all("*", (req, res, next) => {
  next(
    new AppError(
      "ERR_ENDPOINT_NOT_FOUND",
      `Route ${req.originalUrl} not found`,
    ),
  );
});

app.use(errorHandler(logger));

// GRACEFUL SHUTDOWN

process.on("SIGTERM", async () => {
  logger.app("SIGTERM received; shutting down");
  await logger.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.app("SIGINT received; shutting down");
  await logger.close();
  process.exit(0);
});

async function startServer() {
  try {
    await logger.initialize();
    await settings.preloadAll();
    // console.log(settings);

    app.locals.settings = settings;

    server.listen(PORT, () => {
      logger.app("Server started", { port: Number(PORT) });
    });
  } catch (error) {
    logger.critical("Server startup failed", {
      errorMessage: error.message,
      stack: error.stack,
    });
    process.exitCode = 1;
  }
}

startServer();
