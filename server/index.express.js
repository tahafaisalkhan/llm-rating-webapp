const express = require("express");
const cors = require("cors");

// routers
const ratingsRouter = require("./routes/ratings");
const preferencesRouter = require("./routes/preferences");

module.exports = function createServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(cors({ origin: [/localhost:\d+$/, /\.vercel\.app$/] }));

  app.use("/api/ratings", ratingsRouter);
  app.use("/api/preferences", preferencesRouter);
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  return app;
};
