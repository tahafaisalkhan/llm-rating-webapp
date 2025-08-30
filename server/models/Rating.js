// const mongoose = require("mongoose");

// const RatingSchema = new mongoose.Schema(
//   {
//     rater: { type: String, required: true },        // USER1 / USER2
//     modelId: { type: String, required: true },      // c_aci_026 or g_aci_026
//     datasetId: { type: String, default: "" },
//     modelUsed: {
//       type: String,
//       enum: ["chatgpt", "medgemma", "unknown"],
//       required: true,
//     },
//     comparison: { type: String, default: "" },
//     scores: {
//       axis1: { type: Number, min: 0, max: 5, required: true },
//       axis2: { type: Number, min: 0, max: 5, required: true },
//       axis3: { type: Number, min: 0, max: 5, required: true },
//       axis4: { type: Number, min: 0, max: 5, required: true },
//       axis5: { type: Number, min: 0, max: 5, required: true }
//     }
//   },
//   { timestamps: true }
// );

// // one submission per (user, modelUsed, modelId)
// RatingSchema.index({ rater: 1, modelUsed: 1, modelId: 1 }, { unique: true });

// module.exports = mongoose.model("Rating", RatingSchema);
const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
  {
    modelId: String,
    datasetId: String,
    comparison: String,
    modelUsed: { type: String, enum: ["chatgpt", "medgemma"] },
    rater: String,
    scores: {
      axis1: Number,
      axis2: Number,
      axis3: Number,
      axis4: Number,
      axis5: Number
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Rating || mongoose.model("Rating", RatingSchema);
