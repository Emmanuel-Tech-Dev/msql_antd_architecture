const utils = require("../../shared/utils/functions");
const AppError = require("../../shared/helpers/AppError");
const Model = require("../model/model");
const { getLookupColumns } = require("../config/lookupRegistry");
const { resolveTableDefinition } = require("../middleware/validateTable");

const SENSITIVE_COLUMNS = new Set([
  "password",
  "password_hash",
  "access_token",
  "refresh_token",
  "reset_token",
  "otp_secret",
  "secret",
  "api_key",
  "private_key",
]);

class BaseService {
  constructor(request, response) {
    this.request = request;
    this.response = response;
  }

  validateWriteRecord(payload) {
    if (!payload || Array.isArray(payload) || typeof payload !== "object") {
      throw new AppError("ERR_INVALID_INPUT", "Record must be an object");
    }
    if (Object.keys(payload).length === 0) {
      throw new AppError(
        "ERR_INVALID_INPUT",
        "Record must contain at least one field",
      );
    }

    const writableColumns = this.request.validatedResource?.fields ?? [];
    const invalidColumn = Object.keys(payload).find(
      (column) => !writableColumns.includes(column),
    );
    if (invalidColumn) {
      throw new AppError("ERR_ACCESS_DENIED", null, {
        message: `Column ${invalidColumn} is not writable through the generic API`,
      });
    }
    return payload;
  }

  async findAllWithTable(options = {}) {
    const { resources } = this.request.params;
    const readableFields = this.request.validatedResource?.fields ?? ["*"];
    const query = this.request.query;
    let headerConfig = {};
    const raw = this.request.headers["x-table-config"];

    if (raw) {
      try {
        headerConfig = JSON.parse(raw);
      } catch {
        throw new AppError("ERR_INVALID_INPUT", "Invalid table configuration");
      }
    }

    const resolvedOptions = {
      // The route resource is authoritative. Browser headers cannot redirect
      // schema discovery or raw/full-text expressions to another table.
      table: resources,
      maxLimit: utils.clampInteger(
        options.maxLimit ?? headerConfig.maxLimit,
        100,
        500,
      ),
      defaultLimit: utils.clampInteger(
        options.defaultLimit ?? headerConfig.defaultLimit,
        20,
        100,
      ),
      searchable: options.searchable ?? headerConfig.searchable ?? [],
      filterable: options.filterable ?? null,
      sortable: options.sortable ?? null,
      fullTextSearch: options.fullTextSearch ?? null,
      exclude: [...(options.exclude || []), ...(headerConfig.exclude || [])],
    };

    const model = await new Model()
      .select(readableFields, resources)
      .tableQueryParams(query, resolvedOptions);

    const result = await model.paginate(query?.page, query?.limit);
    return utils.redactSensitiveData(result);
  }

  async findAll() {
    const { resources } = this.request.params;
    const readableFields = this.request.validatedResource?.fields ?? ["*"];
    const query = this.request.query;
    const result = await new Model()
      .select(readableFields, resources)
      .paginate(query?.page, query?.limit);

    return utils.redactSensitiveData(result);
  }

  async getColFilters() {
    const { resources } = this.request.params;
    let headerConfig = {};
    const raw = this.request.headers["x-table-config"];

    if (raw) {
      try {
        headerConfig = JSON.parse(raw);
      } catch {
        throw new AppError("ERR_INVALID_INPUT", "Invalid filter configuration");
      }
    }

    const column = headerConfig.col;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column ?? "")) {
      throw new AppError("ERR_INVALID_INPUT", "Invalid filter column");
    }

    const model = new Model();
    const tableColumns = await model.getTableColumns(resources);
    if (
      !tableColumns.includes(column) ||
      SENSITIVE_COLUMNS.has(column.toLowerCase())
    ) {
      throw new AppError("ERR_ACCESS_DENIED", "Filter column is not available");
    }

    const result = await model.select([column], resources).execute();
    return utils.redactSensitiveData(result);
  }

  async findAllWithParams(options = {}) {
    const { resources } = this.request.params;
    const readableFields = this.request.validatedResource?.fields ?? ["*"];
    const paginate = options?.paginate ?? {};
    const model = await new Model()
      .select(readableFields, resources)
      .tableQueryParams(this.request.query, {
        table: resources,
        maxLimit: 100,
        defaultLimit: 20,
      });
    const result = await model.paginate(paginate.page, paginate.limit);

    return utils.redactSensitiveData(result);
  }

  async findOne(payload) {
    const readableFields = this.request.validatedResource?.fields ?? ["*"];
    const primaryKey = this.request.validatedResource?.primaryKey;
    if (!primaryKey) {
      throw new AppError("ERR_INVALID_INPUT", "Resource has no primary key");
    }
    const result = await new Model()
      .select(readableFields, payload?.resources)
      .where(primaryKey, "=", payload?.id)
      .execute();
    return utils.redactSensitiveData(result[0]);
  }

  async create(payload) {
    const { resources } = this.request.params;
    return new Model()
      .insert(resources, this.validateWriteRecord(payload))
      .execute();
  }

  async bulkCreate(payload) {
    const { resources } = this.request.params;
    if (
      !Array.isArray(payload) ||
      payload.length === 0 ||
      payload.length > 500
    ) {
      throw new AppError(
        "ERR_INVALID_INPUT",
        "Bulk records must contain between 1 and 500 items",
      );
    }
    const records = payload.map((record) => this.validateWriteRecord(record));
    return new Model().bulkInsert(resources, records).execute();
  }

  async updateRecord(payload) {
    const { resources, id } = this.request.params;
    const primaryKey = this.request.validatedResource?.primaryKey;
    if (!primaryKey) {
      throw new AppError("ERR_INVALID_INPUT", "Resource has no primary key");
    }
    const writableRecord = { ...this.validateWriteRecord(payload) };
    delete writableRecord[primaryKey];
    if (Object.keys(writableRecord).length === 0) {
      throw new AppError(
        "ERR_INVALID_INPUT",
        "No editable fields were provided",
      );
    }
    return new Model()
      .update(resources, writableRecord)
      .where(primaryKey, "=", id)
      .execute();
  }

  async deleteRecord(payload) {
    const primaryKey = this.request.validatedResource?.primaryKey;
    if (!primaryKey) {
      throw new AppError("ERR_INVALID_INPUT", "Resource has no primary key");
    }
    return new Model()
      .delete(payload?.resources)
      .where(primaryKey, "=", payload?.id)
      .execute();
  }

  async bootstrap(payload = {}) {
    const configs = Array.isArray(payload.tables) ? payload.tables : [];
    if (!configs.length || configs.length > 20) {
      throw new AppError(
        "ERR_INVALID_INPUT",
        "Bootstrap requires between 1 and 20 table configurations",
      );
    }
    const results = {};
    const storeNames = new Set();

    for (const config of configs) {
      const definition = await resolveTableDefinition(config, {
        purpose: "bootstrap",
        roles: this.request.roles,
        permissions: this.request.permissions,
      });
      if (storeNames.has(definition.storeName)) {
        throw new AppError(
          "ERR_INVALID_INPUT",
          `Duplicate bootstrap store name: ${definition.storeName}`,
        );
      }
      storeNames.add(definition.storeName);
      const model = new Model().select(definition.fields, definition.table);
      for (const filter of definition.filters) {
        model.where(filter.column, filter.operator, filter.value);
      }
      const rows = await model.limit(definition?.limit).execute();
      results[definition.storeName] = utils.redactSensitiveData(rows);
    }

    return results;
  }

  async lookup(payload = {}) {
    const { table, fields, where, limit } = payload.lookup ?? {};
    const allowedColumns = getLookupColumns(table);

    if (!allowedColumns) {
      throw new AppError("ERR_ACCESS_DENIED", "Lookup is not registered");
    }

    const requestedFields = Array.isArray(fields) ? fields : [];
    if (
      requestedFields.length === 0 ||
      requestedFields.some((field) => !allowedColumns.includes(field))
    ) {
      throw new AppError("ERR_INVALID_INPUT", "Lookup fields are not allowed");
    }

    const model = new Model().select(requestedFields, table);

    if (where) {
      if (!allowedColumns.includes(where.column)) {
        throw new AppError("ERR_INVALID_INPUT", "Lookup filter is not allowed");
      }
      model.where(where.column, "=", where.value);
    }

    const rows = await model
      // .limit(utils.clampInteger(limit, 500, 500))
      .execute();
    return utils.redactSensitiveData(rows);
  }
}

module.exports = BaseService;
