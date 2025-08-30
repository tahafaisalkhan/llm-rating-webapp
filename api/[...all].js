// api/[...all].js
const serverless = require("serverless-http");
const createServer = require("../server/index.express");

// Boot the Express app (no DB work here)
const app = createServer();
console.log("Catch-all lambda booted"); // should appear in Vercel Runtime Logs on cold start

module.exports = serverless(app);
