// server/models/ComparisonRating.js
const mongoose = require("mongoose");

const AxisSchema = new mongoose.Schema(
  {
    // 0 = tie, 1 = Urdu 1 better, 2 = Urdu 2 better
    winner: { type: Number, enum: [0, 1, 2], required: true },
    // 1–5 Likert strength, null if tie
    strength: { type: Number, min: 1, max: 5, default: null },
  },
  { _id: false }
);

const ComparisonRatingSchema = new mongoose.Schema(
  {
    rater: { type: String, required: true },
    comparison: { type: String, required: true },
    datasetId: { type: String, default: "" },

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
  },
  { timestamps: true }
);

// one submission per (rater, comparison)
ComparisonRatingSchema.index({ rater: 1, comparison: 1 }, { unique: true });

module.exports = mongoose.model("ComparisonRating", ComparisonRatingSchema);
