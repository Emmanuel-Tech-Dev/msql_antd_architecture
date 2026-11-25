const { getLookupOptions, getTableMetadata, uploadFieldFile } = require("../core/lib/metadataService");
const { metadataFieldUpload } = require("../core/config/multer");

class MetadataRoute {
  constructor(app) {
    this.tableMetadata(app);
    this.lookupOptions(app);
    this.fieldUpload(app);
  }

  tableMetadata(app) {
    app.get("/api/v1/metadata/:table", async (req, res) => {
      const data = await getTableMetadata(req.params.table, {
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

  fieldUpload(app) {
    app.post("/api/v1/uploads/:table/:column", metadataFieldUpload.single("file"), async (req, res) => {
      const data = await uploadFieldFile(req.params.table, req.params.column, req.file, {
        permissions: req.permissions,
        privileged: req.isPrivileged,
        actorId: req.user?.sub,
      });
      res.status(201).json({
        status: "ok",
        message: "File uploaded",
        data,
      });
    });
  }
}

module.exports = MetadataRoute;
