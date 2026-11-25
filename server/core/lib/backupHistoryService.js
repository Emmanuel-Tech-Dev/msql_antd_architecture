// Backup history, the automatic backup schedule, and the scheduled runs.
// databaseBackupService makes the dump file; this records what happened to
// it so the Database backup page can say when the last good backup was.

const path = require("path");
const { z } = require("zod");
const Model = require("../model/model");
const utils = require("../../shared/utils/functions");
const AppError = require("../../shared/helpers/AppError");
const logger = require("../../shared/helpers/logger");
const backupService = require("./databaseBackupService");

const SCHEDULE_KEY = "system.backup_schedule";
const INTERVAL_DAYS = { daily: 1, every3days: 3, weekly: 7 };
// A failed automatic backup is tried again after this, not on every check.
const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;
const HISTORY_PAGE_SIZE = 50;

const scheduleSchema = z
  .object({
    enabled: z.boolean(),
    frequency: z.enum(Object.keys(INTERVAL_DAYS)),
    hour: z.number().int().min(0).max(23),
    keep: z.number().int().min(1).max(60),
  })
  .strict();

// Keeps the database's message short and free of connection details.
function failureReason(error) {
  const cause = error?.cause?.message ?? error?.message ?? "Backup failed";
  return cause.includes("timed out")
    ? "mysqldump timed out"
    : cause.split(":")[0].slice(0, 500);
}

// A copy that is still on the server and can be downloaded or restored.
function keptOnServer(query) {
  return query
    .where("database_backups.destination", "=", "SERVER")
    .where("database_backups.status", "=", "DONE")
    .whereNull("database_backups.deletedAt");
}

async function recordBackup({ backup, destination, trigger, actorId }) {
  const result = await new Model()
    .insert("database_backups", {
      file_name: backup.fileName,
      destination,
      trigger_type: trigger,
      status: "DONE",
      size_bytes: backup.sizeBytes,
      sha256: backup.sha256,
      created_by: actorId ?? null,
    })
    .execute();
  return result.insertId;
}

async function recordFailure({ error, destination, trigger, actorId }) {
  await new Model()
    .insert("database_backups", {
      destination,
      trigger_type: trigger,
      status: "FAILED",
      error_message: failureReason(error),
      created_by: actorId ?? null,
    })
    .execute();
}

async function getSchedule() {
  const setting = await new Model()
    .select(["setting_value", "version"], "ui_settings")
    .where("setting_key", "=", SCHEDULE_KEY)
    .where("is_active", "=", 1)
    .first();
  if (!setting)
    throw new AppError(
      "ERR_RECORD_NOT_FOUND",
      "The backup schedule is not set up. Run the database migrations.",
    );
  return {
    value: utils.parseJson(setting.setting_value, null),
    version: setting.version,
  };
}

// startedAt marks when the current schedule began, so the first automatic
// backup waits for the chosen hour instead of running the moment it is
// switched on. It restarts whenever the schedule is turned on or changed.
async function updateSchedule(input, expectedVersion, actorId) {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("ERR_VALIDATION_FAILED", "Validation failed", {
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  const current = (await getSchedule()).value;
  const schedule = parsed.data;
  const timingChanged =
    schedule.enabled !== current.enabled ||
    schedule.frequency !== current.frequency ||
    schedule.hour !== current.hour;
  const value = {
    ...schedule,
    startedAt:
      schedule.enabled && (timingChanged || !current.startedAt)
        ? new Date().toISOString()
        : (current.startedAt ?? null),
  };

  const result = await new Model()
    .update("ui_settings", {
      setting_value: JSON.stringify(value),
      version: expectedVersion + 1,
      updated_by: actorId,
    })
    .where("setting_key", "=", SCHEDULE_KEY)
    .where("version", "=", expectedVersion)
    .where("is_active", "=", 1)
    .execute();
  if (result.affectedRows !== 1) {
    throw new AppError(
      "ERR_CONFLICT",
      "The schedule changed elsewhere. Reload and try again.",
    );
  }
  return { value, version: expectedVersion + 1 };
}

async function lastAutomaticAttempt() {
  return new Model()
    .select(["status", "createdAt"], "database_backups")
    .where("trigger_type", "=", "AUTOMATIC")
    .orderBy("createdAt", "DESC")
    .orderBy("id", "DESC")
    .first();
}

function atHour(date, hour) {
  const result = new Date(date);
  result.setHours(hour, 0, 0, 0);
  return result;
}

// The next automatic backup, in server time: the chosen hour, one interval
// after the last automatic one, or the first such hour after the schedule
// started. A missed run is due straight away.
function nextAutomaticRun(schedule, lastAttempt) {
  if (!schedule.enabled || !schedule.startedAt) return null;
  if (lastAttempt?.status === "FAILED") {
    return new Date(
      new Date(lastAttempt.createdAt).getTime() + RETRY_AFTER_FAILURE_MS,
    );
  }
  if (lastAttempt) {
    const next = atHour(lastAttempt.createdAt, schedule.hour);
    next.setDate(next.getDate() + INTERVAL_DAYS[schedule.frequency]);
    return next;
  }
  const started = new Date(schedule.startedAt);
  const first = atHour(started, schedule.hour);
  if (first <= started) first.setDate(first.getDate() + 1);
  return first;
}

// Automatic copies beyond the number to keep are deleted, oldest first.
// Copies made by people are never removed here.
async function pruneAutomaticCopies(keep) {
  const rows = await keptOnServer(
    new Model().select(["id", "file_name"], "database_backups"),
  )
    .where("trigger_type", "=", "AUTOMATIC")
    .orderBy("createdAt", "DESC")
    .orderBy("id", "DESC")
    .limit(1000)
    .offset(keep)
    .execute();
  for (const row of rows) {
    await removeServerCopy(row);
  }
  return rows.length;
}

async function removeServerCopy(row) {
  await backupService.removeBackup(
    path.join(backupService.backupPath, row.file_name),
  );
  await new Model()
    .update("database_backups", { deletedAt: new Date() })
    .where("id", "=", row.id)
    .whereNull("deletedAt")
    .execute();
}

async function runDueAutomaticBackup(now = new Date()) {
  const { value: schedule } = await getSchedule();
  const next = nextAutomaticRun(schedule, await lastAutomaticAttempt());
  if (!next || next > now) return null;

  let backup;
  try {
    backup = await backupService.createBackup();
  } catch (error) {
    // A backup someone started by hand is running; try again on the next check.
    if (error.errorCode === "ERR_CONFLICT") return null;
    await recordFailure({ error, destination: "SERVER", trigger: "AUTOMATIC" });
    logger.error(error, { context: "Automatic database backup" });
    return null;
  }
  await recordBackup({ backup, destination: "SERVER", trigger: "AUTOMATIC" });
  const removed = await pruneAutomaticCopies(schedule.keep);
  logger.security("Automatic database backup created", {
    fileName: backup.fileName,
    sizeBytes: backup.sizeBytes,
    removed,
  });
  return backup;
}

function healthOf(lastGood, lastAttempt, schedule) {
  if (!lastGood) return "NONE";
  if (
    lastAttempt?.status === "FAILED" &&
    new Date(lastAttempt.createdAt) > new Date(lastGood.createdAt)
  )
    return "FAILED";
  const allowedDays = schedule.enabled
    ? INTERVAL_DAYS[schedule.frequency] + 1
    : 7;
  const ageDays =
    (Date.now() - new Date(lastGood.createdAt).getTime()) /
    (24 * 60 * 60 * 1000);
  return ageDays > allowedDays ? "OVERDUE" : "OK";
}

const HISTORY_FILTERS = {
  all: (query) => query,
  server: keptOnServer,
  downloaded: (query) =>
    query
      .where("database_backups.destination", "=", "DOWNLOAD")
      .where("database_backups.status", "=", "DONE"),
};

// Backup rows with the name of the person who made them.
function historyQuery() {
  return new Model()
    .select(
      [
        "database_backups.id",
        "database_backups.file_name",
        "database_backups.destination",
        "database_backups.trigger_type",
        "database_backups.status",
        "database_backups.size_bytes",
        "database_backups.sha256",
        "database_backups.error_message",
        "database_backups.createdAt",
        "database_backups.deletedAt",
        "admin.name AS created_by_name",
      ],
      "database_backups",
    )
    .join("LEFT", "admin", "admin.custom_id", "database_backups.created_by");
}

async function listHistory({ where = "all", limit = 10 } = {}) {
  const applyFilter = HISTORY_FILTERS[where] ?? HISTORY_FILTERS.all;
  const rowLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    HISTORY_PAGE_SIZE,
  );

  const rows = await applyFilter(historyQuery())
    .orderBy("database_backups.createdAt", "DESC")
    .orderBy("database_backups.id", "DESC")
    .limit(rowLimit)
    .execute();
  const total = await applyFilter(
    new Model().select("id", "database_backups"),
  ).count();
  const keptCount = await keptOnServer(
    new Model().select("id", "database_backups"),
  ).count();
  const [kept] = await keptOnServer(
    new Model()
      .aggregate("SUM", "size_bytes", "kept_bytes")
      .from("database_backups"),
  ).execute();
  return {
    rows,
    total: Number(total),
    keptCount: Number(keptCount),
    keptBytes: Number(kept.kept_bytes ?? 0),
  };
}

// Everything the page needs in one response: health, last good backup,
// schedule with its next run, and the first page of history.
async function getOverview(query) {
  const schedule = await getSchedule();
  const lastGood = await historyQuery()
    .where("database_backups.status", "=", "DONE")
    .orderBy("database_backups.createdAt", "DESC")
    .orderBy("database_backups.id", "DESC")
    .first();
  const lastAttempt = await new Model()
    .select(["status", "error_message", "createdAt"], "database_backups")
    .orderBy("createdAt", "DESC")
    .orderBy("id", "DESC")
    .first();
  const history = await listHistory(query);
  const nextRun = nextAutomaticRun(
    schedule.value,
    await lastAutomaticAttempt(),
  );

  return {
    health: healthOf(lastGood, lastAttempt, schedule.value),
    lastBackup: lastGood ?? null,
    lastFailure: lastAttempt?.status === "FAILED" ? lastAttempt : null,
    schedule: {
      ...schedule,
      nextRunAt: nextRun ? nextRun.toISOString() : null,
    },
    history: history.rows,
    total: history.total,
    keptCount: history.keptCount,
    keptBytes: history.keptBytes,
  };
}

async function findServerCopy(backupId) {
  const copy = await keptOnServer(
    new Model().select(["id", "file_name", "sha256"], "database_backups"),
  )
    .where("database_backups.id", "=", backupId)
    .first();
  if (!copy)
    throw new AppError(
      "ERR_RECORD_NOT_FOUND",
      "This backup is no longer kept on the server.",
    );
  return {
    ...copy,
    filePath: path.join(backupService.backupPath, copy.file_name),
  };
}

async function deleteServerCopy(backupId) {
  const copy = await findServerCopy(backupId);
  await removeServerCopy(copy);
  return copy;
}

module.exports = {
  deleteServerCopy,
  findServerCopy,
  getOverview,
  nextAutomaticRun,
  recordBackup,
  recordFailure,
  runDueAutomaticBackup,
  updateSchedule,
};
