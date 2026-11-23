const { getLookupOptions, getTableMetadata } = require("../core/lib/metadataService");

class MetadataRoute {
  constructor(app) {
    this.tableMetadata(app);
    this.lookupOptions(app);
  }

  tableMetadata(app) {
    app.get("/api/v1/metadata/:table", async (req, res) => {
      const data = await getTableMetadata(req.params.table);
      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data,
      });
    });
  }

  lookupOptions(app) {
    app.get("/api/v1/lookups/:key", async (req, res) => {
      const data = await getLookupOptions(req.params.key, {
        parent: req.query.parent,
        permissions: req.permissions,
        privileged: req.isPrivileged,
      });
      res.status(200).json({
        status: "ok",
        message: "Operation Successful!",
        data,
      });
    });
  }
}

module.exports = MetadataRoute;
