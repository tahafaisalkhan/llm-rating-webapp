const mongoose = require("mongoose");

const PreferenceSchema = new mongoose.Schema(
  {
    rater:       { type: String, required: true },        // USER1 / USER2
    comparison:  { type: String, required: true },
    set1Id:      { type: String, default: "" },
    set2Id:      { type: String, default: "" },

    // 0 = tie, 1 = choose Set 1, 2 = choose Set 2
    result:      { type: Number, enum: [0, 1, 2], required: true },

    // Only when result is 1 or 2; null for ties
    strength:    { type: String, enum: ["weak", "moderate", "strong", null], default: null },
  },
  { timestamps: true }
);

// one submission per (user, comparison)
PreferenceSchema.index({ rater: 1, comparison: 1 }, { unique: true });

module.exports = mongoose.model("Preference", PreferenceSchema);
