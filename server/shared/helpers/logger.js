const winston = require("winston");
const path = require("path");
require("winston-daily-rotate-file");
const fs = require("fs");
const ERROR_CODES = require("./erroCodes");
const utils = require("../utils/functions");

// Environment configuration with validation
const ENV = process.env.NODE_ENV || "development";
const LOG_LEVEL =
  process.env.LOG_LEVEL || (ENV === "production" ? "http" : "debug");
const LOG_PATH =
  process.env.LOG_PATH || path.join(__dirname, "../../resources/logs");
const LOG_RETENTION = process.env.LOG_RETENTION || "14d";
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || "20m";
const LOG_CONSOLE = process.env.LOG_CONSOLE !== "false";

// Log type definitions with metadata
const LOG_TYPES = Object.freeze({
  access: { file: "access-%DATE%.log", level: "http", category: "access" },
  error: { file: "error-%DATE%.log", level: "error", category: "error" },
  query: { file: "query-%DATE%.log", level: "verbose", category: "query" },
  security: {
    file: "security-%DATE%.log",
    level: "warn",
    category: "security",
  },
  critical: {
    file: "critical-%DATE%.log",
    level: "error",
    category: "security",
  },
  performance: {
    file: "performance-%DATE%.log",
    level: "debug",
    category: "performance",
  },
  app: { file: "app-%DATE%.log", level: "info", category: "app" },
});

// Winston pipes each transport through the logger EventEmitter. The combined,
// exception, rejection, optional console, and bounded category transports can
// legitimately exceed Node's default limit of 10 listeners.
const MAX_LOGGER_TRANSPORTS =
  3 + Number(LOG_CONSOLE) + Object.keys(LOG_TYPES).length;

class LoggerService {
  constructor() {
    this.transports = new Map();
    this.logger = null;
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initializeInternal();
    await this.initPromise;
    this.initialized = true;
  }

  async _initializeInternal() {
    try {
      await fs.promises.mkdir(LOG_PATH, { recursive: true }); // check if directory exist;

      const baseFormat = winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        winston.format.errors({ stack: true }),
      );
      const structuredFormat = winston.format.combine(
        winston.format.metadata({
          fillExcept: ["message", "level", "timestamp", "label"],
        }),
        winston.format.json(),
      );

      const consoleFormat = winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, category, ...meta }) => {
            const cat = category ? `[${category.toUpperCase()}]` : "";
            const metaStr = Object.keys(meta).length
              ? `\n${JSON.stringify(meta, null, 2)}`
              : "";
            return `${timestamp} ${level} ${cat} ${message}${metaStr}`;
          },
        ),
      );

      this.logger = winston.createLogger({
        level: LOG_LEVEL,
        format: baseFormat,
        defaultMeta: { service: "api", environment: ENV },
        transports: [],
        exitOnError: false,
      });
      this.logger.setMaxListeners(MAX_LOGGER_TRANSPORTS);

      if (LOG_CONSOLE) {
        this.logger.add(
          new winston.transports.Console({
            format: ENV === "production" ? structuredFormat : consoleFormat,
          }),
        );
      }

      // Combined log file for all levels
      this.logger.add(
        new winston.transports.DailyRotateFile({
          filename: path.join(LOG_PATH, "combined-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: LOG_MAX_SIZE,
          maxFiles: LOG_RETENTION,
          format: structuredFormat,
        }),
      );

      this.logger.exceptions.handle(
        new winston.transports.DailyRotateFile({
          filename: path.join(LOG_PATH, "exceptions-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: LOG_MAX_SIZE,
          maxFiles: LOG_RETENTION,
          format: structuredFormat,
        }),
      );

      this.logger.rejections.handle(
        new winston.transports.DailyRotateFile({
          filename: path.join(LOG_PATH, "rejections-%DATE%.log"),
          datePattern: "YYYY-MM-DD",
          zippedArchive: true,
          maxSize: LOG_MAX_SIZE,
          maxFiles: LOG_RETENTION,
          format: structuredFormat,
        }),
      );
    } catch (err) {
      console.error("Failed to initialize logger:", err);
      throw new Error(`Logger initialization failed: ${err.message}`);
    }
  }

  ensureTransport(type) {
    if (!LOG_TYPES[type]) {
      throw new Error(`Invalid log type: ${type}`);
    }

    if (this.transports.has(type)) return;

    const config = LOG_TYPES[type];
    const typeFilter = winston.format((info) =>
      (info.logType ?? info.metadata?.logType) === type ? info : false,
    );
    const transport = new winston.transports.DailyRotateFile({
      filename: path.join(LOG_PATH, config.file),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: LOG_MAX_SIZE,
      maxFiles: LOG_RETENTION,
      level: config.level,
      format: winston.format.combine(typeFilter(), winston.format.metadata({
        fillExcept: ["message", "level", "timestamp", "label"],
      }), winston.format.json()),
    });

    this.logger.add(transport);
    this.transports.set(type, transport);
  }

  log(type, message, metadata = {}) {
    if (!this.initialized) {
      console.warn("Logger not initialized. Call initialize() first.");
      return;
    }

    try {
      this.ensureTransport(type);
      const config = LOG_TYPES[type];
      let safeMetadata;
      try {
        safeMetadata = utils.redactSensitiveData(metadata, [
          "code",
          "challengeToken",
          "set-cookie",
        ]);
      } catch {
        safeMetadata = { metadataSerializationFailed: true };
      }

      this.logger.log(config.level, message, {
        category: config.category,
        logType: type,
        ...safeMetadata,
      });
    } catch (err) {
      console.error("Logging error:", err);
    }
  }

  // Find error code by status and optional hint

  _findErrorCodeByStatus(status, hint = null) {
    const matches = Object.entries(ERROR_CODES).filter(
      ([_, value]) => value.status === status,
    );

    if (matches.length === 0) {
      return null;
    }

    // If there's only one match, use it
    if (matches.length === 1) {
      return { code: matches[0][0], ...matches[0][1] };
    }

    // If multiple matches and hint provided, try to find best match
    if (hint) {
      const hintLower = hint.toLowerCase();
      const bestMatch = matches.find(([code, _]) =>
        code.toLowerCase().includes(hintLower),
      );
      if (bestMatch) {
        return { code: bestMatch[0], ...bestMatch[1] };
      }
    }

    // Default to first match
    return { code: matches[0][0], ...matches[0][1] };
  }

  smartError(error, context = {}, level) {
    const status = error?.statusCode || context.statusCode || 500;
    const hint = error?.errorCode || context.hint;
    const errorInfo = this._findErrorCodeByStatus(status, hint);
    const safeContext = utils.redactSensitiveData(context, [
      "code",
      "challengeToken",
    ]);
    const metadata = {
      ...safeContext,
      errorCode: error?.errorCode || "UNKNOWN",
      status: error?.status || status,
      statusCode: error?.statusCode,
      errorMessage: error instanceof Error ? error.message : error,
      stack:
        error instanceof Error && Number(status) >= 500
          ? error.stack
          : undefined,
      requestId:
        safeContext.requestId ?? utils.generateCustomId("request", 12),
    };

    // Remove hint from metadata to avoid clutter
    delete metadata.hint;

    const logMessage = errorInfo
      ? `[${errorInfo.code}] ${errorInfo.message}`
      : error instanceof Error
        ? error.message
        : error;

    const errLevel = level || "error";

    this.log(errLevel, logMessage, metadata);
  }

  access(message, meta = {}) {
    this.log("access", message, meta);
  }

  error(error, meta = {}) {
    if (error instanceof Error) {
      this.log("error", error.message, {
        stack: error.stack,
        name: error.name,
        ...meta,
      });
    } else {
      this.log("error", error, meta);
    }
  }

  query(message, meta = {}) {
    this.log("query", message, meta);
  }

  security(message, meta = {}) {
    this.log("security", message, meta);
  }
  critical(message, meta = {}) {
    this.log("critical", message, meta);
  }

  performance(message, meta = {}) {
    this.log("performance", message, meta);
  }

  app(message, meta = {}) {
    this.log("app", message, meta);
  }

  startTimer(label) {
    const start = Date.now();
    return (metadata = {}) => {
      const duration = Date.now() - start;
      this.performance(`${label} completed`, {
        operation: label,
        duration: `${duration}ms`,
        ...metadata,
      });
      return duration;
    };
  }

  async close() {
    if (this.logger) {
      return new Promise((resolve) => {
        this.logger.close(() => {
          this.initialized = false;
          this.initPromise = null;
          this.transports.clear();
          this.logger = null;
          resolve();
        });
      });
    }
  }
}

const log = new LoggerService();

// Auto-initialize on first import
log.initialize().catch((err) => {
  console.error("Logger auto-initialization failed:", err);
});

// Export both the service and error codes
module.exports = log;
