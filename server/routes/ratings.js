// server/routes/ratings.js
const express = require("express");
const connectMongo = require("../db");
const Rating = require("../models/Rating");

const router = express.Router();

/**
 * POST /api/ratings
 * Body: { modelId, datasetId, comparison, modelUsed, rater, scores:{axis1..axis5} }
 * One submission per (modelId, rater).
 */
router.post("/", async (req, res) => {
  try {
    await connectMongo();

    const { modelId, datasetId, comparison, modelUsed, rater, scores } = req.body || {};

    // Basic validation
    if (!modelId || !datasetId || !modelUsed || !rater || !scores) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }
    const axes = ["axis1", "axis2", "axis3", "axis4", "axis5"];
    for (const a of axes) {
      if (typeof scores[a] !== "number" || scores[a] < 0 || scores[a] > 5) {
        return res.status(400).json({ ok: false, error: `Invalid score for ${a}` });
      }
    }

    // Prevent duplicate for same rater+item
    const exists = await Rating.findOne({ modelId, rater }).lean();
    if (exists) {
      return res.status(409).json({ ok: false, error: "Already submitted" });
    }

    const doc = await Rating.create({
      modelId,
      datasetId,
      comparison: comparison ?? null,
      modelUsed,     // "chatgpt" | "medgemma" (kept for analysis; UI is blind)
      rater,         // USER1 / USER2 / ...
      scores,
      createdAt: new Date(),
    });

    return res.json({ ok: true, id: String(doc._id) });
  } catch (err) {
    console.error("ratings POST error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

/**
 * GET /api/ratings/status?modelId=...&rater=...
 * Returns { exists: boolean }
 */
router.get("/status", async (req, res) => {
  try {
    await connectMongo();
    const { modelId, rater } = req.query || {};
    if (!modelId || !rater) {
      return res.json({ exists: false });
    }
    const exists = await Rating.exists({ modelId, rater });
    return res.json({ exists: !!exists });
  } catch (err) {
    console.error("ratings status error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

module.exports = router;
