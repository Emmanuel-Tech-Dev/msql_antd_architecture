const validateTable = require("../core/middleware/validateTable");
const BaseService = require("../core/lib/baseService");
const { loadBootstrapProfile } = require("../core/lib/bootstrapService");
const AppError = require("../shared/helpers/AppError");
// const authMiddleWare = require("../core/middleware/authMiddleWare");
// const authorization = require("../core/middleware/authorization");
const utils = require("../shared/utils/functions");

class BaseRoute {
  constructor(app) {
    this.app = app;

    // this.init(app);

    this.findAll(app);
    this.findWithParams(app);
    // Static GET routes must precede /api/:resources/:id.
    this.getTableData(app);
    this.getColFilters(app);
    this.findOne(app);
    this.create(app);
    this.bulkCreate(app);
    this.update(app);
    this.updateSome(app);
    this.delete(app);
    this.deleteMany(app);
    this.bootstrap(app);
    this.getExtraMetaList(app);

    return this;
  }

  // async init(app) {
  //   app.use(authMiddleWare);
  //   //app.use(authorization);
  // }

  findAll(app) {
    app.get("/api/:resources", validateTable, async (req, res) => {
      const service = new BaseService(req, res);
      // const name = utils.genInstituitionCode(
      //   "Kwame Nkrumah University of Science and Technology",
      //   "Kumasi",
      // );
      // console.log(name);
      const data = await service.findAll();
      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data: data,
      });
    });
  }

  getTableData(app) {
    app.get("/api/:resources/table", validateTable, async (req, res) => {
      const service = new BaseService(req, res);
      const data = await service.findAllWithTable();

      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data,
      });
    });
  }

  getColFilters(app) {
    app.get("/api/:resources/filters", validateTable, async (req, res) => {
      const service = new BaseService(req, res);
      const data = await service.getColFilters();
      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data,
      });
    });
  }

  findWithParams(app) {
    // Support both GET and POST for query endpoint. GET is handy for URL-based filters
    app.post("/api/:resources/query", validateTable, async (req, res) => {
      const service = new BaseService(req, res);

      const data = await service.findAllWithParams(req.body || {});

      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data: data,
      });
    });
    // app.get("/api/:resources/query", validateTable, handler);
  }

  findOne(app) {
    app.get("/api/:resources/:id", validateTable, async (req, res) => {
      const service = new BaseService(req, res);
      const data = await service.findOne(req.params);
      if (!data) throw new AppError("ERR_NOT_FOUND");

      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data,
      });
    });
  }

  create(app) {
    app.post("/api/:resources", validateTable, async (req, res) => {
      const service = new BaseService(req, res);

      if (!req.body) {
        // loggerService.smartError(new Error("Missing required fields"), {
        //     status : 400,

        // })
        throw new AppError("ERR_BAD_REQUEST");
      }
      const data = await service.create(req.body);

      res.status(201).json({
        status: "ok",
        message: "Operation Successful!",
        data,
        details: "Resource created successfully",
      });
    });
  }

  bulkCreate(app) {
    app.post("/api/:resources/bulk", validateTable, async (req, res) => {
      const service = new BaseService(req, res);
      // console.log(req.body, req.params.resources);

      if (!req.body) {
        throw new AppError("ERR_BAD_REQUEST");
      }

      const data = await service.bulkCreate(req.body);

      return res.status(201).json({
        status: "ok",
        message: "Operation Successful!",
        data,
        details: "Resource created successfully",
      });
    });
  }

  update(app) {
    app.put("/api/:resources/:id", validateTable, async (req, res) => {
      const service = new BaseService(req, res);

      const data = await service.findOne(req.params);
      if (!data) {
        throw new AppError("ERR_NOT_FOUND");
      }

      const result = await service.updateRecord(req.body, data);

      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data: result,
        details: "Resource updated successfully",
      });
    });
  }
  updateSome(app) {}

  delete(app) {
    app.delete("/api/:resources/:id", validateTable, async (req, res) => {
      // console.log(req.params);
      // const {id} = req.params
      // return;
      const service = new BaseService(req, res);

      const data = await service.findOne(req.params);
      if (!data) {
        throw new AppError("ERR_NOT_FOUND");
      }

      const result = await service.deleteRecord(req.params, data);

      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data: result,
        details: "Resource deleted successfully",
      });
    });
  }

  // DELETE /api/:resources with { ids }: the selected records, together.
  deleteMany(app) {
    app.delete("/api/:resources", validateTable, async (req, res) => {
      const service = new BaseService(req, res);
      const data = await service.deleteMany(req.body?.ids);
      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data,
        details: `${data.deleted} deleted`,
      });
    });
  }

  bootstrap(app) {
    app.post("/api/v1/bootstrap", async (req, res) => {
      if (req.body?.tables) {
        throw new AppError("ERR_INVALID_INPUT", "Bootstrap takes a profile key, not a table list");
      }
      const { stores, unavailable } = await loadBootstrapProfile(req.body?.profile, {
        permissions: req.permissions,
        privileged: req.isPrivileged,
      });
      res.json({
        success: true,
        data: stores,
        unavailable,
      });
    });
  }

  getExtraMetaList(app) {
    app.post("/api/v1/extra_meta_options", async (req, res) => {
      const service = new BaseService(req, res);
      const result = await service.lookup(req.body);

      res.json({
        details: result,
      });
    });
  }
}

module.exports = BaseRoute;
