// server/routes/ratings.js
const express = require("express");
const connectMongo = require("../db");
const Rating = require("../models/Rating");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    await connectMongo(); // connect here
    const { modelId, datasetId, comparison, modelUsed, rater, scores } = req.body;
    if (!modelId || !datasetId || !modelUsed || !rater || !scores) {
      return res.status(400).send("Missing fields");
    }
    const exists = await Rating.findOne({ modelId, rater });
    if (exists) return res.status(409).send("Already submitted");
    const doc = await Rating.create({ modelId, datasetId, comparison, modelUsed, rater, scores });
    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error("ratings POST error:", e);
    res.status(500).send(e.message || "Server error");
  }
});

router.get("/status", async (req, res) => {
  try {
    await connectMongo();
    const { modelId, rater } = req.query;
    if (!modelId || !rater) return res.json({ exists: false });
    const exists = await Rating.exists({ modelId, rater });
    res.json({ exists: !!exists });
  } catch (e) {
    console.error("ratings status error:", e);
    res.status(500).send(e.message || "Server error");
  }
});

module.exports = router;
