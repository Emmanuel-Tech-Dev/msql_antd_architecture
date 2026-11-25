require("dotenv").config();

const { createServer } = require("./createServer");

createServer().start();
