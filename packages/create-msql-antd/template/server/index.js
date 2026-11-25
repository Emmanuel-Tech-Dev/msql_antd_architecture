const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createServer } = require("@msql-antd/framework-server");

const resources = (name) => path.join(__dirname, "resources", name);

createServer({
  // Your own route classes: each `new Route(app)`, registered after sign-in and
  // authorization. Example: routes: [require("./route/InvoiceRoute")]
  routes: [],
  // The UI's addresses. ALLOWED_ORIGINS in .env adds more.
  origins: [process.env.CLIENT_URL].filter(Boolean),
  paths: {
    logs: resources("logs"),
    backups: resources("backups"),
    uploads: resources("uploads"),
    migrations: path.join(__dirname, "migrations"),
  },
}).start();
