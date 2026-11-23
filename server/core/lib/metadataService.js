const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");
const Model = require("../model/model");
const { SENSITIVE_COLUMNS } = require("../middleware/validateTable");
const { SENSITIVE_GENERIC_TABLES } = require("../config/lookupRegistry");

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Never a lookup source, whatever a lookup row says.
const BLOCKED_SOURCES = new Set([...SENSITIVE_GENERIC_TABLES, "user_activity_logs"]);

function requireIdentifier(value, label) {
  if (!IDENTIFIER.test(value ?? "")) {
    throw new AppError("ERR_INVALID_INPUT", `Invalid ${label}`);
  }
  return value;
}

// A described table: its settings, its fields in form order, and the
// lookups those fields use (with the field each lookup depends on).
async function getTableMetadata(table) {
  requireIdentifier(table, "table name");
  const [settings] = await new Model()
    .select(["table_name", "label", "singular_label", "description", "icon", "title_column",
      "default_sort", "search_columns", "form_layout", "form_columns", "sections", "version"],
    "metadata_tables")
    .where("table_name", "=", table)
    .where("enabled", "=", 1)
    .execute();
  if (!settings) {
    throw new AppError("ERR_NOT_FOUND", `Table ${table} is not described`);
  }

  const fields = await new Model()
    .select(["column_name", "col_real_name", "type", "form_visible", "list_visible", "editable",
      "disabled", "required", "section_key", "col_span", "config", "rank", "version"],
    "tables_metadata")
    .where("table_name", "=", table)
    .orderBy("rank", "ASC")
    .orderBy("id", "ASC")
    .execute();

  const lookupKeys = [...new Set(fields.map((field) => field.config?.lookup).filter(Boolean))];
  const lookups = lookupKeys.length
    ? await new Model()
      .select(["lookup_key", "depends_on"], "metadata_lookups")
      .whereIn("lookup_key", lookupKeys)
      .where("enabled", "=", 1)
      .execute()
    : [];

  return { table: settings, fields, lookups };
}

// The options of one lookup, built only from its server-side definition.
// A dependent lookup returns nothing until the parent value is given.
async function getLookupOptions(lookupKey, { parent, permissions = [], privileged = false } = {}) {
  requireIdentifier(lookupKey, "lookup key");
  const [lookup] = await new Model()
    .select(["lookup_key", "source_table", "value_column", "label_column", "extra_columns",
      "base_filters", "depends_on", "filter_column", "sort", "max_rows", "required_permission"],
    "metadata_lookups")
    .where("lookup_key", "=", lookupKey)
    .where("enabled", "=", 1)
    .execute();
  if (!lookup) {
    throw new AppError("ERR_NOT_FOUND", "Lookup not found");
  }
  if (lookup.required_permission && !privileged && !permissions.includes(lookup.required_permission)) {
    throw new AppError("ERR_ACCESS_DENIED", null, {
      message: `Missing lookup permission: ${lookup.required_permission}`,
      resource: lookupKey,
    });
  }
  if (BLOCKED_SOURCES.has(lookup.source_table)) {
    throw new AppError("ERR_ACCESS_DENIED", "This source is not available as a lookup");
  }
  if (lookup.depends_on && (parent === undefined || parent === null || parent === "")) {
    return [];
  }

  const model = new Model();
  if (!(await model.tableExists(lookup.source_table))) {
    throw new AppError("ERR_NOT_FOUND", `Lookup source ${lookup.source_table} was not found`);
  }
  const physicalColumns = await model.getTableColumns(lookup.source_table);
  const checkColumn = (column) => {
    if (!IDENTIFIER.test(column ?? "") || !physicalColumns.includes(column)
      || SENSITIVE_COLUMNS.has(column.toLowerCase())) {
      throw new AppError("ERR_INVALID_INPUT", `Lookup ${lookupKey} uses unavailable column ${column}`);
    }
    return column;
  };

  const extraColumns = (lookup.extra_columns ?? []).map(checkColumn);
  const columns = [...new Set([checkColumn(lookup.value_column), checkColumn(lookup.label_column), ...extraColumns])];
  const query = model.select(columns, lookup.source_table);
  for (const filter of lookup.base_filters ?? []) {
    query.where(checkColumn(filter.column), "=", filter.value);
  }
  if (lookup.depends_on) {
    query.where(checkColumn(lookup.filter_column), "=", String(parent));
  }
  for (const sort of lookup.sort ?? []) {
    query.orderBy(checkColumn(sort.column), sort.direction);
  }

  const rows = utils.redactSensitiveData(await query.limit(lookup.max_rows).execute());
  return rows.map((row) => ({
    value: row[lookup.value_column],
    label: row[lookup.label_column],
    ...Object.fromEntries(extraColumns.map((column) => [column, row[column]])),
  }));
}

module.exports = { getTableMetadata, getLookupOptions };
