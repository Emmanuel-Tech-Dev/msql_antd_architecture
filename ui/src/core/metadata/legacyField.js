// useRecordForm renders the original type names and reads the required mark
// from the old `validator` convention. Metadata v2 renamed the types, moved
// options into `config` (migration 020) and made `required` a flag
// (migration 022); this maps a v2 field back to what the form engine knows.
// Fields still in the old format pass through. Removed in phase 4, when the
// admin pages move to MetadataForm.
const LEGACY_TYPES = {
  select: "jsonSelect",
  multiSelect: "jsonMultiSelect",
  radio: "jsonRadio",
  checkboxGroup: "jsonCheck",
  lookup: "sqlSelect",
  multiLookup: "sqlMultiSelect",
  textarea: "textArea",
  richText: "textEditor",
  generatedId: "customGenerateString",
};

export function toLegacyField(field) {
  if (!field) return field;
  return {
    ...field,
    type: LEGACY_TYPES[field.type] ?? field.type,
    validator: field.validator ?? (Number(field.required) === 1 ? "validateEmptyString" : ""),
  };
}
