const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    modelId: { type: String, required: true },     // e.g., c_aci_026 or g_aci_026
    datasetId: { type: String, default: "" },
    modelUsed: {                                   // stored internally; UI stays blind
      type: String,
      enum: ["chatgpt", "medgemma", "unknown"],
      required: true,
    },
    comparison: { type: String, default: "" },     // comparison / pair id
    scores: {
      axis1: { type: Number, min: 0, max: 5, required: true },
      axis2: { type: Number, min: 0, max: 5, required: true },
      axis3: { type: Number, min: 0, max: 5, required: true },
      axis4: { type: Number, min: 0, max: 5, required: true },
      axis5: { type: Number, min: 0, max: 5, required: true }
    }
  },
  { timestamps: true }
);

// "For now, if a submission is done it cannot be done again."
// Enforce one rating per (modelId, modelUsed).
RatingSchema.index({ modelId: 1, modelUsed: 1 }, { unique: true });

module.exports = mongoose.model("Rating", RatingSchema);
