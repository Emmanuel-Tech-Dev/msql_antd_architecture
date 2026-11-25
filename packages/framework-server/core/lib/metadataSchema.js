const { z } = require("zod");
const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");
const Model = require("../model/model");
const { canReadField, canWriteField, findMissingLookupValues } = require("./metadataService");
const { upgradeLegacyField } = require("./legacyDynamicForm");
const { cachedDescribedFields } = require("./schemaCache");

// Server-side enforcement of a described table's metadata (metadata upgrade
// phase 3). A table is described when metadata_tables has an enabled row for
// it; generic writes to it are checked here, and other tables behave as
// before. Hand-written routes can reuse metadataSchema() and extend it.

const TEXT_TYPES = new Set(["text", "textarea", "richText", "password", "phone", "url", "generatedId", "file", "image", "color", "icon"]);
const NUMBER_TYPES = new Set(["number", "integer", "money", "percent", "duration"]);
const CHOICE_TYPES = new Set(["select", "radio"]);
const MULTI_CHOICE_TYPES = new Set(["multiSelect", "checkboxGroup"]);
const DATE_TYPES = new Set(["date", "dateTime"]);
const LIST_TYPES = new Set(["list", "groupList"]);
// What a row of a list or groupList cannot hold (in this version).
const NOT_IN_ROWS = new Set(["list", "groupList", "file", "image", "primaryKey", "generatedId", "password"]);

const text = z.union([z.string(), z.number()]).transform(String);
const list = z.union([z.array(text), text])
  .transform((value) => (Array.isArray(value) ? value : value.split(",")).map((item) => item.trim()).filter(Boolean));

// Cached per table; the builder clears it when it saves a new version.
function loadDescribedFields(table) {
  return cachedDescribedFields(table, () => readDescribedFields(table));
}

async function readDescribedFields(table) {
  const [described] = await new Model()
    .select(["table_name"], "metadata_tables")
    .where("table_name", "=", table)
    .where("enabled", "=", 1)
    .execute();
  if (!described) return null;

  const fields = await new Model()
    .select(["column_name", "col_real_name", "type", "form_visible", "editable", "disabled", "required", "config", "options"], "tables_metadata")
    .where("table_name", "=", table)
    .execute();
  return fields.map(upgradeLegacyField);
}

// Primary keys and disabled fields are never written; a field that is not
// editable can be set when a record is created but not changed afterwards.
// `access` (the user's permissions) marks a user's request: it also may not
// set fields hidden from the form or guarded by a permission it lacks.
// Server code that passes no access may set those.
function isWritable(field, mode, access) {
  if (field.type === "primaryKey" || Number(field.disabled) === 1) return false;
  if (access && (Number(field.form_visible) === 0 || !canWriteField(field, access))) return false;
  return mode === "create" || Number(field.editable) !== 0;
}

// A user who sends a field they may not change is told so, not ignored.
function forbiddenErrors(fields, record, access) {
  if (!access) return {};
  return Object.fromEntries(fields
    .filter((field) => Object.hasOwn(record, field.column_name) && !canWriteField(field, access))
    .map((field) => [field.column_name, `You can't change ${field.col_real_name || field.column_name}`]));
}

// Columns of a described table the user may not read; the generic API
// leaves them out of records, filters and search.
async function unreadableColumns(table, access) {
  const fields = await loadDescribedFields(table);
  return (fields ?? []).filter((field) => !canReadField(field, access)).map((field) => field.column_name);
}

function withRules(schema, field) {
  const config = field.config ?? {};
  const label = field.col_real_name || field.column_name;
  let checked = schema;
  if (config.min !== undefined) {
    checked = checked.refine((value) => value >= config.min, `${label} must be at least ${config.min}`);
  }
  if (config.max !== undefined) {
    checked = checked.refine((value) => value <= config.max, `${label} must be at most ${config.max}`);
  }
  for (const rule of config.rules ?? []) {
    const message = rule.message;
    if (rule.rule === "pattern") {
      const pattern = new RegExp(rule.value);
      checked = checked.refine((value) => pattern.test(String(value)), message ?? `${label} is not in the expected format`);
    } else if (rule.rule === "minLength") {
      checked = checked.refine((value) => String(value).length >= rule.value, message ?? `${label} needs at least ${rule.value} characters`);
    } else if (rule.rule === "maxLength") {
      checked = checked.refine((value) => String(value).length <= rule.value, message ?? `${label} allows at most ${rule.value} characters`);
    } else if (rule.rule === "min") {
      checked = checked.refine((value) => Number(value) >= rule.value, message ?? `${label} must be at least ${rule.value}`);
    } else if (rule.rule === "max") {
      checked = checked.refine((value) => Number(value) <= rule.value, message ?? `${label} must be at most ${rule.value}`);
    }
  }
  return checked;
}

// The check for a non-empty value of one field, by type.
function valueSchema(field) {
  const label = field.col_real_name || field.column_name;
  const optionValues = (field.config?.options ?? []).map((option) => String(option.value));
  const { type } = field;

  if (NUMBER_TYPES.has(type)) {
    const number = z.coerce.number({ message: `${label} must be a number` })
      .refine(Number.isFinite, `${label} must be a number`);
    return withRules(type === "integer"
      ? number.refine(Number.isInteger, `${label} must be a whole number`)
      : number, field);
  }
  if (type === "email") {
    return withRules(text.pipe(z.string().trim().email(`${label} must be a valid email address`)), field);
  }
  if (CHOICE_TYPES.has(type)) {
    return text.refine((value) => optionValues.includes(value), `${label} must be one of the listed options`);
  }
  if (MULTI_CHOICE_TYPES.has(type)) {
    return list
      .refine((values) => values.every((value) => optionValues.includes(value)), `${label} must use the listed options`)
      .transform((values) => values.join(","));
  }
  if (type === "multiLookup") {
    return list.transform((values) => values.join(","));
  }
  if (type === "switch") {
    return z.union([z.boolean(), z.literal(0), z.literal(1), z.literal("0"), z.literal("1")])
      .transform((value) => (value === true || value === 1 || value === "1" ? 1 : 0));
  }
  if (DATE_TYPES.has(type)) {
    return text.refine((value) => !Number.isNaN(Date.parse(value)), `${label} must be a valid date`);
  }
  if (type === "time") {
    return text.refine((value) => /^\d{2}:\d{2}(:\d{2})?$/.test(value), `${label} must be a time (HH:MM)`);
  }
  if (TEXT_TYPES.has(type) || type === "lookup") {
    return withRules(text, field);
  }
  if (LIST_TYPES.has(type)) {
    return listSchema(field);
  }
  return z.any();
}

const rowFieldsOf = (fields) => (Array.isArray(fields) ? fields : [])
  .filter((field) => field?.column_name && !NOT_IN_ROWS.has(field.type));

function parseRows(value) {
  const rows = utils.parseJson(value, null);
  return Array.isArray(rows) ? rows : null;
}

// Each row against its fields, with the same checks as a whole record.
// Messages name the row: "Contacts, row 2: Phone is required". Conditions
// read the row's own values; keys that are not row fields are dropped.
function checkRows(fields, rows, where, issues) {
  return rows.map((row, index) => {
    const place = `${where} ${index + 1}`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      issues.push(`${place} is not valid`);
      return {};
    }
    const cleaned = {};
    for (const field of fields) {
      const column = field.column_name;
      const value = row[column];
      if (!conditionMet(field.config?.visibleWhen, row)) continue;
      if (utils.isBlank(value)) {
        if (isRequired(field, row)) issues.push(`${place}: ${field.col_real_name || column} is required`);
        cleaned[column] = null;
        continue;
      }
      const result = valueSchema(field).safeParse(value);
      if (result.success) cleaned[column] = result.data;
      else issues.push(`${place}: ${result.error.issues[0].message}`);
    }
    return cleaned;
  });
}

function rowCountIssues(config, count, label, unit, issues) {
  if (config.minRows !== undefined && count < config.minRows) issues.push(`${label} needs at least ${config.minRows} ${unit}${config.minRows === 1 ? "" : "s"}`);
  if (config.maxRows !== undefined && count > config.maxRows) issues.push(`${label} allows at most ${config.maxRows} ${unit}${config.maxRows === 1 ? "" : "s"}`);
}

// A list (rows) or groupList (groups, each with an inner list), stored as JSON.
function listSchema(field) {
  const label = field.col_real_name || field.column_name;
  const config = field.config ?? {};
  const unit = field.type === "groupList" ? "group" : "row";
  const countUnit = (config.rowLabel ?? unit).toLowerCase();
  return z.any().transform((value, ctx) => {
    const rows = parseRows(value);
    if (!rows) {
      ctx.addIssue({ code: "custom", message: `${label} must be a list` });
      return z.NEVER;
    }
    const issues = [];
    rowCountIssues(config, rows.length, label, countUnit, issues);
    let cleaned = checkRows(rowFieldsOf(config.fields), rows, `${label}, ${unit}`, issues);
    if (field.type === "groupList") {
      const children = config.children ?? {};
      const key = children.key || "list";
      const childLabel = children.label || "Items";
      cleaned = cleaned.map((group, index) => {
        const items = parseRows(rows[index]?.[key]) ?? [];
        rowCountIssues(children, items.length, `${label}, group ${index + 1}, ${childLabel}`, (children.rowLabel ?? "row").toLowerCase(), issues);
        return { ...group, [key]: checkRows(rowFieldsOf(children.fields), items, `${label}, group ${index + 1}, ${childLabel} row`, issues) };
      });
    }
    if (issues.length) {
      ctx.addIssue({ code: "custom", message: issues.slice(0, 3).join("; ") + (issues.length > 3 ? ` (and ${issues.length - 3} more)` : "") });
      return z.NEVER;
    }
    return JSON.stringify(cleaned);
  });
}

// Blank values skip the type and rule checks (the required check handles
// them): text keeps its empty string, other types become NULL.
function fieldSchema(field) {
  const check = valueSchema(field);
  return z.any().transform((value, ctx) => {
    if (utils.isBlank(value)) return TEXT_TYPES.has(field.type) && value !== undefined ? value : null;
    const result = check.safeParse(value);
    if (result.success) return result.data;
    for (const issue of result.error.issues) ctx.addIssue({ code: "custom", message: issue.message });
    return z.NEVER;
  }).optional();
}

// { field, in: [...] }, { field, equals }, { field, notEmpty: true }, and
// { all: [...] } / { any: [...] } groups. No condition means "always".
function conditionMet(condition, values) {
  if (!condition) return true;
  if (Array.isArray(condition.all)) return condition.all.every((part) => conditionMet(part, values));
  if (Array.isArray(condition.any)) return condition.any.some((part) => conditionMet(part, values));
  const value = values[condition.field];
  if (Array.isArray(condition.in)) return condition.in.map(String).includes(String(value ?? ""));
  if (Object.hasOwn(condition, "equals")) return String(value ?? "") === String(condition.equals);
  if (condition.notEmpty) return !utils.isBlank(value);
  return true;
}

function isRequired(field, values) {
  const config = field.config ?? {};
  if (!conditionMet(config.visibleWhen, values)) return false;
  return Number(field.required) === 1
    || (config.requiredWhen !== undefined && conditionMet(config.requiredWhen, values));
}

function buildSchema(fields, mode, existing, access) {
  const writable = fields.filter((field) => isWritable(field, mode, access));
  const shape = Object.fromEntries(writable.map((field) => [
    field.column_name,
    fieldSchema(field),
  ]));

  return z.object(shape).superRefine((values, ctx) => {
    for (const [column, message] of Object.entries(requiredErrors(writable, values, mode, existing))) {
      ctx.addIssue({ code: "custom", path: [column], message });
    }
  });
}

// An update checks the required fields it sends; a create checks every one.
function requiredErrors(writable, values, mode, existing) {
  const merged = { ...existing, ...values };
  const errors = {};
  for (const field of writable) {
    const column = field.column_name;
    const checked = mode === "create" || Object.hasOwn(values, column);
    if (checked && isRequired(field, merged) && utils.isBlank(merged[column])) {
      errors[column] = `${field.col_real_name || column} is required`;
    }
  }
  return errors;
}

// The zod schema for one generic write, or null when the table is not
// described. Fields the metadata does not let this write set are dropped.
async function metadataSchema(table, { mode = "create", existing = {}, access } = {}) {
  const fields = await loadDescribedFields(table);
  return fields ? buildSchema(fields, mode, existing, access) : null;
}

// Lookup values inside list rows (and groupList groups and their items).
async function rowLookupErrors(field, value) {
  const config = field.config ?? {};
  const label = field.col_real_name || field.column_name;
  const unit = field.type === "groupList" ? "group" : "row";
  const checks = [];
  const collect = (fields, rows, where) => rows.forEach((row, index) => {
    for (const rowField of rowFieldsOf(fields)) {
      const wanted = row?.[rowField.column_name];
      if (rowField.config?.lookup && !utils.isBlank(wanted)) checks.push({ rowField, row, wanted, place: `${where} ${index + 1}` });
    }
  });
  const rows = parseRows(value) ?? [];
  collect(config.fields, rows, `${label}, ${unit}`);
  if (field.type === "groupList") {
    const key = config.children?.key || "list";
    rows.forEach((group, index) => collect(config.children?.fields, parseRows(group?.[key]) ?? [], `${label}, group ${index + 1}, ${config.children?.label || "Items"} row`));
  }
  for (const { rowField, row, wanted, place } of checks) {
    const values = rowField.type === "multiLookup" ? String(wanted).split(",") : [wanted];
    if ((await findMissingLookupValues(rowField.config.lookup, values, row)).length) {
      return `${place}: ${rowField.col_real_name || rowField.column_name} must be one of the available choices`;
    }
  }
  return null;
}

async function lookupErrors(fields, values, merged) {
  const errors = {};
  for (const field of fields) {
    if (LIST_TYPES.has(field.type) && !utils.isBlank(values[field.column_name])) {
      const message = await rowLookupErrors(field, values[field.column_name]);
      if (message) errors[field.column_name] = message;
      continue;
    }
    const lookupKey = field.config?.lookup;
    const value = values[field.column_name];
    if (!lookupKey || utils.isBlank(value)) continue;
    const wanted = field.type === "multiLookup" ? String(value).split(",") : [value];
    const missing = await findMissingLookupValues(lookupKey, wanted, merged);
    if (missing.length) {
      errors[field.column_name] = `${field.col_real_name || field.column_name} must be one of the available choices`;
    }
  }
  return errors;
}

function fieldErrorsFrom(issues) {
  const errors = {};
  for (const issue of issues) {
    const column = String(issue.path[0] ?? "");
    errors[column] ??= issue.message;
  }
  return errors;
}

// Checks one record against its table's metadata and returns it cleaned
// (types coerced, non-writable fields removed). Undescribed tables get the
// record back unchanged. Errors come back per field:
// { errors: { rate: "Rate must be at most 100" } }.
async function validateRecordAgainstMetadata(table, record, { mode = "create", existing = {}, access } = {}) {
  const fields = await loadDescribedFields(table);
  if (!fields) return { record, errors: {} };

  const writable = fields.filter((field) => isWritable(field, mode, access));
  const forbidden = forbiddenErrors(fields, record, access);
  const parsed = buildSchema(fields, mode, existing, access).safeParse(record);
  if (!parsed.success) {
    // zod skips the whole-record checks when a field fails, so required
    // fields and lookups are checked here too: every problem at once.
    const errors = { ...forbidden, ...requiredErrors(writable, record, mode, existing), ...fieldErrorsFrom(parsed.error.issues) };
    const unchecked = writable.filter((field) => !errors[field.column_name]);
    return { record, errors: { ...errors, ...(await lookupErrors(unchecked, record, { ...existing, ...record })) } };
  }

  const errors = { ...forbidden, ...(await lookupErrors(writable, parsed.data, { ...existing, ...parsed.data })) };
  return { record: parsed.data, errors };
}

function throwFieldErrors(errors) {
  const messages = Object.values(errors);
  throw new AppError("ERR_VALIDATION_FAILED", messages.length === 1 ? messages[0] : `${messages.length} fields need attention: ${messages.join("; ")}`, {
    errors,
  });
}

module.exports = {
  conditionMet,
  metadataSchema,
  throwFieldErrors,
  unreadableColumns,
  validateRecordAgainstMetadata,
};
