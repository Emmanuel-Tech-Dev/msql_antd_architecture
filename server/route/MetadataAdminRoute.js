const fs = require("fs");
const path = require("path");
const admin = require("../core/lib/metadataAdminService");
const { previewLookup } = require("../core/lib/metadataService");

const MIGRATIONS = path.resolve(__dirname, "../resources/migrations");

// The next free migration number, for the name of a downloaded migration.
function nextMigrationName(slug) {
  const numbers = fs.readdirSync(MIGRATIONS).map((file) => Number.parseInt(file, 10)).filter(Number.isFinite);
  return `${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}_${slug}.sql`;
}

const ok = (res, data, message = "Operation Successful!", status = 200) => res.status(status).json({ status: "ok", message, data });

// Settings › Data model. Every endpoint needs manage:metadata (migration 025
// maps /api/v1/metadata-admin/* to it).
class MetadataAdminRoute {
  constructor(app) {
    this.tables(app);
    this.definitions(app);
    this.versions(app);
    this.lookups(app);
    this.newTable(app);
    this.recordImport(app);
  }

  tables(app) {
    app.get("/api/v1/metadata-admin/tables", async (req, res) => ok(res, await admin.listTables()));
    app.get("/api/v1/metadata-admin/tables/:table/scaffold", async (req, res) => ok(res, await admin.scaffoldTable(req.params.table)));
  }

  definitions(app) {
    app.get("/api/v1/metadata-admin/tables/:table", async (req, res) => ok(res, await admin.getDefinition(req.params.table)));
    app.put("/api/v1/metadata-admin/tables/:table", async (req, res) => {
      const saved = await admin.saveDefinition(req.params.table, req.body ?? {}, { actorUserId: req.user.sub });
      ok(res, saved, `Saved as version ${saved.version}`);
    });
    app.get("/api/v1/metadata-admin/tables/:table/export", async (req, res) => {
      const exported = await admin.exportDefinition(req.params.table);
      ok(res, { ...exported, fileName: nextMigrationName(`describe_${req.params.table}`) });
    });
  }

  versions(app) {
    app.get("/api/v1/metadata-admin/tables/:table/versions", async (req, res) => ok(res, await admin.listVersions(req.params.table)));
    app.post("/api/v1/metadata-admin/tables/:table/versions/:version/restore", async (req, res) => {
      const restored = await admin.restoreVersion(req.params.table, req.params.version, { actorUserId: req.user.sub });
      ok(res, restored, `Version ${req.params.version} restored as version ${restored.version}`);
    });
  }

  lookups(app) {
    app.get("/api/v1/metadata-admin/lookups", async (req, res) => ok(res, await admin.listLookups()));
    app.post("/api/v1/metadata-admin/lookups/preview", async (req, res) => {
      ok(res, await previewLookup(req.body?.lookup ?? {}, { parent: req.body?.parent }));
    });
    app.put("/api/v1/metadata-admin/lookups/:key", async (req, res) => {
      ok(res, await admin.saveLookup(req.params.key, req.body ?? {}, { actorUserId: req.user.sub }), "Lookup saved");
    });
  }

  newTable(app) {
    app.post("/api/v1/metadata-admin/new-table", async (req, res) => {
      const { sql } = await admin.newTableSql(req.body ?? {});
      ok(res, { sql, fileName: nextMigrationName(`create_${req.body.table}`) });
    });
  }

  recordImport(app) {
    app.post("/api/v1/metadata-admin/import/:table/check", async (req, res) => {
      ok(res, await admin.checkRecords(req.params.table, req.body?.rows));
    });
    app.post("/api/v1/metadata-admin/import/:table", async (req, res) => {
      const imported = await admin.importRecords(req.params.table, req.body?.rows, {
        skipProblems: req.body?.skipProblems !== false,
        actorUserId: req.user.sub,
      });
      ok(res, imported, `${imported.imported} records imported`, 201);
    });
  }
}

module.exports = MetadataAdminRoute;
