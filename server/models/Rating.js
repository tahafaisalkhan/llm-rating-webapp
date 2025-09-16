// server/models/Rating.js
const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    rater: { type: String, required: true },        // USER1 / USER2
    modelId: { type: String, required: true },      // e.g. c_aci_026 or g_aci_026
    datasetId: { type: String, default: "" },
    modelUsed: {
      type: String,
      enum: ["gemma", "medgemma", "unknown"],       // chatgpt -> gemma
      required: true,
    },
    comparison: { type: String, default: "" },

    // 7-axis rubric + extra comment
    scores: {
      axis1: { type: Number, min: 0, max: 5, required: true },
      axis2: { type: Number, min: 0, max: 5, required: true },
      axis3: { type: Number, min: 0, max: 5, required: true },
      axis4: { type: Number, min: 0, max: 5, required: true },
      axis5: { type: Number, min: 0, max: 5, required: true },
      axis6: { type: Number, min: 0, max: 5, required: true },
      axis7: { type: Number, min: 0, max: 5, required: true },
      comments: {
        axis1: { type: String, default: "" },
        axis2: { type: String, default: "" },
        axis3: { type: String, default: "" },
        axis4: { type: String, default: "" },
        axis5: { type: String, default: "" },
        axis6: { type: String, default: "" },
        axis7: { type: String, default: "" },
        extra: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

// one submission per (user, modelUsed, modelId)
RatingSchema.index({ rater: 1, modelUsed: 1, modelId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", RatingSchema);
