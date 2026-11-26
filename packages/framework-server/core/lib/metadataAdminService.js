const AppError = require("../../shared/helpers/AppError");
const logger = require("../../shared/helpers/logger");
const Model = require("../model/model");
const utils = require("../../shared/utils/functions");
const { SENSITIVE_COLUMNS, SENSITIVE_TABLES } = require("../config/sensitiveData");
const { previewLookup } = require("./metadataService");
const { validateRecordAgainstMetadata } = require("./metadataSchema");
const { upgradeLegacyField } = require("./legacyDynamicForm");
const { clearTableCache } = require("./schemaCache");
const {
  checkField, definitionMigration, describeChanges, guessField, newTableMigration,
} = require("./metadataScaffold");

// The metadata builder (Settings › Data model). Only reachable with
// manage:metadata (migration 025). It describes tables; it never changes the
// database schema: a new table becomes a migration file instead.

// Tables the builder never lists or describes: credentials, logs, and the
// framework's own registries.
const HIDDEN_TABLES = new Set([
  ...SENSITIVE_TABLES, "user_activity_logs", "tables_metadata", "metadata_tables", "metadata_lookups",
  "metadata_versions", "framework_schema_migrations",
]);
const isHidden = (table) => HIDDEN_TABLES.has(table) || table.startsWith("framework_");
const schemaName = () => process.env.DATABASE_NAME;

const TABLE_SETTINGS = ["label", "singular_label", "description", "icon", "title_column", "default_sort", "search_columns",
  "form_layout", "form_columns", "sections", "stepper", "enabled", "is_system"];
const FIELD_SETTINGS = ["col_real_name", "type", "form_visible", "list_visible", "editable", "disabled", "required",
  "section_key", "col_span", "config", "rank"];
const LOOKUP_SETTINGS = ["source_table", "value_column", "label_column", "extra_columns", "base_filters", "depends_on",
  "filter_column", "sort", "max_rows", "required_permission", "description", "enabled"];
const JSON_SETTINGS = new Set(["default_sort", "search_columns", "sections", "stepper", "config", "extra_columns", "base_filters", "sort"]);

const toStored = (record, keys) => Object.fromEntries(keys
  .filter((key) => Object.hasOwn(record, key))
  .map((key) => [key, JSON_SETTINGS.has(key) && record[key] !== null && record[key] !== undefined ? JSON.stringify(record[key]) : record[key]]));

function describableTable(table) {
  utils.requireIdentifier(table, "table name");
  if (isHidden(table)) throw new AppError("ERR_ACCESS_DENIED", `${table} cannot be described`);
  return table;
}

async function physicalColumns(table) {
  return new Model()
    .select(["COLUMN_NAME", "DATA_TYPE", "COLUMN_TYPE", "IS_NULLABLE", "COLUMN_KEY", "COLUMN_DEFAULT", "EXTRA"], "information_schema.COLUMNS")
    .where("TABLE_SCHEMA", "=", schemaName())
    .where("TABLE_NAME", "=", table)
    .orderBy("ORDINAL_POSITION", "ASC")
    .execute();
}

// Every table the builder may describe, with whether it is described.
async function listTables() {
  const [tables, columnCounts, described, fieldCounts] = await Promise.all([
    new Model().select(["TABLE_NAME"], "information_schema.TABLES")
      .where("TABLE_SCHEMA", "=", schemaName()).where("TABLE_TYPE", "=", "BASE TABLE").orderBy("TABLE_NAME", "ASC").execute(),
    new Model().select(["TABLE_NAME", "COUNT(*) AS columns"], "information_schema.COLUMNS")
      .where("TABLE_SCHEMA", "=", schemaName()).groupBy("TABLE_NAME").execute(),
    new Model().select(["table_name", "label", "enabled", "is_system", "form_layout", "form_columns", "stepper", "sections", "version", "updatedAt"], "metadata_tables").execute(),
    new Model().select(["table_name", "COUNT(*) AS fields"], "tables_metadata").groupBy("table_name").execute(),
  ]);
  const columnsOf = new Map(columnCounts.map((row) => [row.TABLE_NAME, Number(row.columns)]));
  const settingsOf = new Map(described.map((row) => [row.table_name, row]));
  const fieldsOf = new Map(fieldCounts.map((row) => [row.table_name, Number(row.fields)]));

  return tables.map((row) => row.TABLE_NAME).filter((table) => !isHidden(table)).map((table) => {
    const settings = settingsOf.get(table);
    return {
      table,
      label: settings?.label ?? utils.humanize(table),
      described: Boolean(settings),
      enabled: settings ? Number(settings.enabled) === 1 : false,
      system: settings ? Number(settings.is_system) === 1 : false,
      columns: columnsOf.get(table) ?? 0,
      fields: fieldsOf.get(table) ?? 0,
      form: settings ? { layout: settings.form_layout, columns: Number(settings.form_columns), stepper: Boolean(settings.stepper), sections: settings.sections?.length ?? 0 } : null,
      version: settings?.version ?? null,
      updatedAt: settings?.updatedAt ?? null,
    };
  });
}

// Fields guessed from a table's columns, for "Describe this table".
async function scaffoldTable(table) {
  describableTable(table);
  const [columns, foreignKeys, existingLookups] = await Promise.all([
    physicalColumns(table),
    new Model().select(["COLUMN_NAME", "REFERENCED_TABLE_NAME", "REFERENCED_COLUMN_NAME"], "information_schema.KEY_COLUMN_USAGE")
      .where("TABLE_SCHEMA", "=", schemaName()).where("TABLE_NAME", "=", table).whereNotNull("REFERENCED_TABLE_NAME").execute(),
    new Model().select(["lookup_key", "source_table", "value_column"], "metadata_lookups").execute(),
  ]);
  if (!columns.length) throw new AppError("ERR_NOT_FOUND", `Table ${table} was not found`);
  const referenceOf = new Map(foreignKeys.map((key) => [key.COLUMN_NAME, key]));

  const fields = [];
  const lookups = [];
  for (const column of columns) {
    if (SENSITIVE_COLUMNS.has(column.COLUMN_NAME.toLowerCase())) continue;
    const { field, lookupSuggestion } = guessField({ ...column, ...referenceOf.get(column.COLUMN_NAME) }, { existingLookups });
    fields.push({ ...field, rank: fields.length + 1, dbType: column.COLUMN_TYPE });
    if (lookupSuggestion && !lookups.some((lookup) => lookup.lookup_key === lookupSuggestion.lookup_key)) lookups.push(lookupSuggestion);
  }
  const titleColumn = fields.find((field) => /name|title|label/.test(field.column_name) && field.type === "text")?.column_name ?? null;
  const label = utils.humanize(table);
  return {
    table: { table_name: table, label, singular_label: label.replace(/s$/, ""), title_column: titleColumn, form_layout: "modal", form_columns: 1, sections: [], stepper: null, enabled: 1 },
    fields,
    lookups,
  };
}

// A described table's settings and every field row (shown or not).
async function getDefinition(table) {
  describableTable(table);
  const [settings] = await new Model().select(["table_name", ...TABLE_SETTINGS, "version", "updatedAt"], "metadata_tables")
    .where("table_name", "=", table).execute();
  if (!settings) throw new AppError("ERR_NOT_FOUND", `${table} is not described`);
  const rows = await new Model().select(["column_name", ...FIELD_SETTINGS, "options", "version"], "tables_metadata")
    .where("table_name", "=", table).orderBy("rank", "ASC").orderBy("id", "ASC").execute();
  // Old dynaForm fields open as list / groupList, so saving once converts them.
  const fields = rows.map((row) => {
    const { options: _legacyOptions, ...field } = upgradeLegacyField(row);
    return field;
  });
  return { table: settings, fields };
}

async function currentDefinition(table) {
  try {
    return await getDefinition(table);
  } catch (error) {
    if (error.errorCode === "ERR_NOT_FOUND") return null;
    throw error;
  }
}

// Saves a whole definition as the table's next version: settings, every
// field (fields left out are removed), and any new lookups, in one
// transaction, with the version kept for comparing and restoring.
async function saveDefinition(table, definition, { actorUserId, note } = {}) {
  describableTable(table);
  const columns = (await physicalColumns(table)).map((column) => column.COLUMN_NAME);
  if (!columns.length) throw new AppError("ERR_NOT_FOUND", `Table ${table} was not found`);
  const fields = (definition.fields ?? []).map((field, index) => ({ ...field, rank: index + 1 }));
  if (!fields.length) throw new AppError("ERR_VALIDATION_FAILED", "Describe at least one field");
  fields.forEach((field) => checkField(field, columns));
  for (const lookup of definition.lookups ?? []) await previewLookup(lookup, { parent: "__check__", limit: 1 });

  const before = await currentDefinition(table);
  const version = Number(before?.table?.version ?? 0) + 1;
  const settings = { ...definition.table, table_name: table, version };
  const changes = describeChanges(before, { table: settings, fields });
  if (note) changes.unshift({ scope: "note", subject: "note", change: note });

  await new Model().transaction(async (tx) => {
    const tableRow = { table_name: table, ...toStored(settings, TABLE_SETTINGS), version, updated_by: actorUserId ?? null };
    await tx.builder().insert("metadata_tables", tableRow)
      .onDuplicateKeyUpdate(Object.fromEntries(Object.entries(tableRow).filter(([key]) => key !== "table_name")))
      .executeInTransaction();

    const kept = fields.map((field) => field.column_name);
    await tx.builder().delete("tables_metadata").where("table_name", "=", table).whereNotIn("column_name", kept).executeInTransaction();
    for (const field of fields) {
      const fieldRow = { table_name: table, column_name: field.column_name, ...toStored(field, FIELD_SETTINGS), version };
      await tx.builder().insert("tables_metadata", fieldRow)
        .onDuplicateKeyUpdate(Object.fromEntries(Object.entries(fieldRow).filter(([key]) => !["table_name", "column_name"].includes(key))))
        .executeInTransaction();
    }
    for (const lookup of definition.lookups ?? []) {
      await tx.builder().insert("metadata_lookups", { lookup_key: utils.requireIdentifier(lookup.lookup_key, "lookup key"), ...toStored(lookup, LOOKUP_SETTINGS) })
        .onDuplicateKeyUpdate({ lookup_key: lookup.lookup_key })
        .executeInTransaction();
    }
    await tx.builder().insert("metadata_versions", {
      table_name: table,
      version,
      definition: JSON.stringify({ table: settings, fields }),
      changes: JSON.stringify(changes),
      changed_by: actorUserId ?? null,
    }).executeInTransaction();
  });

  clearTableCache(table);
  logger.security("Metadata saved", { actorUserId, table, version, changes: changes.length });
  return { version, changes };
}

async function listVersions(table) {
  describableTable(table);
  return new Model().select(["version", "changes", "changed_by", "createdAt"], "metadata_versions")
    .where("table_name", "=", table).orderBy("version", "DESC").limit(50).execute();
}

// Restoring saves the old definition again as a new version, so nothing in
// the history is lost.
async function restoreVersion(table, version, { actorUserId } = {}) {
  describableTable(table);
  const [saved] = await new Model().select(["definition"], "metadata_versions")
    .where("table_name", "=", table).where("version", "=", Number(version)).execute();
  if (!saved) throw new AppError("ERR_NOT_FOUND", `Version ${version} of ${table} was not found`);
  return saveDefinition(table, saved.definition, { actorUserId, note: `Restored version ${version}` });
}

async function exportDefinition(table) {
  const definition = await getDefinition(table);
  const keys = [...new Set(definition.fields.map((field) => field.config?.lookup).filter(Boolean))];
  const lookups = keys.length
    ? await new Model().select(["lookup_key", ...LOOKUP_SETTINGS], "metadata_lookups").whereIn("lookup_key", keys).execute()
    : [];
  return { definition, lookups, migration: definitionMigration(definition, { lookups }) };
}

async function listLookups() {
  const [lookups, usage] = await Promise.all([
    new Model().select(["lookup_key", ...LOOKUP_SETTINGS, "version"], "metadata_lookups").orderBy("lookup_key", "ASC").execute(),
    new Model().select(["table_name", "column_name", "col_real_name", "config"], "tables_metadata").whereIn("type", ["lookup", "multiLookup"]).execute(),
  ]);
  return lookups.map((lookup) => ({
    ...lookup,
    usedBy: usage.filter((field) => field.config?.lookup === lookup.lookup_key)
      .map((field) => ({ table: field.table_name, column: field.column_name, label: field.col_real_name })),
  }));
}

async function saveLookup(lookupKey, lookup, { actorUserId } = {}) {
  utils.requireIdentifier(lookupKey, "lookup key");
  await previewLookup({ ...lookup, lookup_key: lookupKey }, { parent: "__check__", limit: 1 });
  const row = { lookup_key: lookupKey, ...toStored(lookup, LOOKUP_SETTINGS), updated_by: actorUserId ?? null };
  await new Model().insert("metadata_lookups", row)
    .onDuplicateKeyUpdate(Object.fromEntries(Object.entries(row).filter(([key]) => key !== "lookup_key")))
    .execute();
  logger.security("Lookup saved", { actorUserId, lookupKey });
  return { lookup_key: lookupKey };
}

// The next free migration number and a file name for a downloaded migration.
// The permissions a field can be guarded with (who can see or change it).
async function listPermissions() {
  return new Model().select(["permission_name", "description"], "admin_permissions").orderBy("permission_name", "ASC").execute();
}

async function newTableSql(spec) {
  describableTable(spec.table);
  const [existing] = await new Model().select(["TABLE_NAME"], "information_schema.TABLES")
    .where("TABLE_SCHEMA", "=", schemaName()).where("TABLE_NAME", "=", spec.table).execute();
  if (existing) throw new AppError("ERR_VALIDATION_FAILED", `A table named ${spec.table} already exists`);
  return newTableMigration(spec);
}

// Rows from a CSV, checked as if each were added through the table's form,
// plus values its unique columns already hold (in the table or the file).
async function checkRecords(table, rows, access) {
  describableTable(table);
  if (!Array.isArray(rows) || !rows.length) throw new AppError("ERR_VALIDATION_FAILED", "The file has no rows");
  if (rows.length > 5000) throw new AppError("ERR_VALIDATION_FAILED", "Import at most 5,000 rows at a time");

  const results = [];
  for (const row of rows) results.push(await validateRecordAgainstMetadata(table, row, { mode: "create", access }));

  const model = new Model();
  const labels = Object.fromEntries((await new Model().select(["column_name", "col_real_name"], "tables_metadata")
    .where("table_name", "=", table).execute()).map((field) => [field.column_name, field.col_real_name || field.column_name]));
  for (const column of await model.getUniqueColumns(table)) {
    const values = [...new Set(results.map((result) => result.record[column]).filter((value) => value !== undefined && value !== null && value !== ""))];
    if (!values.length) continue;
    const taken = new Set((await new Model().select([column], table).whereIn(column, values).execute()).map((row) => String(row[column])));
    const seen = new Set();
    for (const result of results) {
      const value = result.record[column];
      if (value === undefined || value === null || value === "") continue;
      if (taken.has(String(value)) || seen.has(String(value))) {
        result.errors[column] ??= `A record with this ${String(labels[column] ?? column).toLowerCase()} already exists`;
      }
      seen.add(String(value));
    }
  }
  return results.map((result, index) => ({ row: index + 1, record: result.record, errors: result.errors }));
}

// Inserts the checked rows in one transaction: the ready ones, or none at all
// when any row has a problem and skipProblems is off.
async function importRecords(table, rows, { skipProblems = true, actorUserId, access } = {}) {
  const checked = await checkRecords(table, rows, access);
  const problems = checked.filter((result) => Object.keys(result.errors).length);
  if (problems.length && !skipProblems) {
    throw new AppError("ERR_VALIDATION_FAILED", `${problems.length} rows have problems; nothing was imported`);
  }
  const ready = checked.filter((result) => !Object.keys(result.errors).length).map((result) => result.record);
  // Rows are inserted in groups with the same columns, so a column a row
  // leaves out keeps its database default.
  const groups = new Map();
  for (const record of ready) {
    const columns = Object.keys(record).sort().join(",");
    groups.set(columns, [...(groups.get(columns) ?? []), record]);
  }
  await new Model().transaction(async (tx) => {
    for (const records of groups.values()) {
      for (let start = 0; start < records.length; start += 500) {
        await tx.builder().bulkInsert(table, records.slice(start, start + 500)).executeInTransaction();
      }
    }
  });
  logger.security("Records imported", { actorUserId, table, imported: ready.length, skipped: problems.length });
  return { imported: ready.length, skipped: problems.length };
}

module.exports = {
  checkRecords,
  exportDefinition,
  getDefinition,
  importRecords,
  listLookups,
  listPermissions,
  listTables,
  listVersions,
  newTableSql,
  restoreVersion,
  saveDefinition,
  saveLookup,
  scaffoldTable,
};
