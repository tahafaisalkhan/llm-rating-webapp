// api/index.js
const serverless = require("serverless-http");
const path = require("path");

// Load your existing Express server app:
require("dotenv").config(); // Vercel also injects envs, this is fine locally
const createServer = require("../server/index.express");
// ^ We'll create this tiny exporter in step 2

const app = createServer();

module.exports = serverless(app);
