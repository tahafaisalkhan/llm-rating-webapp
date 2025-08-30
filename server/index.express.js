// server/index.express.js
const express = require("express");
const cors = require("cors");

// Routers connect to Mongo only inside their handlers.
const ratingsRouter = require("./routes/ratings");
const preferencesRouter = require("./routes/preferences");

module.exports = function createServer() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin: [/localhost:\d+$/i, /\.vercel\.app$/i],
    })
  );
  // Handle CORS preflight for all API routes
  app.options("/api/*", cors());

  // Health via catch-all (no DB)
  app.get("/api/_health", (_req, res) => res.json({ ok: true, via: "catch-all" }));

  // 🔎 Simple POST echo (no DB) – for debugging POST routing
  app.post("/api/_echo", (req, res) => {
    res.json({ ok: true, got: req.body || null, ts: Date.now() });
  });

  // Real routes (each handler does await connectMongo())
  app.use("/api/ratings", ratingsRouter);
  app.use("/api/preferences", preferencesRouter);

  // JSON error handler so 500s aren’t HTML
  app.use((err, _req, res, _next) => {
    console.error("Express error:", err);
    res
      .status(err.status || 500)
      .json({ ok: false, error: err.message || "Server error" });
  });

  return app;
};
