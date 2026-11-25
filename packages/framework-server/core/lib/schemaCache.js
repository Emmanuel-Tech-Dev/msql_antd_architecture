// What every generic request needs to know about its table, read once and
// kept for a few minutes instead of being queried on every request: whether
// the table exists, its columns and primary key (one information_schema
// query), and its metadata fields. The builder clears a table's metadata the
// moment a new version is saved; a schema change made by a migration shows
// within FIVE_MINUTES, or at once after a server restart.

const CacheManager = require("../../shared/helpers/cacheManager");
const Model = require("../model/model");

const FIVE_MINUTES = 5 * 60 * 1000;
const schemas = new CacheManager({ maxItems: 500 });
const describedFields = new CacheManager({ maxItems: 500 });

async function readTableSchema(table) {
  const rows = await new Model()
    .select(["COLUMN_NAME", "COLUMN_KEY"], "information_schema.columns")
    .whereColumns("table_schema", "=", "DATABASE()")
    .where("table_name", "=", table)
    .orderBy("ORDINAL_POSITION", "ASC")
    .execute();
  return {
    exists: rows.length > 0,
    columns: rows.map((row) => row.COLUMN_NAME),
    primaryKey: rows.find((row) => row.COLUMN_KEY === "PRI")?.COLUMN_NAME ?? null,
  };
}

// { exists, columns, primaryKey } for one table of the current database.
const tableSchema = (table) => schemas.remember(table, () => readTableSchema(table), { maxAge: FIVE_MINUTES });

// A described table's field rows, or null when it is not described.
const cachedDescribedFields = (table, load) => describedFields.remember(table, load, { maxAge: FIVE_MINUTES });

// After the builder saves a table's metadata (or when the schema changes).
function clearTableCache(table) {
  if (table) {
    schemas.delete(table);
    describedFields.delete(table);
    return;
  }
  schemas.clear();
  describedFields.clear();
}

module.exports = { cachedDescribedFields, clearTableCache, tableSchema };
