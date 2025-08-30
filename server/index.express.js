// server/index.express.js
const express = require("express");
const cors = require("cors");

// ⛔️ Do NOT import anything that connects to Mongo at top-level.
// Routers below should connect inside each handler via connectMongo().
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

  // Health via the catch-all app (no DB)
  app.get("/api/_health", (_req, res) => res.json({ ok: true, via: "catch-all" }));

  // Real routes (each connects to DB inside the handler)
  app.use("/api/ratings", ratingsRouter);
  app.use("/api/preferences", preferencesRouter);

  return app;
};

app.post("/api/_echo", (req, res) => {
  res.json({ ok: true, got: req.body || null, ts: Date.now() });
});
