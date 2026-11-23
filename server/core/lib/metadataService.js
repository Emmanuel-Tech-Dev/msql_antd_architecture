const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");
const Model = require("../model/model");
const { SENSITIVE_COLUMNS } = require("../middleware/validateTable");
const { SENSITIVE_GENERIC_TABLES } = require("../config/lookupRegistry");
const { v4: uuidv4 } = require("uuid");
const uploadServices = require("./uploadServices");

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
// lookups those fields use (with the field each lookup depends on). Fields
// the user may not see are left out; fields they may not change come back
// read-only.
async function getTableMetadata(table, access) {
  requireIdentifier(table, "table name");
  const [settings] = await new Model()
    .select(["table_name", "label", "singular_label", "description", "icon", "title_column",
      "default_sort", "search_columns", "form_layout", "form_columns", "sections", "stepper", "version"],
    "metadata_tables")
    .where("table_name", "=", table)
    .where("enabled", "=", 1)
    .execute();
  if (!settings) {
    throw new AppError("ERR_NOT_FOUND", `Table ${table} is not described`);
  }

  const described = await new Model()
    .select(["column_name", "col_real_name", "type", "form_visible", "list_visible", "editable",
      "disabled", "required", "section_key", "col_span", "config", "rank", "version"],
    "tables_metadata")
    .where("table_name", "=", table)
    .orderBy("rank", "ASC")
    .orderBy("id", "ASC")
    .execute();

  const fields = described
    .filter((field) => canReadField(field, access))
    .map((field) => (canWriteField(field, access) ? field : { ...field, disabled: 1 }));

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

// A lookup definition with its source checked: the table exists, is not a
// blocked source, and every column it names is real and not sensitive.
async function loadLookup(lookupKey) {
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
  return prepareLookup(lookup);
}

async function prepareLookup(lookup) {
  const lookupKey = lookup.lookup_key;
  requireIdentifier(lookup.source_table, "lookup source table");
  if (BLOCKED_SOURCES.has(lookup.source_table)) {
    throw new AppError("ERR_ACCESS_DENIED", "This source is not available as a lookup");
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
  return { lookup, model, checkColumn };
}

// The lookup's rows: its fixed filters, plus the parent value for a
// dependent lookup.
function filteredLookupQuery({ lookup, model, checkColumn }, columns, parent) {
  const query = model.select(columns, lookup.source_table);
  for (const filter of lookup.base_filters ?? []) {
    query.where(checkColumn(filter.column), "=", filter.value);
  }
  if (lookup.depends_on) {
    query.where(checkColumn(lookup.filter_column), "=", String(parent));
  }
  return query;
}

const isBlank = (value) => value === undefined || value === null || value === "";

// A field's config may guard it with permissions: readPermission to see it,
// writePermission (or, failing that, readPermission) to change it.
const holds = ({ permissions = [], privileged = false } = {}, permission) => !permission || privileged || permissions.includes(permission);
const canReadField = (field, access) => holds(access, field.config?.readPermission);
const canWriteField = (field, access) => holds(access, field.config?.writePermission ?? field.config?.readPermission);

// The options of one lookup, built only from its server-side definition.
// A dependent lookup returns nothing until the parent value is given.
async function getLookupOptions(lookupKey, { parent, permissions = [], privileged = false } = {}) {
  const source = await loadLookup(lookupKey);
  const { lookup, checkColumn } = source;
  if (lookup.required_permission && !privileged && !permissions.includes(lookup.required_permission)) {
    throw new AppError("ERR_ACCESS_DENIED", null, {
      message: `Missing lookup permission: ${lookup.required_permission}`,
      resource: lookupKey,
    });
  }
  if (lookup.depends_on && isBlank(parent)) return [];

  const extraColumns = (lookup.extra_columns ?? []).map(checkColumn);
  const columns = [...new Set([checkColumn(lookup.value_column), checkColumn(lookup.label_column), ...extraColumns])];
  const query = filteredLookupQuery(source, columns, parent);
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

// Runs a lookup definition that may not be saved yet (the builder's "Test
// it"), with the same checks as a saved one. A dependent lookup is tried
// with the given parent value.
async function previewLookup(lookup, { parent, limit = 20 } = {}) {
  const source = await prepareLookup({ ...lookup, lookup_key: lookup.lookup_key ?? "preview" });
  const { checkColumn } = source;
  const columns = [...new Set([checkColumn(lookup.value_column), checkColumn(lookup.label_column)])];
  const query = filteredLookupQuery(source, columns, lookup.depends_on ? parent : undefined);
  for (const sort of lookup.sort ?? []) query.orderBy(checkColumn(sort.column), sort.direction);
  const rows = await query.limit(Math.min(Number(limit) || 20, 100)).execute();
  return rows.map((row) => ({ value: row[lookup.value_column], label: row[lookup.label_column] }));
}

// The values a write names that the lookup does not offer (used by the
// server-side metadata checks). A dependent lookup is filtered by the
// record's own parent value. Only existence is revealed, so the lookup's
// read permission is not required.
async function findMissingLookupValues(lookupKey, values, record = {}) {
  const source = await loadLookup(lookupKey);
  const { lookup, checkColumn } = source;
  const parent = lookup.depends_on ? record[lookup.depends_on] : undefined;
  const wanted = [...new Set(values.map(String))];
  if (lookup.depends_on && isBlank(parent)) return wanted;

  const valueColumn = checkColumn(lookup.value_column);
  const rows = await filteredLookupQuery(source, [valueColumn], parent)
    .whereIn(valueColumn, wanted)
    .execute();
  const found = new Set(rows.map((row) => String(row[valueColumn])));
  return wanted.filter((value) => !found.has(value));
}

// What a file or image field accepts unless its config narrows it.
const UPLOAD_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  file: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
};

// Stores the file for one file or image field of a described table and
// returns where it is. Anyone who may create or update that table's records
// may upload for it; the field's metadata decides the accepted types and size,
// and the upload service checks the content really is that type.
async function uploadFieldFile(table, column, file, { permissions = [], privileged = false } = {}) {
  requireIdentifier(table, "table name");
  requireIdentifier(column, "column name");
  if (!privileged && !permissions.includes(`create:${table}`) && !permissions.includes(`update:${table}`)) {
    throw new AppError("ERR_ACCESS_DENIED", null, { message: `Missing create:${table} or update:${table}`, resource: table });
  }

  const [field] = await new Model()
    .select(["column_name", "col_real_name", "type", "disabled", "config"], "tables_metadata")
    .where("table_name", "=", table)
    .where("column_name", "=", column)
    .execute();
  if (!field || !UPLOAD_TYPES[field.type] || Number(field.disabled) === 1) {
    throw new AppError("ERR_NOT_FOUND", `${table}.${column} is not a file field`);
  }
  if (!canWriteField(field, { permissions, privileged })) {
    throw new AppError("ERR_ACCESS_DENIED", null, { message: `You can't change ${field.col_real_name || column}`, resource: table });
  }
  if (!file?.buffer) {
    throw new AppError("ERR_VALIDATION_FAILED", "Choose a file to upload");
  }

  const label = field.col_real_name || column;
  const maxSizeMb = Number(field.config?.maxSizeMb) || 10;
  if (file.size > maxSizeMb * 1024 * 1024) {
    throw new AppError("ERR_VALIDATION_FAILED", `${label} must be at most ${maxSizeMb} MB`);
  }
  const accepted = Array.isArray(field.config?.accept)
    ? field.config.accept.filter((type) => UPLOAD_TYPES[field.type].includes(type))
    : UPLOAD_TYPES[field.type];

  const stored = await uploadServices.uploadDocument(file, {
    folder: `metadata/${table}`,
    publicId: `${column}-${uuidv4()}`,
    allowedTypes: accepted,
  });
  return { ...stored, name: file.originalname };
}

module.exports = {
  canReadField, canWriteField, getTableMetadata, getLookupOptions, findMissingLookupValues, previewLookup, uploadFieldFile,
};
