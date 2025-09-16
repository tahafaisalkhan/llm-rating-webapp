const mongoose = require("mongoose");

const PreferenceSchema = new mongoose.Schema(
  {
    // Rater identity (e.g., USER1 / USER2)
    rater: { type: String, required: true },

    // Pair identifier (your comparison key)
    comparison: { type: String, required: true },

    // Optional references to the underlying set items
    set1Id: { type: String, default: "" },
    set2Id: { type: String, default: "" },

    // 0 = tie, 1 = set1, 2 = set2
    result: { type: Number, enum: [0, 1, 2], required: true },
  },
  { timestamps: true }
);

// One submission per (user, comparison)
PreferenceSchema.index({ rater: 1, comparison: 1 }, { unique: true });

module.exports = mongoose.model("Preference", PreferenceSchema);
