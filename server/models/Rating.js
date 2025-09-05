const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    rater: { type: String, required: true },        // USER1 / USER2
    modelId: { type: String, required: true },      // e.g. c_aci_026 or g_aci_026
    datasetId: { type: String, default: "" },
    modelUsed: {
      type: String,
      enum: ["chatgpt", "medgemma", "unknown"],
      required: true,
    },
    comparison: { type: String, default: "" },

    /**
     * Updated rubric:
     * 7 axes scored 0–5 + per-axis short comments + optional extra comment
     * (Backward compatible: existing docs with only axis1..axis5 remain valid.)
     */
    scores: {
      // Numeric scores (now 7 axes)
      axis1: { type: Number, min: 0, max: 5, required: true }, // Medical Accuracy & Completeness
      axis2: { type: Number, min: 0, max: 5, required: true }, // Clinical Safety & Handover Utility
      axis3: { type: Number, min: 0, max: 5, required: true }, // Guideline Alignment & Clinical Reasoning
      axis4: { type: Number, min: 0, max: 5, required: true }, // Structure, Flow & Communication
      axis5: { type: Number, min: 0, max: 5, required: true }, // Communication, Rapport & Patient Engagement
      axis6: { type: Number, min: 0, max: 5, required: true }, // Alignment Task
      axis7: { type: Number, min: 0, max: 5, required: true }, // Language & Terminology (kept as the 7th axis)

      // Per-axis short comments (optional)
      comments: {
        axis1: { type: String, default: "" },
        axis2: { type: String, default: "" },
        axis3: { type: String, default: "" },
        axis4: { type: String, default: "" },
        axis5: { type: String, default: "" },
        axis6: { type: String, default: "" },
        axis7: { type: String, default: "" },
        extra: { type: String, default: "" }, // Optional Open Axis / extra notes
      },
    },
  },
  { timestamps: true }
);

// one submission per (user, modelUsed, modelId)
RatingSchema.index({ rater: 1, modelUsed: 1, modelId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", RatingSchema);
