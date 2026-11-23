// useRecordForm renders the original type names. Metadata v2 (migration 020)
// renamed them and moved options into `config`; this maps a v2 field back to
// the name the form engine knows. Fields still on the old names pass through.
// Removed in phase 4, when the admin pages move to MetadataForm.
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
  const legacyType = LEGACY_TYPES[field?.type];
  return legacyType ? { ...field, type: legacyType } : field;
}
