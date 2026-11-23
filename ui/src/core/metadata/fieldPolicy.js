function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["1", "true", "yes"].includes(String(value).trim().toLowerCase());
}

export function getFieldPolicy(field = {}, mode = "create") {
  // form_visible and list_visible replaced backend_visible and
  // frontend_visible (migration 021); the old names are read only for
  // metadata from before that change.
  const formVisible = toBoolean(field.form_visible ?? field.backend_visible);
  const listVisible = toBoolean(field.list_visible ?? field.frontend_visible);
  const editable = toBoolean(field.editable, true);
  const explicitlyDisabled = toBoolean(field.disabled);

  return {
    formVisible,
    listVisible,
    editable,
    disabled: explicitlyDisabled || (mode === "edit" && !editable),
    writable: !explicitlyDisabled && editable,
  };
}

export { toBoolean };
