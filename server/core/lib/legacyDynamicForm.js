// Fields described for the old useDynamicForm (types dynaFormSimple and
// dynaFormNested, rows defined in tables_metadata.options) read as the list
// and groupList field types, so old definitions keep working without a data
// migration. Old nested data keeps its inner key "list".

const utils = require("../../shared/utils/functions");

const TYPE_MAP = {
  text: "text", number: "number", textArea: "textarea",
  jsonSelect: "select", csvSelect: "select", jsonRadio: "radio", csvRadio: "radio",
  jsonCheck: "checkboxGroup", csvCheck: "checkboxGroup", jsonMultiSelect: "multiSelect", csvMultiSelect: "multiSelect",
};

function legacyOptions(definition) {
  const { options } = definition ?? {};
  if (typeof options === "string") return options.split(",").map((value) => value.trim()).filter(Boolean).map((value) => ({ value, label: value }));
  if (options && typeof options === "object") return Object.entries(options).map(([value, label]) => ({ value, label: String(label) }));
  return undefined;
}

// { name: { type, markup: { isRequired, … }, options } } → field definitions.
// SQL-backed choices (sqlSelect…) have no safe equivalent and become text.
function legacyRowFields(definitions) {
  return Object.entries(definitions ?? {}).map(([name, definition]) => {
    const options = legacyOptions(definition);
    const config = {
      ...(options ? { options } : {}),
      ...(definition?.markup?.placeholder ? { placeholder: definition.markup.placeholder } : {}),
    };
    return {
      column_name: name,
      col_real_name: definition?.markup?.label ?? name,
      type: TYPE_MAP[definition?.type] ?? "text",
      required: definition?.markup?.isRequired ? 1 : 0,
      config: Object.keys(config).length ? config : null,
    };
  });
}

function upgradeLegacyField(field) {
  if (field.type !== "dynaFormSimple" && field.type !== "dynaFormNested") return field;
  const definitions = utils.parseJson(field.options, {});
  const config = utils.parseJson(field.config, {});
  if (field.type === "dynaFormSimple") {
    return { ...field, type: "list", config: { ...config, fields: config.fields ?? legacyRowFields(definitions) } };
  }
  return {
    ...field,
    type: "groupList",
    config: {
      ...config,
      fields: config.fields ?? legacyRowFields(definitions.parent),
      children: config.children ?? { key: "list", label: "Items", fields: legacyRowFields(definitions.children) },
    },
  };
}

module.exports = { legacyRowFields, upgradeLegacyField };
