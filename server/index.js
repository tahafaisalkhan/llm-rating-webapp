require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");

const Rating = require("./models/Rating");
const Preference = require("./models/Preference");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// Mongo
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "clinical_ratings";
mongoose.connect(uri, { dbName })
  .then(() => console.log("✅ Mongo connected"))
  .catch((e) => { console.error("Mongo error", e); process.exit(1); });

/** HEALTH */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/** RATINGS */

// POST /api/ratings
// body: { modelId, datasetId, modelUsed, comparison, scores {axis1..axis5} }
app.post("/api/ratings", async (req, res) => {
  try {
    const { modelId, datasetId, modelUsed, comparison, scores } = req.body || {};
    if (!modelId || !modelUsed || !scores) {
      return res.status(400).json({ error: "modelId, modelUsed, scores are required" });
    }
    const payload = {
      modelId: String(modelId),
      datasetId: datasetId ? String(datasetId) : "",
      modelUsed: String(modelUsed).toLowerCase(),
      comparison: comparison ? String(comparison) : "",
      scores: {
        axis1: +scores.axis1, axis2: +scores.axis2, axis3: +scores.axis3, axis4: +scores.axis4, axis5: +scores.axis5
      }
    };
    // validate score ranges 0-5
    for (const k of ["axis1","axis2","axis3","axis4","axis5"]) {
      const v = payload.scores[k];
      if (!Number.isFinite(v) || v < 0 || v > 5) {
        return res.status(400).json({ error: `Invalid score for ${k}` });
      }
    }
    const doc = await Rating.create(payload);
    return res.status(201).json({ ok: true, id: doc._id });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: "Rating already exists for this item" });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/ratings/status?modelUsed=chatgpt&modelId=c_aci_026
app.get("/api/ratings/status", async (req, res) => {
  const { modelUsed, modelId } = req.query;
  if (!modelUsed || !modelId) return res.status(400).json({ error: "modelUsed and modelId required" });
  const found = await Rating.exists({ modelUsed: String(modelUsed).toLowerCase(), modelId: String(modelId) });
  res.json({ exists: !!found });
});

/** PREFERENCES */

// POST /api/preferences
// body: { comparison, set1Id, set2Id, result(1|2) }
app.post("/api/preferences", async (req, res) => {
  try {
    const { comparison, set1Id, set2Id, result } = req.body || {};
    if (!comparison || (result !== 1 && result !== 2)) {
      return res.status(400).json({ error: "comparison and result(1|2) are required" });
    }
    const doc = await Preference.create({
      comparison: String(comparison),
      set1Id: set1Id ? String(set1Id) : "",
      set2Id: set2Id ? String(set2Id) : "",
      result
    });
    return res.status(201).json({ ok: true, id: doc._id });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: "Preference already submitted for this comparison" });
    }
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/preferences/status?comparison=123
app.get("/api/preferences/status", async (req, res) => {
  const { comparison } = req.query;
  if (!comparison) return res.status(400).json({ error: "comparison required" });

  const found = await Preference.findOne({ comparison: String(comparison) })
    .select("result comparison")
    .lean();

  if (!found) return res.json({ exists: false });

  // include result so the UI can highlight the chosen button on load
  return res.json({ exists: true, result: found.result });
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 API on http://localhost:${PORT}`));
