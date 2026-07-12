function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["1", "true", "yes"].includes(String(value).trim().toLowerCase());
}

export function getFieldPolicy(field = {}, mode = "create") {
  // form_visible is the preferred future field. backend_visible remains the
  // legacy fallback so existing metadata continues to render unchanged.
  const formVisible = Object.hasOwn(field, "form_visible")
    ? toBoolean(field.form_visible)
    : toBoolean(field.backend_visible);
  const listVisible = toBoolean(field.frontend_visible);
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
