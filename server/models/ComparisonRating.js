// server/models/ComparisonRating.js
const mongoose = require("mongoose");

const AxisSchema = new mongoose.Schema(
  {
    // 0 = tie, 1 = Urdu 1 better, 2 = Urdu 2 better
    winner: { type: Number, enum: [0, 1, 2], required: true },

    // when winner = 0 (tie), optional quality: "bad" | "good" | "excellent"
    tieQuality: { type: String, default: null },
  },
  { _id: false }
);

const ComparisonRatingSchema = new mongoose.Schema(
  {
    rater: { type: String, required: true },
    comparison: { type: String, required: true },
    datasetId: { type: String, default: "" },

    // Which concrete outputs were shown as Urdu 1 / Urdu 2 in the UI
    urdu1: { type: String, default: "" },
    urdu2: { type: String, default: "" },

    axes: {
      axis1: { type: AxisSchema, required: true },
      axis2: { type: AxisSchema, required: true },
      axis3: { type: AxisSchema, required: true },
      axis4: { type: AxisSchema, required: true },
      axis5: { type: AxisSchema, required: true },
      axis6: { type: AxisSchema, required: true },
      axis7: { type: AxisSchema, required: true },
      axis8: { type: AxisSchema, required: true },
    },

    comments: { type: String, default: "" },

    // time spent on this case (seconds, optional)
    durationSeconds: { type: Number, default: null },

    // Relative overall grading (Translation 1 vs 2 vs Tie)
    relativeOverall: {
      // 0 tie, 1 T1, 2 T2
      winner: { type: Number, enum: [0, 1, 2], default: null },
      // when winner is 1 or 2
      strength: { type: Number, min: 1, max: 5, default: null },
      // when winner = 0
      tieQuality: { type: String, default: null },
    },

    // Absolute overall grading for each translation
    absoluteOverall: {
      translation1: { type: Number, min: 1, max: 5, default: null },
      translation2: { type: Number, min: 1, max: 5, default: null },
    },
  },
  { timestamps: true }
);

// one submission per (ra
