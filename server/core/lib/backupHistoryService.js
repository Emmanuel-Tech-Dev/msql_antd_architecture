// Backup history, the automatic backup schedule, and the scheduled runs.
// databaseBackupService makes the dump file; this records what happened to
// it so the Database backup page can say when the last good backup was.

const path = require("path");
const { z } = require("zod");
const db = require("../config/conn");
const AppError = require("../../shared/helpers/AppError");
const logger = require("../../shared/helpers/logger");
const backupService = require("./databaseBackupService");

const SCHEDULE_KEY = "system.backup_schedule";
const INTERVAL_DAYS = { daily: 1, every3days: 3, weekly: 7 };
// A failed automatic backup is tried again after this, not on every check.
const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;
const HISTORY_PAGE_SIZE = 50;

const scheduleSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(Object.keys(INTERVAL_DAYS)),
  hour: z.number().int().min(0).max(23),
  keep: z.number().int().min(1).max(60),
}).strict();

function parseStored(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

// Keeps the database's message short and free of connection details.
function failureReason(error) {
  const cause = error?.cause?.message ?? error?.message ?? "Backup failed";
  return cause.includes("timed out") ? "mysqldump timed out" : cause.split(":")[0].slice(0, 500);
}

async function recordBackup({ backup, destination, trigger, actorId }) {
  const [result] = await db.execute(
    `INSERT INTO database_backups
       (file_name, destination, trigger_type, status, size_bytes, sha256, created_by)
     VALUES (?, ?, ?, 'DONE', ?, ?, ?)`,
    [backup.fileName, destination, trigger, backup.sizeBytes, backup.sha256, actorId ?? null],
  );
  return result.insertId;
}

async function recordFailure({ error, destination, trigger, actorId }) {
  await db.execute(
    `INSERT INTO database_backups (destination, trigger_type, status, error_message, created_by)
     VALUES (?, ?, 'FAILED', ?, ?)`,
    [destination, trigger, failureReason(error), actorId ?? null],
  );
}

async function getSchedule() {
  const [rows] = await db.query(
    "SELECT setting_value, version FROM ui_settings WHERE setting_key = ? AND is_active = 1 LIMIT 1",
    [SCHEDULE_KEY],
  );
  if (!rows[0]) throw new AppError("ERR_RECORD_NOT_FOUND", "The backup schedule is not set up. Run the database migrations.");
  return { value: parseStored(rows[0].setting_value), version: rows[0].version };
}

// startedAt marks when the current schedule began, so the first automatic
// backup waits for the chosen hour instead of running the moment it is
// switched on. It restarts whenever the schedule is turned on or changed.
async function updateSchedule(input, expectedVersion, actorId) {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("ERR_VALIDATION_FAILED", "Validation failed", {
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
    });
  }
  const current = (await getSchedule()).value;
  const schedule = parsed.data;
  const timingChanged = schedule.enabled !== current.enabled
    || schedule.frequency !== current.frequency
    || schedule.hour !== current.hour;
  const value = {
    ...schedule,
    startedAt: schedule.enabled && (timingChanged || !current.startedAt) ? new Date().toISOString() : current.startedAt ?? null,
  };

  const [result] = await db.execute(
    `UPDATE ui_settings SET setting_value = ?, version = version + 1, updated_by = ?
      WHERE setting_key = ? AND version = ? AND is_active = 1`,
    [JSON.stringify(value), actorId, SCHEDULE_KEY, expectedVersion],
  );
  if (result.affectedRows !== 1) {
    throw new AppError("ERR_CONFLICT", "The schedule changed elsewhere. Reload and try again.");
  }
  return { value, version: expectedVersion + 1 };
}

async function lastAutomaticAttempt() {
  const [rows] = await db.query(
    `SELECT status, createdAt FROM database_backups
      WHERE trigger_type = 'AUTOMATIC' ORDER BY createdAt DESC, id DESC LIMIT 1`,
  );
  return rows[0] ?? null;
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
    return new Date(new Date(lastAttempt.createdAt).getTime() + RETRY_AFTER_FAILURE_MS);
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
  const [rows] = await db.query(
    `SELECT id, file_name FROM database_backups
      WHERE trigger_type = 'AUTOMATIC' AND destination = 'SERVER' AND status = 'DONE' AND deletedAt IS NULL
      ORDER BY createdAt DESC, id DESC LIMIT 1000 OFFSET ?`,
    [keep],
  );
  for (const row of rows) {
    await removeServerCopy(row);
  }
  return rows.length;
}

async function removeServerCopy(row) {
  await backupService.removeBackup(path.join(backupService.backupPath, row.file_name));
  await db.execute("UPDATE database_backups SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND deletedAt IS NULL", [row.id]);
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
  logger.security("Automatic database backup created", { fileName: backup.fileName, sizeBytes: backup.sizeBytes, removed });
  return backup;
}

function healthOf(lastGood, lastAttempt, schedule) {
  if (!lastGood) return "NONE";
  if (lastAttempt?.status === "FAILED" && new Date(lastAttempt.createdAt) > new Date(lastGood.createdAt)) return "FAILED";
  const allowedDays = schedule.enabled ? INTERVAL_DAYS[schedule.frequency] + 1 : 7;
  const ageDays = (Date.now() - new Date(lastGood.createdAt).getTime()) / (24 * 60 * 60 * 1000);
  return ageDays > allowedDays ? "OVERDUE" : "OK";
}

const HISTORY_COLUMNS = `backup.id, backup.file_name, backup.destination, backup.trigger_type, backup.status,
  backup.size_bytes, backup.sha256, backup.error_message, backup.createdAt, backup.deletedAt,
  person.name AS created_by_name`;

async function listHistory({ where = "all", limit = 10 } = {}) {
  const filters = {
    all: "",
    server: "WHERE backup.destination = 'SERVER' AND backup.status = 'DONE' AND backup.deletedAt IS NULL",
    downloaded: "WHERE backup.destination = 'DOWNLOAD' AND backup.status = 'DONE'",
  };
  const condition = filters[where] ?? filters.all;
  const rowLimit = Math.min(Math.max(Number(limit) || 10, 1), HISTORY_PAGE_SIZE);

  const [rows] = await db.query(
    `SELECT ${HISTORY_COLUMNS}
       FROM database_backups backup
       LEFT JOIN admin person ON person.custom_id = backup.created_by
       ${condition}
      ORDER BY backup.createdAt DESC, backup.id DESC
      LIMIT ?`,
    [rowLimit],
  );
  const [[counts]] = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(destination = 'SERVER' AND status = 'DONE' AND deletedAt IS NULL), 0) AS kept_count,
            COALESCE(SUM(CASE WHEN destination = 'SERVER' AND status = 'DONE' AND deletedAt IS NULL THEN size_bytes END), 0) AS kept_bytes
       FROM database_backups`,
  );
  const [filtered] = condition
    ? (await db.query(`SELECT COUNT(*) AS total FROM database_backups backup ${condition}`))[0]
    : [counts];
  return { rows, total: Number(filtered.total), counts };
}

// Everything the page needs in one response: health, last good backup,
// schedule with its next run, and the first page of history.
async function getOverview(query) {
  const schedule = await getSchedule();
  const [[lastGood]] = await db.query(
    `SELECT ${HISTORY_COLUMNS}
       FROM database_backups backup
       LEFT JOIN admin person ON person.custom_id = backup.created_by
      WHERE backup.status = 'DONE'
      ORDER BY backup.createdAt DESC, backup.id DESC LIMIT 1`,
  );
  const [[lastAttempt]] = await db.query(
    "SELECT status, error_message, createdAt FROM database_backups ORDER BY createdAt DESC, id DESC LIMIT 1",
  );
  const history = await listHistory(query);
  const nextRun = nextAutomaticRun(schedule.value, await lastAutomaticAttempt());

  return {
    health: healthOf(lastGood, lastAttempt, schedule.value),
    lastBackup: lastGood ?? null,
    lastFailure: lastAttempt?.status === "FAILED" ? lastAttempt : null,
    schedule: { ...schedule, nextRunAt: nextRun ? nextRun.toISOString() : null },
    history: history.rows,
    total: history.total,
    keptCount: Number(history.counts.kept_count),
    keptBytes: Number(history.counts.kept_bytes),
  };
}

async function findServerCopy(backupId) {
  const [rows] = await db.query(
    `SELECT id, file_name, sha256 FROM database_backups
      WHERE id = ? AND destination = 'SERVER' AND status = 'DONE' AND deletedAt IS NULL LIMIT 1`,
    [backupId],
  );
  if (!rows[0]) throw new AppError("ERR_RECORD_NOT_FOUND", "This backup is no longer kept on the server.");
  return { ...rows[0], filePath: path.join(backupService.backupPath, rows[0].file_name) };
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
