// server/models/Rating.js
const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    modelId: { type: String, index: true, required: true },
    datasetId: { type: String, required: true },
    comparison: { type: String },
    modelUsed: { type: String, enum: ["chatgpt", "medgemma"], required: true },
    rater: { type: String, index: true, required: true },
    scores: {
      axis1: Number,
      axis2: Number,
      axis3: Number,
      axis4: Number,
      axis5: Number,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

RatingSchema.index({ modelId: 1, rater: 1 }, { unique: true });

module.exports = mongoose.models.Rating || mongoose.model("Rating", RatingSchema);
