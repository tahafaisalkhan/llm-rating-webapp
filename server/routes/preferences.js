const express = require("express");
const connectMongo = require("../db");
const Preference = require("../models/Preference");
const router = express.Router();

// POST /api/preferences
router.post("/", async (req, res) => {
  try {
    await connectMongo();
    const { comparison, chatgptId, medgemmaId, result, rater } = req.body;
    if (!comparison || !chatgptId || !medgemmaId || !result || !rater) {
      return res.status(400).send("Missing fields");
    }

    const exists = await Preference.findOne({ comparison, rater });
    if (exists) return res.status(409).send("Already submitted");

    const doc = await Preference.create({
      comparison,
      chatgptId,
      medgemmaId,
      result,
      rater
    });
    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error("preferences POST error:", e);
    res.status(500).send(e.message || "Server error");
  }
});

// GET /api/preferences/status?comparison=&rater=
router.get("/status", async (req, res) => {
  try {
    await connectMongo();
    const { comparison, rater } = req.query;
    if (!comparison || !rater) return res.json({ exists: false });
    const exists = await Preference.exists({ comparison, rater });
    res.json({ exists: !!exists });
  } catch (e) {
    console.error("preferences status error:", e);
    res.status(500).send(e.message || "Server error");
  }
});

module.exports = router;
