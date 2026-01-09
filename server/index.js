// server/index.js

const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const ComparisonRating = require("./models/ComparisonRating");

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/clinical";
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

/** ----------------- COMPARISON RATINGS ----------------- **/

app.post("/api/comparison-ratings", async (req, res) => {
  try {
    const {
      rater,
      comparison,
      datasetId,
      axes,
      comments,
      durationSeconds,
      relativeOverall,
      absoluteOverall,
      urdu1,
      urdu2,
    } = req.body || {};

    if (!rater || !comparison || !axes) {
      return res.status(400).json({
        error: "Missing rater, comparison, or axes.",
      });
    }

    // Validate axes 1–8 (TERNARY ONLY)
    const required = [
      "axis1",
      "axis2",
      "axis3",
      "axis4",
      "axis5",
      "axis6",
      "axis7",
      "axis8",
    ];

    for (const ax of required) {
      const a = axes[ax];

      if (!a || typeof a.winner !== "number") {
        return res.status(400).json({
          error: `Missing winner for ${ax}`,
        });
      }

      if (![0, 1, 2].includes(a.winner)) {
        return res.status(400).json({
          error: `${ax} winner must be 0/1/2`,
        });
      }

      // NOTE:
      // Axes 1–8 are ternary-only.
      // strength is intentionally ignored / optional here.
    }

    let dur = null;
    if (typeof durationSeconds === "number" && durationSeconds >= 0) {
      dur = Math.round(durationSeconds);
    }

    const filter = { rater, comparison: String(comparison) };
    const update = {
      $set: {
        datasetId: datasetId || "",
        axes,
        comments: comments || "",
        durationSeconds: dur,
        relativeOverall: relativeOverall || null,
        absoluteOverall: absoluteOverall || null,
        urdu1: urdu1 || "",
        urdu2: urdu2 || "",
      },
      $setOnInsert: { createdAt: new Date() },
    };

    const doc = await ComparisonRating.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      lean: true,
    });

    res.json({ ok: true, id: doc._id });
  } catch (e) {
    console.error("POST /api/comparison-ratings error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/comparison-ratings/get", async (req, res) => {
  try {
    const { comparison, rater } = req.query;
    if (!comparison || !rater) return res.json({ exists: false });

    const doc = await ComparisonRating.findOne({
      comparison: String(comparison),
      rater,
    }).lean();

    if (!doc) return res.json({ exists: false });

    res.json({
      exists: true,
      axes: doc.axes || null,
      comments: doc.comments || "",
      durationSeconds: doc.durationSeconds ?? null,
      relativeOverall: doc.relativeOverall || null,
      absoluteOverall: doc.absoluteOverall || null,
      urdu1: doc.urdu1 || "",
      urdu2: doc.urdu2 || "",
    });
  } catch (e) {
    console.error("GET /api/comparison-ratings/get error:", e);
    res.json({ exists: false });
  }
});

/** ----------------- Serve web app ----------------- **/

app.get("/", (_req, res) => res.redirect("/login"));

const DIST = path.join(__dirname, "..", "dist");
app.use(express.static(DIST));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(DIST, "index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
