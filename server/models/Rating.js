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
     * Rubric (final order):
     *  1 — Medical Accuracy & Completeness
     *  2 — Clinical Safety & Handover Utility
     *  3 — Guideline Alignment & Clinical Reasoning
     *  4 — Language & Terminology Accuracy
     *  5 — Structure, Flow & Communication
     *  6 — Communication, Rapport & Patient Engagement
     *  7 — Alignment to Source (“traceability”)
     */
    scores: {
      axis1: { type: Number, min: 0, max: 5, required: true }, // Medical Accuracy & Completeness
      axis2: { type: Number, min: 0, max: 5, required: true }, // Clinical Safety & Handover Utility
      axis3: { type: Number, min: 0, max: 5, required: true }, // Guideline Alignment & Clinical Reasoning
      axis4: { type: Number, min: 0, max: 5, required: true }, // Language & Terminology Accuracy
      axis5: { type: Number, min: 0, max: 5, required: true }, // Structure, Flow & Communication
      axis6: { type: Number, min: 0, max: 5, required: true }, // Communication, Rapport & Patient Engagement
      axis7: { type: Number, min: 0, max: 5, required: true }, // Alignment to Source (“traceability”)

      // Optional comments container; we only use `extra` right now
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
