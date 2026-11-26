const utils = require("../../shared/utils/functions");
const AppError = require("../../shared/helpers/AppError");
const Model = require("../model/model");
const { throwFieldErrors, validateRecordAgainstMetadata } = require("./metadataSchema");
const { getLookupColumns } = require("../config/lookupRegistry");
const { releaseRecordFiles, syncRecordFiles } = require("./uploadTracking");

const { isSensitiveColumn } = require("../config/sensitiveData");

const MAX_BULK_DELETE = 500;

class BaseService {
  constructor(request, response) {
    this.request = request;
    this.response = response;
  }

  // The signed-in user's permissions: writes through the generic API are a
  // user's request, so the metadata's user-only rules apply.
  access() {
    return { permissions: this.request.permissions ?? [], privileged: Boolean(this.request.isPrivileged) };
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
      exclude: [
        ...(options.exclude || []),
        ...(headerConfig.exclude || []),
        ...(this.request.validatedResource?.restricted ?? []),
      ],
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
    const readableColumns = this.request.validatedResource?.fields ?? [];
    if (
      !readableColumns.includes(column) ||
      isSensitiveColumn(column)
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
        exclude: this.request.validatedResource?.restricted ?? [],
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
    const { record, errors } = await validateRecordAgainstMetadata(
      resources,
      this.validateWriteRecord(payload),
      { mode: "create", access: this.access() },
    );
    if (Object.keys(errors).length) throwFieldErrors(errors);
    const result = await new Model().insert(resources, record).execute();
    const primaryKey = this.request.validatedResource?.primaryKey;
    await syncRecordFiles(resources, result.insertId || record[primaryKey], {}, record);
    return result;
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
    const records = [];
    const errors = {};
    for (const [index, item] of payload.entries()) {
      const checked = await validateRecordAgainstMetadata(
        resources,
        this.validateWriteRecord(item),
        { mode: "create", access: this.access() },
      );
      records.push(checked.record);
      for (const [column, message] of Object.entries(checked.errors)) {
        errors[`${index}.${column}`] = `Record ${index + 1}: ${message}`;
      }
    }
    if (Object.keys(errors).length) throwFieldErrors(errors);
    const result = await new Model().bulkInsert(resources, records).execute();
    const primaryKey = this.request.validatedResource?.primaryKey;
    for (const record of records) await syncRecordFiles(resources, record[primaryKey] ?? null, {}, record);
    return result;
  }

  async updateRecord(payload, existing = {}) {
    const { resources, id } = this.request.params;
    const primaryKey = this.request.validatedResource?.primaryKey;
    if (!primaryKey) {
      throw new AppError("ERR_INVALID_INPUT", "Resource has no primary key");
    }
    const { record, errors } = await validateRecordAgainstMetadata(
      resources,
      this.validateWriteRecord(payload),
      { mode: "update", existing, access: this.access() },
    );
    if (Object.keys(errors).length) throwFieldErrors(errors);
    const writableRecord = { ...record };
    delete writableRecord[primaryKey];
    if (Object.keys(writableRecord).length === 0) {
      throw new AppError(
        "ERR_INVALID_INPUT",
        "No editable fields were provided",
      );
    }
    const result = await new Model()
      .update(resources, writableRecord)
      .where(primaryKey, "=", id)
      .execute();
    await syncRecordFiles(resources, id, existing, writableRecord);
    return result;
  }

  // `existing` is the record as it was, so its files can be released.
  async deleteRecord(payload, existing = {}) {
    const primaryKey = this.request.validatedResource?.primaryKey;
    if (!primaryKey) {
      throw new AppError("ERR_INVALID_INPUT", "Resource has no primary key");
    }
    const result = await new Model()
      .delete(payload?.resources)
      .where(primaryKey, "=", payload?.id)
      .execute();
    if (result.affectedRows) await releaseRecordFiles(payload?.resources, existing);
    return result;
  }

  // Deletes several records of the table in one transaction: all of them or,
  // if one cannot be deleted (a foreign key, say), none. Ids that match no
  // record are reported, not treated as an error.
  async deleteMany(ids) {
    const { resources: table } = this.request.params;
    const primaryKey = this.request.validatedResource?.primaryKey;
    if (!primaryKey) {
      throw new AppError("ERR_INVALID_INPUT", "Resource has no primary key");
    }
    const wanted = utils.uniqueIds(Array.isArray(ids) ? ids : []);
    if (!wanted.length || wanted.length > MAX_BULK_DELETE) {
      throw new AppError("ERR_VALIDATION_FAILED", `Send between 1 and ${MAX_BULK_DELETE} ids to delete`);
    }

    const existing = await new Model()
      .select(this.request.validatedResource?.fields ?? ["*"], table)
      .whereIn(primaryKey, wanted)
      .execute();
    if (!existing.length) return { deleted: 0, missing: wanted };

    const found = existing.map((row) => row[primaryKey]);
    const result = await new Model().transaction((tx) => tx.builder().delete(table).whereIn(primaryKey, found).executeInTransaction());
    for (const record of existing) await releaseRecordFiles(table, record);

    const foundIds = new Set(found.map(String));
    return { deleted: result.affectedRows, missing: wanted.filter((id) => !foundIds.has(id)) };
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
