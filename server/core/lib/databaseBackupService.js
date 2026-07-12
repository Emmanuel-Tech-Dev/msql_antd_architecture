const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");
const AppError = require("../../shared/helpers/AppError");

const BACKUP_PATH = path.resolve(
  process.env.BACKUP_PATH || path.join(__dirname, "../../resources/backups"),
);
const BACKUP_TIMEOUT_MS = Math.max(
  30_000,
  Number.parseInt(process.env.BACKUP_TIMEOUT_MS, 10) || 10 * 60 * 1000,
);
const MAX_STDERR_LENGTH = 8 * 1024;

let backupInProgress = false;

function safeFilePart(value) {
  return String(value ?? "database")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[-:.]/g, "");
}

function requiredDatabaseConfig() {
  const config = {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || "3306",
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD ?? "",
    database: process.env.DATABASE_NAME,
  };

  const missing = Object.entries(config)
    .filter(([key]) => key !== "password")
    .filter(([, value]) => value === undefined || value === "")
    .map(([key]) => key);

  if (missing.length) {
    throw new AppError(
      "ERR_FEATURE_NOT_AVAILABLE",
      `Database backup configuration is incomplete: ${missing.join(", ")}`,
    );
  }

  if (!/^\d{1,5}$/.test(String(config.port))) {
    throw new AppError("ERR_INVALID_INPUT", "DATABASE_PORT is invalid");
  }

  return config;
}

async function removeIfPresent(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

class DatabaseBackupService {
  async createBackup() {
    if (backupInProgress) {
      throw new AppError(
        "ERR_CONFLICT",
        "A database backup is already in progress",
      );
    }

    backupInProgress = true;
    const startedAt = Date.now();
    let partialPath;

    try {
      const config = requiredDatabaseConfig();
      await fs.promises.mkdir(BACKUP_PATH, { recursive: true });

      const fileName = `${safeFilePart(config.database)}-${timestampForFile()}.sql`;
      const filePath = path.join(BACKUP_PATH, fileName);
      partialPath = `${filePath}.partial`;
      const executable = process.env.MYSQLDUMP_PATH?.trim() || "mysqldump";
      const args = [
        `--host=${config.host}`,
        `--port=${config.port}`,
        `--user=${config.user}`,
        "--single-transaction",
        "--quick",
        "--routines",
        "--triggers",
        "--events",
        "--hex-blob",
        "--default-character-set=utf8mb4",
        "--databases",
        config.database,
      ];

      const child = spawn(executable, args, {
        env: { ...process.env, MYSQL_PWD: config.password },
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      let timedOut = false;
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk) => {
        if (stderr.length < MAX_STDERR_LENGTH) {
          stderr += chunk.slice(0, MAX_STDERR_LENGTH - stderr.length);
        }
      });

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, BACKUP_TIMEOUT_MS);
      timeout.unref?.();

      const processComplete = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) => {
          clearTimeout(timeout);
          if (timedOut) {
            reject(new Error("mysqldump timed out"));
          } else if (code !== 0) {
            reject(
              new Error(
                `mysqldump exited with code ${code ?? "unknown"}${signal ? ` (${signal})` : ""}: ${stderr.trim()}`,
              ),
            );
          } else {
            resolve();
          }
        });
      });

      const hash = crypto.createHash("sha256");
      const hashStream = new Transform({
        transform(chunk, encoding, callback) {
          hash.update(chunk);
          callback(null, chunk);
        },
      });
      const output = fs.createWriteStream(partialPath, {
        flags: "wx",
        mode: 0o600,
      });

      await Promise.all([
        pipeline(child.stdout, hashStream, output),
        processComplete,
      ]);
      await fs.promises.rename(partialPath, filePath);
      partialPath = null;

      const stat = await fs.promises.stat(filePath);
      return {
        fileName,
        filePath,
        sizeBytes: stat.size,
        sha256: hash.digest("hex"),
        createdAt: stat.birthtime.toISOString(),
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (partialPath) await removeIfPresent(partialPath);
      if (error instanceof AppError) throw error;
      if (error.code === "ENOENT") {
        throw new AppError(
          "ERR_FEATURE_NOT_AVAILABLE",
          "mysqldump is not available. Install the MySQL client or configure MYSQLDUMP_PATH.",
        );
      }
      const backupError = new AppError(
        "ERR_DATABASE_ERROR",
        "Database backup failed",
      );
      backupError.cause = error;
      throw backupError;
    } finally {
      backupInProgress = false;
    }
  }

  async removeBackup(filePath) {
    const resolved = path.resolve(filePath);
    const relative = path.relative(BACKUP_PATH, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new AppError("ERR_INVALID_INPUT", "Invalid backup path");
    }
    await removeIfPresent(resolved);
  }
}

module.exports = new DatabaseBackupService();
