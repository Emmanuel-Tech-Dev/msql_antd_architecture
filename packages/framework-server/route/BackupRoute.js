const backupService = require("../core/lib/databaseBackupService");
const backupHistory = require("../core/lib/backupHistoryService");
const AppError = require("../shared/helpers/AppError");
const logger = require("../shared/helpers/logger");

const DOWNLOAD_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function backupIdFrom(req) {
  const backupId = Number(req.params.backupId);
  if (!Number.isInteger(backupId) || backupId < 1) {
    throw new AppError("ERR_INVALID_INPUT", "backupId must be a positive whole number");
  }
  return backupId;
}

class BackupRoute {
  constructor(app) {
    // Health, last backup, schedule and recent history for the backup page.
    app.get("/api/v1/system/backups", async (req, res, next) => {
      try {
        const overview = await backupHistory.getOverview({ where: req.query.where, limit: req.query.limit });
        return res.status(200).json({ status: "ok", data: overview });
      } catch (error) {
        return next(error);
      }
    });

    app.post("/api/v1/system/backups", async (req, res, next) => {
      const destination = req.body?.destination;
      if (!new Set(["server", "download"]).has(destination)) {
        return next(
          new AppError(
            "ERR_INVALID_INPUT",
            'destination must be either "server" or "download"',
          ),
        );
      }
      const recorded = { destination: destination === "server" ? "SERVER" : "DOWNLOAD", trigger: "MANUAL", actorId: req.user?.sub };

      let backup;
      try {
        backup = await backupService.createBackup();
      } catch (error) {
        if (error.errorCode !== "ERR_CONFLICT") {
          await backupHistory.recordFailure({ ...recorded, error }).catch((recordError) => logger.error(recordError, { component: "BackupRoute" }));
        }
        return next(error);
      }

      try {
        await backupHistory.recordBackup({ ...recorded, backup });
        logger.security("Database backup created", {
          requestId: req.requestId,
          userId: req.user?.sub,
          destination,
          fileName: backup.fileName,
          sizeBytes: backup.sizeBytes,
          sha256: backup.sha256,
          durationMs: backup.durationMs,
        });

        if (destination === "server") {
          return res.status(201).json({
            status: "ok",
            message: "Database backup created",
            data: {
              fileName: backup.fileName,
              sizeBytes: backup.sizeBytes,
              sha256: backup.sha256,
              createdAt: backup.createdAt,
              durationMs: backup.durationMs,
              destination,
            },
          });
        }

        res.set({ ...DOWNLOAD_HEADERS, "X-Backup-SHA256": backup.sha256 });
        return res.download(
          backup.filePath,
          backup.fileName,
          async (downloadError) => {
            try {
              await backupService.removeBackup(backup.filePath);
            } catch (cleanupError) {
              logger.error(cleanupError, {
                component: "BackupRoute",
                operation: "removeTemporaryBackup",
                fileName: backup.fileName,
              });
            }

            if (downloadError && !res.headersSent) return next(downloadError);
            return undefined;
          },
        );
      } catch (error) {
        return next(error);
      }
    });

    app.put("/api/v1/system/backups/schedule", async (req, res, next) => {
      try {
        const expectedVersion = Number(req.body?.expectedVersion);
        if (!Number.isInteger(expectedVersion)) {
          throw new AppError("ERR_INVALID_INPUT", "expectedVersion is required");
        }
        const schedule = await backupHistory.updateSchedule(req.body?.schedule, expectedVersion, req.user?.sub);
        logger.security("Backup schedule changed", { userId: req.user?.sub, schedule: schedule.value });
        return res.status(200).json({ status: "ok", message: "Backup schedule saved", data: { schedule } });
      } catch (error) {
        return next(error);
      }
    });

    app.get("/api/v1/system/backups/:backupId/download", async (req, res, next) => {
      try {
        const copy = await backupHistory.findServerCopy(backupIdFrom(req));
        logger.security("Database backup downloaded", { userId: req.user?.sub, fileName: copy.file_name });
        res.set({ ...DOWNLOAD_HEADERS, "X-Backup-SHA256": copy.sha256 ?? "" });
        return res.download(copy.filePath, copy.file_name, (error) => {
          if (error && !res.headersSent) next(new AppError("ERR_RECORD_NOT_FOUND", "The backup file is missing from the server."));
        });
      } catch (error) {
        return next(error);
      }
    });

    app.delete("/api/v1/system/backups/:backupId", async (req, res, next) => {
      try {
        const copy = await backupHistory.deleteServerCopy(backupIdFrom(req));
        logger.security("Database backup deleted", { userId: req.user?.sub, fileName: copy.file_name });
        return res.status(200).json({ status: "ok", message: "Backup deleted from the server" });
      } catch (error) {
        return next(error);
      }
    });
  }
}

module.exports = BackupRoute;
