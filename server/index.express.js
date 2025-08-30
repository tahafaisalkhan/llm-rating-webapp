// server/index.express.js
const express = require("express");
const cors = require("cors");

// IMPORTANT: these routers call connectMongo() internally.
// This file must NOT call mongoose.connect() or import a module that does so at top-level.
const ratingsRouter = require("./routes/ratings");
const preferencesRouter = require("./routes/preferences");

module.exports = function createServer() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: [/localhost:\d+$/, /\.vercel\.app$/],
    })
  );

  // Health must NOT depend on DB
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // API routes (each route connects when needed)
  app.use("/api/ratings", ratingsRouter);
  app.use("/api/preferences", preferencesRouter);

  return app;
};
