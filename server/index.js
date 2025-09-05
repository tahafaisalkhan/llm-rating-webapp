// server/index.js
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// --- Models ---
const Rating = require("./models/Rating");
const Preference = require("./models/Preference");

// --- Mongo ---
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/clinical";
const MONGO_DB = process.env.MONGODB_DB || "clinical_ratings";

mongoose
  .connect(MONGO_URI, { dbName: MONGO_DB })
  .then(() => console.log("✅ Mongo connected"))
  .catch((e) => {
    console.error("❌ Mongo connect error:", e.message);
    process.exit(1);
  });

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- Health ----------
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, via: "render-web", ts: Date.now() })
);

// ---------- RATINGS ----------
/**
 * POST /api/ratings
 * Body: { rater, modelId, datasetId, modelUsed, comparison, scores:{axis1..axis5} }
 * Single submission per (rater, modelUsed, modelId) -> 409 on duplicate
 */
app.post("/api/ratings", async (req, res) => {
  try {
    const { rater, modelId, datasetId, modelUsed, comparison, scores } = req.body || {};
    if (!rater || !modelId || !modelUsed || !scores) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const doc = await Rating.create({
        rater,
        modelId,
        datasetId: datasetId || "",
        modelUsed,
        comparison: comparison || "",
        scores,
      });
      return res.status(201).json({ ok: true, id: doc._id });
    } catch (e) {
      // unique index conflict => already submitted
      if (e && e.code === 11000) {
        return res.status(409).json({ error: "Already submitted" });
      }
      throw e;
    }
  } catch (e) {
    console.error("POST /api/ratings error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/ratings/status?modelUsed=chatgpt&modelId=...&rater=USER1
 * -> { exists: boolean }
 */
app.get("/api/ratings/status", async (req, res) => {
  try {
    const { modelUsed, modelId, rater } = req.query;
    if (!modelUsed || !modelId || !rater) return res.json({ exists: false });

    const hit = await Rating.findOne({ modelUsed, modelId, rater }).lean();
    res.json({ exists: !!hit });
  } catch (e) {
    console.error("GET /api/ratings/status error:", e);
    res.json({ exists: false });
  }
});

// ---------- PREFERENCES ----------
/**
 * POST /api/preferences
 * Body: { rater, comparison, set1Id, set2Id, result(1|2) }
 * Single submission per (rater, comparison) -> 409 on duplicate
 */
app.post("/api/preferences", async (req, res) => {
  try {
    const { rater, comparison, set1Id, set2Id, result } = req.body || {};
    if (!rater || !comparison || !result) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (![1, 2].includes(Number(result))) {
      return res.status(400).json({ error: "result must be 1 or 2" });
    }

    try {
      const doc = await Preference.create({
        rater,
        comparison,
        set1Id: set1Id || "",
        set2Id: set2Id || "",
        result: Number(result),
      });
      return res.status(201).json({ ok: true, id: doc._id });
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(409).json({ error: "Already submitted" });
      }
      throw e;
    }
  } catch (e) {
    console.error("POST /api/preferences error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/preferences/status?comparison=...&rater=USER1
 * -> { exists: boolean, result?: 1|2 }
 */
app.get("/api/preferences/status", async (req, res) => {
  try {
    const { comparison, rater } = req.query;
    if (!comparison || !rater) return res.json({ exists: false });

    const hit = await Preference.findOne({ comparison, rater }).lean();
    res.json(hit ? { exists: true, result: hit.result } : { exists: false });
  } catch (e) {
    console.error("GET /api/preferences/status error:", e);
    res.json({ exists: false });
  }
});

// ---------- Serve the built frontend ----------
const DIST_DIR = path.join(__dirname, "..", "dist");
app.use(express.static(DIST_DIR));

// SPA fallback (except for /api/*)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
