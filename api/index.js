// api/index.js
const serverless = require("serverless-http");
const createServer = require("../server/index.express"); // <- see next file

const app = createServer();
module.exports = serverless(app);
