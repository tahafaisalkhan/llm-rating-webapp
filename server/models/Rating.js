// server/models/Rating.js
const RatingSchema = new mongoose.Schema(
  {
    rater: { type: String, required: true },
    modelId: { type: String, required: true },
    datasetId: { type: String, default: "" },
    modelUsed: {
      type: String,
      enum: ["chatgpt", "medgemma", "unknown"],
      required: true,
    },
    comparison: { type: String, default: "" },

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

    major_error: { type: Boolean, default: false },  // ← NEW
  },
  { timestamps: true }
);
