const AppError = require("../../shared/helpers/AppError");
const Model = require("../model/model");
const { SENSITIVE_GENERIC_TABLES } = require("../config/lookupRegistry");

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const BOOTSTRAP_BLOCKED_TABLES = new Set([
  "admin_credentials",
  "token_blacklist",
  "user_activity_logs",
]);
const CORE_BOOTSTRAP_TABLES = new Set([
  "tables_metadata",
  "admin_resources",
  "admin_permissions",
  "ui_settings",
]);
const SENSITIVE_COLUMNS = new Set([
  "password",
  "password_hash",
  "passwd",
  "access_token",
  "refresh_token",
  "reset_token",
  "reset_token_expiry",
  "otp",
  "otp_secret",
  "secret",
  "client_secret",
  "api_key",
  "private_key",
  "encryption_key",
]);

function normalizeIdentifier(value, label) {
  const identifier = String(value ?? "").trim().toLowerCase();
  if (!IDENTIFIER.test(identifier)) {
    throw new AppError("ERR_INVALID_INPUT", `Invalid ${label}`);
  }
  return identifier;
}

function normalizeLimit(value, fallback = 1000, maximum = 5000) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

async function resolveTableDefinition(config = {}, options = {}) {
  const purpose = options.purpose ?? "generic";
  const table = normalizeIdentifier(config.table, "table name");
  const storeName = normalizeIdentifier(config.storeName ?? table, "store name");

  if (purpose === "generic" && SENSITIVE_GENERIC_TABLES.has(table)) {
    throw new AppError("ERR_ACCESS_DENIED", null, {
      message: "This resource is not available through the generic API",
      resource: table,
    });
  }

  if (purpose === "bootstrap" && BOOTSTRAP_BLOCKED_TABLES.has(table)) {
    throw new AppError("ERR_ACCESS_DENIED", null, {
      message: "This resource is not available through bootstrap",
      resource: table,
    });
  }

  if (purpose === "bootstrap" && !CORE_BOOTSTRAP_TABLES.has(table)) {
    const roles = Array.isArray(options.roles) ? options.roles : [];
    const permissions = Array.isArray(options.permissions)
      ? options.permissions
      : [];
    const privileged = roles.some((role) => {
      const normalized = String(role?.role_id ?? role).trim().toLowerCase();
      return normalized === "superadmin" || normalized === "dev";
    });
    const requiredPermission = `read:${table}`;
    if (!privileged && !permissions.includes(requiredPermission)) {
      throw new AppError("ERR_ACCESS_DENIED", null, {
        message: `Missing bootstrap permission: ${requiredPermission}`,
        resource: table,
      });
    }
  }

  const model = new Model();
  if (!(await model.tableExists(table))) {
    throw new AppError("ERR_NOT_FOUND", "Requested table or view was not found");
  }

  const physicalColumns = await model.getTableColumns(table);
  const primaryKey = await model.getTablePrimaryKey(table);
  const requestedFields = Array.isArray(config.fields) ? config.fields : ["*"];
  const safePhysicalColumns = physicalColumns.filter(
    (column) => !SENSITIVE_COLUMNS.has(column.toLowerCase()),
  );

  let fields;
  if (requestedFields.includes("*")) {
    fields = safePhysicalColumns;
  } else {
    fields = requestedFields.map((field) => {
      const requested = String(field ?? "").trim();
      if (!IDENTIFIER.test(requested)) {
        throw new AppError("ERR_INVALID_INPUT", "Invalid column name");
      }
      const physical = safePhysicalColumns.find(
        (column) => column.toLowerCase() === requested.toLowerCase(),
      );
      if (!physical || SENSITIVE_COLUMNS.has(requested.toLowerCase())) {
        throw new AppError("ERR_ACCESS_DENIED", null, {
          message: `Column ${requested} is not available`,
          resource: table,
        });
      }
      return physical;
    });
  }

  if (!fields.length) {
    throw new AppError("ERR_ACCESS_DENIED", "No readable columns are available");
  }

  const requestedFilters = Array.isArray(config.filters) ? config.filters : [];
  if (requestedFilters.length > 10) {
    throw new AppError("ERR_INVALID_INPUT", "Too many bootstrap filters");
  }

  const filters = requestedFilters.map((filter) => {
    const requestedColumn = String(filter?.column ?? "").trim();
    if (!IDENTIFIER.test(requestedColumn)) {
      throw new AppError("ERR_INVALID_INPUT", "Invalid filter column");
    }
    const column = safePhysicalColumns.find(
      (physical) =>
        physical.toLowerCase() === requestedColumn.toLowerCase(),
    );
    if (!column) {
      throw new AppError("ERR_ACCESS_DENIED", "Filter column is not available");
    }
    const requestedOperator = String(filter?.operator ?? "=").toUpperCase();
    const operator =
      table === "system_settings" &&
      column.toLowerCase() === "key" &&
      requestedOperator === "LIKE"
        ? "LIKE"
        : "=";
    return { column, operator, value: filter?.value };
  });

  // System settings are useful during startup, but sensitive rows are never
  // eligible for bootstrap even if the UI omits the filter.
  if (table === "system_settings" && physicalColumns.includes("is_sensitive")) {
    const keyFilter = filters.find(
      (filter) => filter.column.toLowerCase() === "key",
    );
    if (!keyFilter) {
      throw new AppError(
        "ERR_INVALID_INPUT",
        "system_settings bootstrap requires an explicit key filter",
      );
    }
    const keyValue = String(keyFilter.value ?? "").toLowerCase();
    if (
      keyFilter.operator === "LIKE" &&
      !/^[a-z0-9_.-]+%$/.test(keyValue)
    ) {
      throw new AppError(
        "ERR_INVALID_INPUT",
        "system_settings LIKE filters must use a fixed prefix",
      );
    }
    if (
      ["auth.", "system.token", "mail.", "payment."].some((prefix) =>
        keyValue.startsWith(prefix),
      )
    ) {
      throw new AppError(
        "ERR_ACCESS_DENIED",
        "Sensitive system setting namespaces cannot be bootstrapped",
      );
    }
    filters.push({ column: "is_sensitive", operator: "=", value: 0 });
  }

  return {
    table,
    storeName,
    fields,
    primaryKey,
    filters,
    limit: normalizeLimit(config.limit),
  };
}

async function validateTable(req, res, next) {
  try {
    const definition = await resolveTableDefinition(
      {
        table: req.params.resources,
        storeName: req.params.resources,
        fields: ["*"],
      },
      { purpose: "generic" },
    );
    req.params.resources = definition.table;
    req.validatedResource = definition;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = validateTable;
module.exports.resolveTableDefinition = resolveTableDefinition;
module.exports.SENSITIVE_COLUMNS = SENSITIVE_COLUMNS;
