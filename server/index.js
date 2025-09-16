// server/index.js
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const Rating = require("./models/Rating");
const Preference = require("./models/Preference");

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

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, via: "render-web", ts: Date.now() })
);

/** Helper: normalize model names to server canonical values */
function normalizeModelUsed(v) {
  const s = String(v || "").toLowerCase();
  if (s === "chatgpt") return "gemma";   // map old label -> new
  if (s === "gemma") return "gemma";
  if (s === "medgemma") return "medgemma";
  return "unknown";
}

/** ----------------- RATINGS ----------------- */
/** Sum 0–5 axes safely (missing -> 0) */
function totalScore(scores) {
  const axes = ["axis1","axis2","axis3","axis4","axis5","axis6","axis7"];
  let sum = 0;
  for (const k of axes) {
    const v = Number(scores?.[k]);
    if (!Number.isNaN(v)) sum += v;
  }
  return sum;
}

/** POST /api/ratings  (UPSERT) */
app.post("/api/ratings", async (req, res) => {
  try {
    const { rater, modelId, datasetId, modelUsed, comparison, scores } = req.body || {};
    const modelUsedNorm = normalizeModelUsed(modelUsed);
    if (!rater || !modelId || !modelUsedNorm || !scores) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Upsert by unique key (rater, modelUsed, modelId)
    const filter = { rater, modelUsed: modelUsedNorm, modelId };
    const update = {
      $set: {
        datasetId: datasetId || "",
        comparison: comparison || "",
        scores,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    };

    const doc = await Rating.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,        // return the updated/inserted doc
      lean: true,
    });

    return res.status(200).json({
      ok: true,
      id: doc._id,
      total: totalScore(doc.scores),
    });
  } catch (e) {
    console.error("POST /api/ratings error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/** GET /api/ratings/status?modelUsed=...&modelId=...&rater=... */
app.get("/api/ratings/status", async (req, res) => {
  try {
    const modelUsedNorm = normalizeModelUsed(req.query.modelUsed);
    const { modelId, rater } = req.query;
    if (!modelUsedNorm || !modelId || !rater) return res.json({ exists: false });

    const hit = await Rating.findOne({ modelUsed: modelUsedNorm, modelId, rater }).lean();
    if (!hit) return res.json({ exists: false });

    res.json({
      exists: true,
      total: totalScore(hit.scores), // x out of 35
    });
  } catch (e) {
    console.error("GET /api/ratings/status error:", e);
    res.json({ exists: false });
  }
});

/** ----------------- PREFERENCES ----------------- */
/** POST /api/preferences  (UPSERT) */
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

    // Normalize strength: only store if not a tie
    let normalizedStrength = null;
    if (numResult !== 0 && strength != null) {
      const s = String(strength).toLowerCase();
      if (!["weak", "moderate", "strong"].includes(s)) {
        return res.status(400).json({ error: "strength must be weak|moderate|strong when provided" });
      }
      normalizedStrength = s;
    }

    // Upsert by unique key (rater, comparison)
    const filter = { rater, comparison };
    const update = {
      $set: {
        set1Id: set1Id || "",
        set2Id: set2Id || "",
        result: numResult,
        strength: normalizedStrength, // null if tie
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    };

    const doc = await Preference.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      lean: true,
    });

    return res.status(200).json({ ok: true, id: doc._id });
  } catch (e) {
    console.error("POST /api/preferences error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/** GET /api/preferences/status?comparison=...&rater=... */
app.get("/api/preferences/status", async (req, res) => {
  try {
    const { comparison, rater } = req.query;
    if (!comparison || !rater) return res.json({ exists: false });

    const hit = await Preference.findOne({ comparison, rater }).lean();
    if (!hit) return res.json({ exists: false });

    res.json({ exists: true, result: hit.result, strength: hit.strength ?? null });
  } catch (e) {
    console.error("GET /api/preferences/status error:", e);
    res.json({ exists: false });
  }
});

/** -------------- Serve SPA -------------- */
const DIST_DIR = path.join(__dirname, "..", "dist");
app.use(express.static(DIST_DIR));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
