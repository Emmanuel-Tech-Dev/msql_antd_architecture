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

    const model = await new Model()
      .select(["*"], resources)
      .tableQueryParams(query, resolvedOptions);

    const res = await model.paginate();

    return res;
  }

  async findAll() {
    const { resources } = this.request.params;
    const query = this.request.query;

    // console.log(res);
    const res = await new Model().select(["*"], resources).execute();
    // .applyQueryParams(query, options)
    // .paginate(paginate?.page, paginate?.limit);
    const data = utils.removePasswordFromObject(res);

    return data;
  }

  async findAllWithParams(options = {}) {
    // console.log(options);
    const { resources } = this.request.params;

    const { paginate } = options;
    console.log(options);

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
}

module.exports = BaseService;
