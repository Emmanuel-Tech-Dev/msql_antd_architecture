const backupService = require("../core/lib/databaseBackupService");
const AppError = require("../shared/helpers/AppError");
const logger = require("../shared/helpers/logger");

class BackupRoute {
  constructor(app) {
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

      try {
        const backup = await backupService.createBackup();
        const auditMetadata = {
          requestId: req.requestId,
          userId: req.user?.sub,
          destination,
          fileName: backup.fileName,
          sizeBytes: backup.sizeBytes,
          sha256: backup.sha256,
          durationMs: backup.durationMs,
        };

        logger.security("Database backup created", auditMetadata);

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

        res.set({
          "Cache-Control": "no-store",
          "X-Backup-SHA256": backup.sha256,
          "X-Content-Type-Options": "nosniff",
        });
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
  }
}

module.exports = BackupRoute;
