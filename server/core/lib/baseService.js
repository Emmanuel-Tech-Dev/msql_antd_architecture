const utils = require("../../shared/utils/functions");

const Model = require("../model/model");

class BaseService {
  constructor(request, response) {
    this.request = request;
    this.response = response;
  }

  async findAllWithTable(options = {}) {
    const { resources } = this.request.params;
    const query = this.request.query;
    let headerConfig = {};
    const raw = this.request.headers["x-table-config"];
    if (raw) {
      try {
        headerConfig = JSON.parse(raw);
      } catch {
        console.warn("⚠ Invalid x-table-config header");
      }
    }

    // Direct options passed to findAllWithTable() always win
    const resolvedOptions = {
      table: options.table ?? headerConfig.table ?? resources,
      maxLimit: options.maxLimit ?? headerConfig.maxLimit ?? 100,
      defaultLimit: options.defaultLimit ?? headerConfig.defaultLimit ?? 20,
      searchable: options.searchable ?? headerConfig.searchable ?? [],
      filterable: options.filterable ?? headerConfig.filterable ?? null,
      sortable: options.sortable ?? headerConfig.sortable ?? null,
      fullTextSearch:
        options.fullTextSearch ?? headerConfig.fullTextSearch ?? null,
      exclude: [...(options.exclude || []), ...(headerConfig.exclude || [])],
    };

    // console.log(query);
    const model = await new Model()
      .select(["*"], resources)
      .tableQueryParams(query, resolvedOptions);

    const res = await model.paginate(query?.page, query?.limit);

    return res;
  }
  async findAll() {
    const { resources } = this.request.params;
    const query = this.request.query;

    // console.log(res);
    const res = await new Model()
      .select(["*"], resources)
      .paginate(query?.page, query?.limit);
    const data = utils.removePasswordFromObject(res);

    return data;
  }

  async getColFilters() {
    const { resources } = this.request.params;
    let headerConfig = {};
    const raw = this.request.headers["x-table-config"];
    // console.log(raw);
    if (raw) {
      try {
        headerConfig = JSON.parse(raw);
      } catch {
        console.warn("⚠ Invalid x-table-config header");
      }
    }

    // console.log(headerConfig);
    // return;
    const res = await new Model()
      .select([headerConfig?.col], resources)
      .execute();

    const data = utils.removePasswordFromObject(res);

    return data;
  }
  async findAllWithParams(options = {}) {
    // console.log(options);
    const { resources } = this.request.params;

    const { paginate } = options;
    // console.log(options);

    const res = await new Model()
      .select(["*"], resources)
      .applyQueryParams(this.request.query, options)
      .paginate(paginate?.page, paginate?.limit);
    // .execute();

    return res;
  }

  async findOne(payload) {
    const res = await new Model()
      .select(["*"], payload?.resources)
      .where("id", "=", payload?.id)
      .execute();
    return res[0];
  }

  async create(payload) {
    const { resources } = this.request.params;
    const res = await new Model().insert(resources, payload).execute();

    return res;
  }

  async bulkCreate(payload) {
    const { resources } = this.request.params;
    const res = await new Model().bulkInsert(resources, payload).execute();

    return res;
  }

  async updateRecord(payload) {
    const { resources, id } = this.request.params;
    const res = await new Model()
      .update(resources, payload)
      .where("id", "=", id)
      .execute();

    return res;
  }

  async deleteRecord(payload) {
    const res = await new Model()
      .delete(payload?.resources)
      .where("id", "=", payload?.id)
      .execute();

    return res;
  }

  async bootstrap(payload) {
    // handle both single config and array of configs
    const configs = Array.isArray(payload?.tables) ? payload.tables : [payload];

    const results = {};

    for (const config of configs) {
      const { table, storeName, critfdx, critval, fields, sql } = config;

      let column = fields?.length ? fields : ["*"];
      let res;

      // ✅ build where conditions in the shape your where() method expects
      let where = [];
      if (
        critfdx &&
        Array.isArray(critfdx) &&
        Array.isArray(critval) &&
        critfdx.length === critval.length &&
        critfdx.length > 0
      ) {
        where = critfdx.map((col, index) => ({
          column: col, // ✅ was { [v]: critval[index] } — wrong shape
          operator: "=",
          value: critval[index],
        }));
      }

      if (sql) {
        res = await new Model().setSql(sql).execute();
      } else if (where.length) {
        res = await new Model()
          .select(column, table)
          .where(where, "=", null)
          .execute();
      } else {
        res = await new Model().select(column, table).execute();
      }

      // ✅ key result by storeName so frontend can map it back
      results[storeName] = res;
    }

    // ✅ was missing return
    return results;
  }
}

module.exports = BaseService;
