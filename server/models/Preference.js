const mongoose = require("mongoose");

const PreferenceSchema = new mongoose.Schema(
  {
    rater: { type: String, required: true },             // USER1 / USER2
    comparison: { type: String, required: true },
    set1Id: { type: String, default: "" },
    set2Id: { type: String, default: "" },
    result: { type: Number, enum: [1, 2], required: true }
  },
  { timestamps: true }
);

// one submission per (user, comparison)
PreferenceSchema.index({ rater: 1, comparison: 1 }, { unique: true });

module.exports = mongoose.model("Preference", PreferenceSchema);
