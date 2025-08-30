// server/routes/preferences.js
const express = require("express");
const connectMongo = require("../db");
const Preference = require("../models/Preference");

const router = express.Router();

/**
 * POST /api/preferences
 * Body: { comparison, chatgptId, medgemmaId, result, rater }
 * `result` is 1 (Set 1) or 2 (Set 2)
 * One submission per (comparison, rater).
 */
router.post("/", async (req, res) => {
  try {
    await connectMongo();

    const { comparison, chatgptId, medgemmaId, result, rater } = req.body || {};

    if (!comparison || !chatgptId || !medgemmaId || !rater) {
      return res.status(400).json({ ok: false, error: "Missing required fields" });
    }
    if (result !== 1 && result !== 2) {
      return res.status(400).json({ ok: false, error: "Invalid result (must be 1 or 2)" });
    }

    // Prevent duplicate for same comparison+rater
    const exists = await Preference.findOne({ comparison, rater }).lean();
    if (exists) {
      return res.status(409).json({ ok: false, error: "Already submitted" });
    }

    const doc = await Preference.create({
      comparison,
      chatgptId,
      medgemmaId,
      result,      // 1 or 2
      rater,
      createdAt: new Date(),
    });

    return res.json({ ok: true, id: String(doc._id) });
  } catch (err) {
    console.error("preferences POST error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

/**
 * GET /api/preferences/status?comparison=...&rater=...
 * Returns { exists: boolean, result?: 1|2 }
 */
router.get("/status", async (req, res) => {
  try {
    await connectMongo();
    const { comparison, rater } = req.query || {};
    if (!comparison || !rater) {
      return res.json({ exists: false });
    }
    const pref = await Preference.findOne({ comparison, rater }, { result: 1, _id: 0 }).lean();
    return res.json({ exists: !!pref, result: pref?.result });
  } catch (err) {
    console.error("preferences status error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
});

module.exports = router;
