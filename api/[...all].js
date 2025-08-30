// api/[...all].js
const serverless = require("serverless-http");
const createServer = require("../server/index.express"); // your Express factory

const app = createServer();
module.exports = serverless(app);
