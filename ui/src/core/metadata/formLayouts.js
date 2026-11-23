// How MetadataForm lays its sections out when a table asks for a layout other
// than the plain stacked form (metadata_tables.stepper turns on 'steps').
// A project can replace a layout without touching MetadataForm:
// registerFormLayout('steps', MyStepper). A layout receives
// { metadata, sections, renderSection, form, mode, saving, submitText,
//   singular, onCancel, errorFields } — see StepsLayout. The layout saves by
// calling form.submit() when it is ready.

const layouts = new Map();

export function registerFormLayout(name, component) {
  layouts.set(name, component);
}

export function getFormLayout(name) {
  return layouts.get(name) ?? null;
}
