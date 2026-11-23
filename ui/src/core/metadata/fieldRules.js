// Browser-side checks generated from the same metadata the server enforces
// (server/core/lib/metadataSchema.js), with the same messages, so a form
// shows the error the server would return before the request is sent.

const NUMBER_TYPES = new Set(["number", "integer", "money", "percent", "duration"]);

export const isBlank = (value) => value === undefined || value === null
  || (typeof value === "string" && value.trim() === "")
  || (Array.isArray(value) && value.length === 0);

// { field, in: [...] }, { field, equals }, { field, notEmpty: true }, and
// { all: [...] } / { any: [...] } groups. No condition means "always".
export function conditionMet(condition, values) {
  if (!condition) return true;
  if (Array.isArray(condition.all)) return condition.all.every((part) => conditionMet(part, values));
  if (Array.isArray(condition.any)) return condition.any.some((part) => conditionMet(part, values));
  const value = values?.[condition.field];
  if (Array.isArray(condition.in)) return condition.in.map(String).includes(String(value ?? ""));
  if (Object.hasOwn(condition, "equals")) return String(value ?? "") === String(condition.equals);
  if (condition.notEmpty) return !isBlank(value);
  return true;
}

export const fieldLabel = (field) => field.col_real_name || field.column_name;

// The fields a form shows: visible in forms, never the primary key.
export function formFieldsOf(metadata, { fields, section } = {}) {
  return (metadata?.fields ?? []).filter((field) => Number(field.form_visible) === 1
    && field.type !== "primaryKey"
    && (!fields || fields.includes(field.column_name))
    && (section === undefined || (field.section_key ?? null) === section));
}

// What a save may send: the primary key and disabled fields never; a field
// that is not editable only when creating (the server applies the same rule).
export function isWritableField(field, mode) {
  if (field.type === "primaryKey" || Number(field.disabled) === 1) return false;
  return mode === "create" || Number(field.editable) !== 0;
}

export function isFieldRequired(field, values) {
  const config = field.config ?? {};
  if (!conditionMet(config.visibleWhen, values)) return false;
  return Number(field.required) === 1
    || (config.requiredWhen !== undefined && conditionMet(config.requiredWhen, values));
}

// antd Form rules for one field. `values` are the form's current values,
// for requiredWhen.
export function fieldRules(field, values = {}) {
  const label = fieldLabel(field);
  const config = field.config ?? {};
  const present = (check) => (value) => isBlank(value) || check(value);
  const rule = (check, message) => ({
    validator: (_, value) => (present(check)(value) ? Promise.resolve() : Promise.reject(new Error(message))),
  });

  const rules = [];
  if (isFieldRequired(field, values)) {
    rules.push({ required: true, whitespace: true, message: `${label} is required` });
  }
  if (field.type === "email") {
    rules.push(rule((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()), `${label} must be a valid email address`));
  }
  if (NUMBER_TYPES.has(field.type)) {
    rules.push(rule((value) => Number.isFinite(Number(value)), `${label} must be a number`));
    if (field.type === "integer") rules.push(rule((value) => Number.isInteger(Number(value)), `${label} must be a whole number`));
    if (config.min !== undefined) rules.push(rule((value) => Number(value) >= config.min, `${label} must be at least ${config.min}`));
    if (config.max !== undefined) rules.push(rule((value) => Number(value) <= config.max, `${label} must be at most ${config.max}`));
  }
  for (const item of config.rules ?? []) {
    if (item.rule === "pattern") {
      const pattern = new RegExp(item.value);
      rules.push(rule((value) => pattern.test(String(value)), item.message ?? `${label} is not in the expected format`));
    } else if (item.rule === "minLength") {
      rules.push(rule((value) => String(value).length >= item.value, item.message ?? `${label} needs at least ${item.value} characters`));
    } else if (item.rule === "maxLength") {
      rules.push(rule((value) => String(value).length <= item.value, item.message ?? `${label} allows at most ${item.value} characters`));
    } else if (item.rule === "min") {
      rules.push(rule((value) => Number(value) >= item.value, item.message ?? `${label} must be at least ${item.value}`));
    } else if (item.rule === "max") {
      rules.push(rule((value) => Number(value) <= item.value, item.message ?? `${label} must be at most ${item.value}`));
    }
  }
  return rules;
}
