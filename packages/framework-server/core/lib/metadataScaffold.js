const mysql = require("mysql2");
const AppError = require("../../shared/helpers/AppError");
const utils = require("../../shared/utils/functions");
const { ACTIONS, endpointsFor } = require("./tableAccess");

// The metadata builder's pure parts: guessing a field from a database column,
// writing migrations, and describing what changed between two versions. No
// database access here; metadataAdminService feeds these the rows.

const FIELD_TYPES = new Set([
  "text", "textarea", "richText", "email", "phone", "url", "password", "integer", "number", "money",
  "percent", "duration", "date", "dateTime", "time", "switch", "select", "multiSelect", "radio",
  "checkboxGroup", "lookup", "multiLookup", "file", "image", "color", "icon", "list", "groupList", "primaryKey", "generatedId",
]);
const TIMESTAMP_COLUMNS = new Set(["createdAt", "updatedAt", "deletedAt", "created_at", "updated_at", "deleted_at"]);

function enumOptions(columnType) {
  const match = /^(?:enum|set)\((.*)\)$/i.exec(columnType ?? "");
  if (!match) return [];
  return [...match[1].matchAll(/'((?:[^']|'')*)'/g)].map(([, value]) => {
    const unescaped = value.replace(/''/g, "'");
    return { value: unescaped, label: utils.humanize(unescaped.toLowerCase()) };
  });
}

// A field definition for one database column (from INFORMATION_SCHEMA), with
// `lookupSuggestion` when the column is a foreign key.
function guessField(column, { existingLookups = [] } = {}) {
  const name = column.COLUMN_NAME;
  const dataType = String(column.DATA_TYPE).toLowerCase();
  const columnType = String(column.COLUMN_TYPE).toLowerCase();
  const lowered = name.toLowerCase();
  const isKey = column.COLUMN_KEY === "PRI";
  const automatic = /auto_increment|default_generated|on update/i.test(column.EXTRA ?? "") || column.COLUMN_DEFAULT !== null;
  const field = {
    column_name: name,
    col_real_name: utils.humanize(name),
    type: "text",
    form_visible: 1,
    list_visible: 1,
    editable: 1,
    disabled: 0,
    required: column.IS_NULLABLE === "NO" && !automatic ? 1 : 0,
    section_key: null,
    col_span: 24,
    config: null,
  };
  let lookupSuggestion = null;

  if (isKey && /auto_increment/i.test(column.EXTRA ?? "")) {
    Object.assign(field, { type: "primaryKey", form_visible: 0, list_visible: 0, editable: 0, required: 0 });
  } else if (column.REFERENCED_TABLE_NAME) {
    const existing = existingLookups.find((lookup) => lookup.source_table === column.REFERENCED_TABLE_NAME
      && lookup.value_column === column.REFERENCED_COLUMN_NAME);
    const key = existing?.lookup_key ?? column.REFERENCED_TABLE_NAME;
    field.type = "lookup";
    field.config = { lookup: key };
    if (!existing) {
      lookupSuggestion = {
        lookup_key: key,
        source_table: column.REFERENCED_TABLE_NAME,
        value_column: column.REFERENCED_COLUMN_NAME,
        label_column: column.REFERENCED_COLUMN_NAME,
      };
    }
  } else if (dataType === "enum") {
    field.type = "select";
    field.config = { options: enumOptions(column.COLUMN_TYPE) };
  } else if (dataType === "set") {
    field.type = "multiSelect";
    field.config = { options: enumOptions(column.COLUMN_TYPE) };
  } else if (columnType.startsWith("tinyint(1)") || dataType === "boolean") {
    field.type = "switch";
  } else if (["int", "bigint", "smallint", "mediumint", "tinyint"].includes(dataType)) {
    field.type = "integer";
  } else if (dataType === "decimal") {
    field.type = /price|amount|cost|limit|total|balance|fee|salary/.test(lowered) ? "money" : "number";
  } else if (["float", "double"].includes(dataType)) {
    field.type = "number";
  } else if (dataType === "date") {
    field.type = "date";
  } else if (["datetime", "timestamp"].includes(dataType)) {
    field.type = "dateTime";
  } else if (dataType === "time") {
    field.type = "time";
  } else if (["text", "mediumtext", "longtext", "json"].includes(dataType)) {
    field.type = "textarea";
    field.list_visible = 0;
  } else if (/email/.test(lowered)) {
    field.type = "email";
  } else if (/phone|mobile|tel/.test(lowered)) {
    field.type = "phone";
  } else if (/(^|_)(image|logo|avatar|photo|picture)(_url|_path)?$/.test(lowered)) {
    field.type = "image";
  } else if (/(^|_)(file|document|attachment)(_url|_path)?$/.test(lowered)) {
    field.type = "file";
  } else if (/url|website|link/.test(lowered)) {
    field.type = "url";
  }

  if (TIMESTAMP_COLUMNS.has(name)) {
    Object.assign(field, { type: "dateTime", form_visible: 0, editable: 0, disabled: 1, required: 0 });
  }
  return { field, lookupSuggestion };
}

function checkField(field, physicalColumns) {
  utils.requireIdentifier(field.column_name, "column");
  if (!physicalColumns.includes(field.column_name)) {
    throw new AppError("ERR_VALIDATION_FAILED", `${field.column_name} is not a column of this table`);
  }
  if (!FIELD_TYPES.has(field.type)) {
    throw new AppError("ERR_VALIDATION_FAILED", `${field.column_name}: unknown field type ${field.type}`);
  }
  const span = Number(field.col_span ?? 24);
  if (!Number.isInteger(span) || span < 1 || span > 24) {
    throw new AppError("ERR_VALIDATION_FAILED", `${field.column_name}: width must be 1 to 24`);
  }
  if (field.type === "list" || field.type === "groupList") {
    checkRowFields(field.config?.fields, field.column_name);
    if (field.type === "groupList") checkRowFields(field.config?.children?.fields, `${field.column_name} items`);
  }
}

const ROW_FIELD_TYPES = new Set([...FIELD_TYPES].filter((type) => !["list", "groupList", "file", "image", "primaryKey", "generatedId", "password"].includes(type)));

// A list's row fields: at least one, each with its own key and a type a row can hold.
function checkRowFields(rowFields, where) {
  if (!Array.isArray(rowFields) || !rowFields.length) {
    throw new AppError("ERR_VALIDATION_FAILED", `${where}: add at least one row field`);
  }
  const keys = new Set();
  for (const rowField of rowFields) {
    if (!utils.isIdentifier(rowField?.column_name)) {
      throw new AppError("ERR_VALIDATION_FAILED", `${where}: "${rowField?.column_name ?? ""}" is not a valid row field key`);
    }
    if (keys.has(rowField.column_name)) {
      throw new AppError("ERR_VALIDATION_FAILED", `${where}: the row field key ${rowField.column_name} is used twice`);
    }
    keys.add(rowField.column_name);
    if (!ROW_FIELD_TYPES.has(rowField.type)) {
      throw new AppError("ERR_VALIDATION_FAILED", `${where}.${rowField.column_name}: rows cannot hold ${rowField.type} fields`);
    }
  }
}

const describeValue = (value) => {
  if (value === null || value === undefined || value === "") return "none";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
const FIELD_KEYS = ["col_real_name", "type", "form_visible", "list_visible", "editable", "disabled", "required", "section_key", "col_span", "rank", "config"];
const TABLE_KEYS = ["label", "singular_label", "title_column", "default_sort", "search_columns", "form_layout", "form_columns", "sections", "stepper", "enabled", "is_system"];

// What changed from one saved definition to the next, as readable lines:
// [{ scope: "table" | "field", subject, change }].
function describeChanges(before, after) {
  const changes = [];
  for (const key of TABLE_KEYS) {
    const from = describeValue(before?.table?.[key]);
    const to = describeValue(after.table?.[key]);
    if (from !== to) changes.push({ scope: "table", subject: key, change: `${from} → ${to}` });
  }
  const beforeFields = new Map((before?.fields ?? []).map((field) => [field.column_name, field]));
  for (const field of after.fields) {
    const previous = beforeFields.get(field.column_name);
    if (!previous) {
      changes.push({ scope: "field", subject: field.column_name, change: "described" });
      continue;
    }
    for (const key of FIELD_KEYS) {
      const from = describeValue(previous[key]);
      const to = describeValue(field[key]);
      if (from !== to) changes.push({ scope: "field", subject: field.column_name, change: `${key}: ${from} → ${to}` });
    }
    beforeFields.delete(field.column_name);
  }
  for (const column of beforeFields.keys()) changes.push({ scope: "field", subject: column, change: "removed" });
  return changes;
}

const json = (value) => (value === null || value === undefined ? null : JSON.stringify(value));
const TABLE_COLUMNS = ["table_name", "label", "singular_label", "description", "icon", "title_column", "default_sort",
  "search_columns", "form_layout", "form_columns", "sections", "stepper", "enabled", "is_system"];
const FIELD_COLUMNS = ["table_name", "column_name", "col_real_name", "type", "form_visible", "list_visible", "editable",
  "disabled", "required", "section_key", "col_span", "config", "rank"];
const JSON_COLUMNS = new Set(["default_sort", "search_columns", "sections", "stepper", "config", "extra_columns", "base_filters", "sort"]);
const NOW = mysql.raw("CURRENT_TIMESTAMP");

function upsertSql(table, columns, row, updateColumns) {
  const values = columns.map((column) => (JSON_COLUMNS.has(column) ? json(row[column]) : row[column] ?? null));
  return mysql.format(
    `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(", ")}) VALUES (?)\n`
      + `  ON DUPLICATE KEY UPDATE ${updateColumns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(", ")};`,
    [values],
  );
}

// A table's metadata as a migration: what "Export as migration" downloads, so
// a definition designed in one database reaches another through git.
function definitionMigration(definition, { lookups = [] } = {}) {
  const table = utils.requireIdentifier(definition.table.table_name, "table name");
  const lines = [
    `-- Metadata for ${table} (version ${definition.table.version ?? 1}), exported from the metadata builder.`,
    "",
    "START TRANSACTION;",
    "",
    upsertSql("metadata_tables", TABLE_COLUMNS, { ...definition.table, table_name: table, is_system: Number(definition.table.is_system ?? 0) ? 1 : 0 }, TABLE_COLUMNS.filter((column) => column !== "table_name")),
  ];
  for (const lookup of lookups) {
    const columns = ["lookup_key", "source_table", "value_column", "label_column", "extra_columns", "base_filters",
      "depends_on", "filter_column", "sort", "max_rows", "required_permission", "description"];
    lines.push(upsertSql("metadata_lookups", columns, lookup, columns.filter((column) => column !== "lookup_key")));
  }
  for (const [index, field] of definition.fields.entries()) {
    lines.push(upsertSql("tables_metadata", FIELD_COLUMNS, { ...field, table_name: table, rank: field.rank ?? index + 1 },
      FIELD_COLUMNS.filter((column) => !["table_name", "column_name"].includes(column))));
  }
  lines.push("", "COMMIT;", "");
  return lines.join("\n");
}

// How a field type is stored when the builder creates a new table.
const STORAGE = {
  text: "VARCHAR(255)", textarea: "TEXT", richText: "MEDIUMTEXT", email: "VARCHAR(255)", phone: "VARCHAR(20)",
  url: "VARCHAR(500)", password: "VARCHAR(255)", integer: "INT", number: "DOUBLE", money: "DECIMAL(14,2)",
  percent: "DECIMAL(5,2)", duration: "INT", date: "DATE", dateTime: "DATETIME", time: "TIME",
  switch: "TINYINT(1)", select: "VARCHAR(60)", radio: "VARCHAR(60)", multiSelect: "VARCHAR(500)",
  checkboxGroup: "VARCHAR(500)", lookup: "VARCHAR(255)", multiLookup: "VARCHAR(500)", file: "VARCHAR(500)",
  image: "VARCHAR(500)", color: "VARCHAR(20)", generatedId: "VARCHAR(40)", icon: "VARCHAR(64)", list: "JSON", groupList: "JSON",
};
const storageOf = (column) => column.storage ?? STORAGE[column.type] ?? "VARCHAR(255)";

// A new table, its metadata and its permissions as one migration. The
// builder never runs it: the file is downloaded, reviewed and migrated.
function newTableMigration(spec) {
  const table = utils.requireIdentifier(spec.table, "table name");
  const columns = spec.columns ?? [];
  if (!columns.length) throw new AppError("ERR_VALIDATION_FAILED", "Add at least one column");
  const seen = new Set(["id", "createdAt", "updatedAt"]);
  for (const column of columns) {
    utils.requireIdentifier(column.name, "column name");
    if (seen.has(column.name)) throw new AppError("ERR_VALIDATION_FAILED", `Column ${column.name} is listed twice or reserved`);
    seen.add(column.name);
    if (!FIELD_TYPES.has(column.type) || ["primaryKey"].includes(column.type)) {
      throw new AppError("ERR_VALIDATION_FAILED", `${column.name}: unknown field type ${column.type}`);
    }
  }

  const definitions = [
    "  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT",
    ...columns.map((column) => {
      const notNull = column.type === "switch" ? " NOT NULL DEFAULT 0" : column.required ? " NOT NULL" : " NULL";
      return `  \`${column.name}\` ${storageOf(column)}${notNull}`;
    }),
    "  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP",
    "  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    "  PRIMARY KEY (`id`)",
    ...columns.filter((column) => column.unique).map((column) => `  UNIQUE KEY \`uq_${table}_${column.name}\` (\`${column.name}\`)`),
  ];
  const fields = [
    { column_name: "id", col_real_name: "ID", type: "primaryKey", form_visible: 0, list_visible: 0, editable: 0 },
    ...columns.map((column) => ({
      column_name: column.name,
      col_real_name: column.label || utils.humanize(column.name),
      type: column.type,
      form_visible: 1,
      list_visible: column.type === "textarea" || column.type === "richText" ? 0 : 1,
      editable: 1,
      required: column.required ? 1 : 0,
      config: column.config ?? null,
    })),
    { column_name: "createdAt", col_real_name: "Created", type: "dateTime", form_visible: 0, list_visible: 0, editable: 0, disabled: 1 },
    { column_name: "updatedAt", col_real_name: "Updated", type: "dateTime", form_visible: 0, list_visible: 0, editable: 0, disabled: 1 },
  ].map((field) => ({ disabled: 0, required: 0, section_key: null, col_span: 24, config: null, ...field }));

  const permissions = ACTIONS.map((action) => `${action}:${table}`);
  const routes = ACTIONS.flatMap((action) => endpointsFor(table, action).map((endpoint) => ({ action, ...endpoint })));
  const label = spec.label || utils.humanize(table);
  const sql = [
    `-- ${label}: a new table designed in the metadata builder.`,
    "",
    `CREATE TABLE IF NOT EXISTS \`${table}\` (`,
    definitions.join(",\n"),
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;",
    "",
    definitionMigration({
      table: { table_name: table, label, singular_label: spec.singular_label || label, form_layout: "modal", form_columns: 1, sections: [], enabled: 1 },
      fields,
    }).replace(/^-- .*\n\n/, ""),
    "START TRANSACTION;",
    "",
    mysql.format("INSERT IGNORE INTO `admin_permissions` (`permission_name`, `description`, `createdAt`, `updatedAt`) VALUES ?;",
      [permissions.map((permission) => [permission, `${permission.split(":")[0]} ${label}`, NOW, NOW])]),
    mysql.format("INSERT IGNORE INTO `admin_resources` (`resource`, `resource_type`, `resource_path`, `http_method`, `description`, `is_public`, `display_order`, `createdAt`, `updatedAt`, `category`, `show_in_nav`) VALUES ?;",
      [routes.map(({ resource, method, path }) => [resource, "API_ENDPOINT", path, method, `${label}: ${method} ${path}`, 0, 0, NOW, NOW, "Data API", 0])]),
    mysql.format("INSERT IGNORE INTO `admin_permission_resources` (`permission`, `resource`, `resource_type`, `createdAt`, `updatedAt`) VALUES ?;",
      [routes.map(({ action, resource }) => [`${action}:${table}`, resource, "API_ENDPOINT", NOW, NOW])]),
    "",
    "COMMIT;",
    "",
  ].join("\n");
  return { sql, fields };
}

module.exports = {
  FIELD_TYPES,
  checkField,
  definitionMigration,
  describeChanges,
  enumOptions,
  guessField,
  newTableMigration,
};
