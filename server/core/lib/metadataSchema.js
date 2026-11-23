const { z } = require("zod");
const AppError = require("../../shared/helpers/AppError");
const Model = require("../model/model");
const { canReadField, canWriteField, findMissingLookupValues } = require("./metadataService");

// Server-side enforcement of a described table's metadata (metadata upgrade
// phase 3). A table is described when metadata_tables has an enabled row for
// it; generic writes to it are checked here, and other tables behave as
// before. Hand-written routes can reuse metadataSchema() and extend it.

const TEXT_TYPES = new Set(["text", "textarea", "richText", "password", "phone", "url", "generatedId", "file", "image", "color"]);
const NUMBER_TYPES = new Set(["number", "integer", "money", "percent", "duration"]);
const CHOICE_TYPES = new Set(["select", "radio"]);
const MULTI_CHOICE_TYPES = new Set(["multiSelect", "checkboxGroup"]);
const DATE_TYPES = new Set(["date", "dateTime"]);

const isBlank = (value) => value === undefined || value === null
  || (typeof value === "string" && value.trim() === "");

const text = z.union([z.string(), z.number()]).transform(String);
const list = z.union([z.array(text), text])
  .transform((value) => (Array.isArray(value) ? value : value.split(",")).map((item) => item.trim()).filter(Boolean));

async function loadDescribedFields(table) {
  const [described] = await new Model()
    .select(["table_name"], "metadata_tables")
    .where("table_name", "=", table)
    .where("enabled", "=", 1)
    .execute();
  if (!described) return null;

  return new Model()
    .select(["column_name", "col_real_name", "type", "form_visible", "editable", "disabled", "required", "config"], "tables_metadata")
    .where("table_name", "=", table)
    .execute();
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
  return z.any();
}

// Blank values skip the type and rule checks (the required check handles
// them): text keeps its empty string, other types become NULL.
function fieldSchema(field) {
  const check = valueSchema(field);
  return z.any().transform((value, ctx) => {
    if (isBlank(value)) return TEXT_TYPES.has(field.type) && value !== undefined ? value : null;
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
  if (condition.notEmpty) return !isBlank(value);
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
    if (checked && isRequired(field, merged) && isBlank(merged[column])) {
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

async function lookupErrors(fields, values, merged) {
  const errors = {};
  for (const field of fields) {
    const lookupKey = field.config?.lookup;
    const value = values[field.column_name];
    if (!lookupKey || isBlank(value)) continue;
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
