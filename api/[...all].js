const serverless = require("serverless-http");
const createServer = require("../server/index.express");

const app = createServer();
module.exports = serverless(app);
