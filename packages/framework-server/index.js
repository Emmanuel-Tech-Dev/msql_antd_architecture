// @msql-antd/framework-server: what a project's server code can use.
// Everything except createServer loads on first use, so the folders passed to
// createServer({ paths }) are in place before the logger or backups start.
const { createServer } = require("./createServer");

const lazy = (load) => ({ enumerable: true, get: load });

module.exports = Object.defineProperties({ createServer }, {
  // Data
  Model: lazy(() => require("./core/model/model")),
  db: lazy(() => require("./core/config/conn")),
  BaseService: lazy(() => require("./core/lib/baseService")),
  metadata: lazy(() => require("./core/lib/metadataService")),
  schemaCache: lazy(() => require("./core/lib/schemaCache")),

  // Requests and errors
  AppError: lazy(() => require("./shared/helpers/AppError")),
  ERROR_CODES: lazy(() => require("./shared/helpers/erroCodes")),
  validateRequest: lazy(() => require("./core/middleware/validateRequest")),
  validateTable: lazy(() => require("./core/middleware/validateTable")),
  uploads: lazy(() => require("./core/config/multer")),

  // Access
  authorization: lazy(() => require("./core/middleware/authorization")),
  abac: lazy(() => require("./core/lib/abacEngine")),
  authorizationEvents: lazy(() => require("./core/lib/authorizationEvents")),

  // Shared helpers
  logger: lazy(() => require("./shared/helpers/logger")),
  utils: lazy(() => require("./shared/utils/functions")),
  CacheManager: lazy(() => require("./shared/helpers/cacheManager")),
  SettingsManager: lazy(() => require("./core/lib/systemSettings")),
  realtime: lazy(() => require("./core/realtime/socketServer")),
  migrations: lazy(() => require("./core/lib/migrationRunner")),
});
