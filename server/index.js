// server/index.js
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const ComparisonRating = require("./models/ComparisonRating");
const NoteCounter = require("./models/NoteCounter"); // 👈 NEW

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

/** ----------------- COMPARISON RATINGS (PER CASE) ----------------- */

app.post("/api/comparison-ratings", async (req, res) => {
  try {
    const {
      rater,
      comparison,
      datasetId,
      axes,
      comments,
      durationSeconds,
    } = req.body || {};

    if (!rater || !comparison || !axes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const requiredAxes = [
      "axis1",
      "axis2",
      "axis3",
      "axis4",
      "axis5",
      "axis6",
      "axis7",
      "axis8",
    ];

    for (const ax of requiredAxes) {
      const a = axes[ax];
      if (!a || typeof a.winner !== "number") {
        return res
          .status(400)
          .json({ error: `Axis ${ax} must have a winner` });
      }
      if (![0, 1, 2].includes(a.winner)) {
        return res
          .status(400)
          .json({ error: `Axis ${ax} winner must be 0,1,2` });
      }
      if (
        a.winner !== 0 &&
        (a.strength == null || a.strength < 1 || a.strength > 5)
      ) {
        return res.status(400).json({
          error: `Axis ${ax} strength must be 1–5 when winner is 1 or 2`,
        });
      }
    }

    // sanitize duration (optional)
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
      },
      $setOnInsert: { createdAt: new Date() },
    };

    const doc = await ComparisonRating.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      lean: true,
    });

    return res.status(200).json({ ok: true, id: doc._id });
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
    });
  } catch (e) {
    console.error("GET /api/comparison-ratings/get error:", e);
    res.json({ exists: false });
  }
});

/** ----------------- NOTE COUNTER (GO TO NOTE CLICKS) ----------------- */

app.post("/api/note-counter/increment", async (req, res) => {
  try {
    const { rater, comparison, which } = req.body || {};
    if (!rater || !comparison || !["english", "urdu1", "urdu2"].includes(which)) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }

    const fieldMap = {
      english: "englishNote",
      urdu1: "urdu1Note",
      urdu2: "urdu2Note",
    };
    const field = fieldMap[which];

    const doc = await NoteCounter.findOneAndUpdate(
      { rater, comparison: String(comparison) },
      { $inc: { [field]: 1 } },
      { upsert: true, new: true, lean: true }
    );

    res.json({ ok: true, counter: doc });
  } catch (e) {
    console.error("POST /api/note-counter/increment error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/** ---------- Default route redirect to /login ---------- */
app.get("/", (_req, res) => {
  res.redirect("/login");
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
