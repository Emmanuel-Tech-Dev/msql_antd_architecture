// Keeps storage in step with metadata file and image fields. A field stores
// only the file's URL; metadata_uploads remembers where each upload came from,
// so a replaced, cleared or abandoned file can be deleted from Cloudinary.

const Model = require("../model/model");
const logger = require("../../shared/helpers/logger");
const uploadServices = require("./uploadServices");

const UPLOAD_FIELD_TYPES = ["file", "image"];
const PENDING_HOURS = 24;
const MAX_ATTEMPTS = 5;
const PURGE_BATCH = 100;

async function recordUpload({ table, column, stored, mimetype, actorId }) {
  await new Model()
    .insert("metadata_uploads", {
      table_name: table,
      column_name: column,
      url: stored.url,
      public_id: stored.public_id,
      mimetype,
      size_bytes: stored.size ?? null,
      uploaded_by: actorId ?? null,
    })
    .execute();
}

async function fileColumnsOf(table) {
  const rows = await new Model()
    .select(["column_name"], "tables_metadata")
    .where("table_name", "=", table)
    .whereIn("type", UPLOAD_FIELD_TYPES)
    .execute();
  return rows.map((row) => row.column_name);
}

// The files a save keeps and the ones it lets go. A column the save does not
// write is left as it is.
function fileChanges(columns, before = {}, after = {}) {
  const keep = [];
  const release = [];
  for (const column of columns) {
    if (!Object.hasOwn(after, column)) continue;
    const next = after[column] || null;
    const previous = before?.[column] || null;
    if (next) keep.push({ column, url: next });
    if (previous && previous !== next) release.push({ column, url: previous });
  }
  return { keep, release };
}

// After a record is saved: its files are attached to it, and files it no
// longer uses are queued and deleted. A failure here never undoes the save;
// the hourly purge retries.
async function syncRecordFiles(table, recordId, before, after) {
  try {
    const columns = await fileColumnsOf(table);
    if (!columns.length) return;
    const { keep, release } = fileChanges(columns, before, after);
    for (const file of keep) {
      await new Model()
        .update("metadata_uploads", { status: "ATTACHED", record_id: recordId == null ? null : String(recordId) })
        .where("table_name", "=", table)
        .where("column_name", "=", file.column)
        .where("url", "=", file.url)
        .whereIn("status", ["PENDING", "ATTACHED"])
        .execute();
    }
    await releaseFiles(table, release);
  } catch (error) {
    logger.error(error, { context: "Upload tracking after save", table });
  }
}

// After a record is deleted: every file it held is released.
async function releaseRecordFiles(table, record) {
  try {
    const columns = await fileColumnsOf(table);
    const files = columns.filter((column) => record?.[column]).map((column) => ({ column, url: record[column] }));
    await releaseFiles(table, files);
  } catch (error) {
    logger.error(error, { context: "Upload tracking after delete", table });
  }
}

async function releaseFiles(table, files) {
  if (!files.length) return;
  for (const file of files) {
    await new Model()
      .update("metadata_uploads", { status: "REMOVED" })
      .where("table_name", "=", table)
      .where("column_name", "=", file.column)
      .where("url", "=", file.url)
      .whereIn("status", ["PENDING", "ATTACHED"])
      .execute();
  }
  const queued = await new Model()
    .select(["id", "table_name", "column_name", "url", "public_id", "mimetype", "attempts"], "metadata_uploads")
    .where("table_name", "=", table)
    .whereIn("url", files.map((file) => file.url))
    .where("status", "=", "REMOVED")
    .execute();
  for (const upload of queued) await deleteUpload(upload);
}

// A file another record still points at (a copied record, or a save made
// outside the generic API) is kept and counted as attached.
async function stillReferenced(upload) {
  const [row] = await new Model()
    .select([upload.column_name], upload.table_name)
    .where(upload.column_name, "=", upload.url)
    .limit(1)
    .execute();
  return Boolean(row);
}

async function deleteUpload(upload) {
  try {
    if (await stillReferenced(upload)) {
      await new Model().update("metadata_uploads", { status: "ATTACHED" }).where("id", "=", upload.id).execute();
      return "kept";
    }
    await uploadServices.deleteDocument({ publicId: upload.public_id, mimetype: upload.mimetype });
    await new Model()
      .update("metadata_uploads", { status: "DELETED", deletedAt: new Date(), last_error: null })
      .where("id", "=", upload.id)
      .execute();
    return "deleted";
  } catch (error) {
    await new Model()
      .update("metadata_uploads", { status: "REMOVED", attempts: Number(upload.attempts ?? 0) + 1, last_error: String(error?.message ?? error).slice(0, 500) })
      .where("id", "=", upload.id)
      .execute();
    logger.error(error, { context: "Deleting a stored upload", uploadId: upload.id });
    return "failed";
  }
}

// Runs hourly: uploads never saved with a record after 24 hours, and
// released files whose deletion failed earlier.
async function purgeUploads(now = new Date()) {
  const columns = ["id", "table_name", "column_name", "url", "public_id", "mimetype", "attempts"];
  const cutoff = new Date(now.getTime() - PENDING_HOURS * 60 * 60 * 1000);
  const abandoned = await new Model()
    .select(columns, "metadata_uploads")
    .where("status", "=", "PENDING")
    .where("createdAt", "<", cutoff)
    .where("attempts", "<", MAX_ATTEMPTS)
    .limit(PURGE_BATCH)
    .execute();
  const released = await new Model()
    .select(columns, "metadata_uploads")
    .where("status", "=", "REMOVED")
    .where("attempts", "<", MAX_ATTEMPTS)
    .limit(PURGE_BATCH)
    .execute();

  const outcome = { deleted: 0, kept: 0, failed: 0 };
  for (const upload of [...abandoned, ...released]) outcome[await deleteUpload(upload)] += 1;
  if (outcome.deleted || outcome.failed) logger.app("Upload clean-up", outcome);
  return outcome;
}

module.exports = { fileChanges, purgeUploads, recordUpload, releaseRecordFiles, syncRecordFiles, PENDING_HOURS };
