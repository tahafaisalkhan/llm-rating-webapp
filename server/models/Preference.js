// server/models/Preference.js
const mongoose = require("mongoose");

const PreferenceSchema = new mongoose.Schema(
  {
    comparison: { type: String, index: true, required: true },
    chatgptId: { type: String, required: true },
    medgemmaId: { type: String, required: true },
    result: { type: Number, enum: [1, 2], required: true }, // 1 = Set1, 2 = Set2
    rater: { type: String, index: true, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

PreferenceSchema.index({ comparison: 1, rater: 1 }, { unique: true });

module.exports =
  mongoose.models.Preference || mongoose.model("Preference", PreferenceSchema);
