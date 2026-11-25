const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createServer } = require("@msql-antd/framework-server");

const resources = (name) => path.join(__dirname, "resources", name);

createServer({
  paths: { logs: resources("logs"), backups: resources("backups"), uploads: resources("uploads") },
}).start();
