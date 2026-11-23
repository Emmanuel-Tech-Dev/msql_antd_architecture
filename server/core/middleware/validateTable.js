const AppError = require("../../shared/helpers/AppError");
const Model = require("../model/model");
const { SENSITIVE_GENERIC_TABLES } = require("../config/lookupRegistry");

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
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

// The table behind /api/:resources: it must exist, must not be one kept out
// of the generic API, and only its non-sensitive columns are readable or
// writable.
async function resolveTableDefinition(requestedTable) {
  const table = String(requestedTable ?? "").trim().toLowerCase();
  if (!IDENTIFIER.test(table)) {
    throw new AppError("ERR_INVALID_INPUT", "Invalid table name");
  }

  if (SENSITIVE_GENERIC_TABLES.has(table)) {
    throw new AppError("ERR_ACCESS_DENIED", null, {
      message: "This resource is not available through the generic API",
      resource: table,
    });
  }

  const model = new Model();
  if (!(await model.tableExists(table))) {
    throw new AppError("ERR_NOT_FOUND", "Requested table or view was not found");
  }

  const fields = (await model.getTableColumns(table)).filter(
    (column) => !SENSITIVE_COLUMNS.has(column.toLowerCase()),
  );
  if (!fields.length) {
    throw new AppError("ERR_ACCESS_DENIED", "No readable columns are available");
  }

  return {
    table,
    fields,
    primaryKey: await model.getTablePrimaryKey(table),
  };
}

async function validateTable(req, res, next) {
  try {
    const definition = await resolveTableDefinition(req.params.resources);
    req.params.resources = definition.table;
    req.validatedResource = definition;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = validateTable;
module.exports.SENSITIVE_COLUMNS = SENSITIVE_COLUMNS;
