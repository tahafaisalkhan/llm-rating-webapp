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

// ---------- RATINGS (resubmission allowed; replace previous) ----------
/**
 * POST /api/ratings
 * Body: { rater, modelId, datasetId, modelUsed, comparison, scores:{axis1..axisN}, major_error?: boolean }
 * Rule: allow resubmission -> delete previous (rater, modelUsed, modelId) then insert new.
 */
app.post("/api/ratings", async (req, res) => {
  try {
    const { rater, modelId, datasetId, modelUsed, comparison, scores, major_error } = req.body || {};
    if (!rater || !modelId || !modelUsed || !scores) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const filter = { rater, modelUsed, modelId };
    const delResult = await Rating.deleteOne(filter);

    const doc = await Rating.create({
      rater,
      modelId,
      datasetId: datasetId || "",
      modelUsed,
      comparison: comparison || "",
      scores,
      major_error: !!major_error,
    });

    return res.status(201).json({
      ok: true,
      id: doc._id,
      replaced: (delResult?.deletedCount || 0) > 0,
    });
  } catch (e) {
    console.error("POST /api/ratings error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/ratings/status?modelUsed=gemma|medgemma&modelId=...&rater=USER
 * -> { exists: boolean, major_error?: boolean }
 */
app.get("/api/ratings/status", async (req, res) => {
  try {
    const { modelUsed, modelId, rater } = req.query;
    if (!modelUsed || !modelId || !rater) return res.json({ exists: false });

    const hit = await Rating.findOne({ modelUsed, modelId, rater }).lean();
    res.json(hit ? { exists: true, major_error: !!hit.major_error } : { exists: false });
  } catch (e) {
    console.error("GET /api/ratings/status error:", e);
    res.json({ exists: false });
  }
});

// ---------- PREFERENCES (resubmission allowed; replace previous) ----------
/**
 * POST /api/preferences
 * Body: { rater, comparison, set1Id, set2Id, result(0|1|2), strength?("weak"|"moderate"|"strong") }
 * Rule: allow resubmission -> delete previous (rater, comparison) then insert new.
 * - 0 = tie, 1 = set1, 2 = set2
 * - strength optional; ignored (set null) when result === 0 (tie)
 */
app.post("/api/preferences", async (req, res) => {
  try {
    const { rater, comparison, set1Id, set2Id, result, strength } = req.body || {};
    if (!rater || !comparison || result === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const numResult = Number(result);
    if (![0, 1, 2].includes(numResult)) {
      return res.status(400).json({ error: "result must be 0 (tie), 1, or 2" });
    }

    let normalizedStrength = null;
    if (numResult !== 0 && strength != null) {
      const s = String(strength).toLowerCase();
      if (!["weak", "moderate", "strong"].includes(s)) {
        return res.status(400).json({ error: "strength must be weak|moderate|strong when provided" });
      }
      normalizedStrength = s;
    }

    const filter = { rater, comparison };
    const delResult = await Preference.deleteOne(filter);

    const doc = await Preference.create({
      rater,
      comparison,
      set1Id: set1Id || "",
      set2Id: set2Id || "",
      result: numResult,
      strength: normalizedStrength,
    });

    return res.status(201).json({
      ok: true,
      id: doc._id,
      replaced: (delResult?.deletedCount || 0) > 0,
    });
  } catch (e) {
    console.error("POST /api/preferences error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/preferences/status?comparison=...&rater=USER
 * -> { exists: boolean, result?: 0|1|2, strength?: "weak"|"moderate"|"strong"|null }
 */
app.get("/api/preferences/status", async (req, res) => {
  try {
    const { comparison, rater } = req.query;
    if (!comparison || !rater) return res.json({ exists: false });

    const hit = await Preference.findOne({ comparison, rater }).lean();
    if (!hit) return res.json({ exists: false });

    res.json({
      exists: true,
      result: hit.result,
      strength: hit.strength ?? null,
    });
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
