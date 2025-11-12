// server/models/NoteCounter.js
const mongoose = require("mongoose");

const NoteCounterSchema = new mongoose.Schema(
  {
    rater: { type: String, required: true },
    comparison: { type: String, required: true }, // e.g., "1", "2", etc.

    // how many times each "Go to Note" was clicked
    englishNote: { type: Number, default: 0 },
    urdu1Note: { type: Number, default: 0 },
    urdu2Note: { type: Number, default: 0 },

    // --- NEW: preference/score change counters ---

    // How many times the rater changed the axis winner (per axis 1..8)
    // Example: [2, 0, 1, 3, 0, 0, 1, 4]
    axisWinnerChanges: {
      type: [Number],
      default: () => Array.from({ length: 8 }).map(() => 0),
    },

    // How many times they changed the relative overall winner (axis 9)
    relativeOverallChanges: { type: Number, default: 0 },

    // How many times the absolute rating changed for each translation
    // (counted independently)
    absoluteT1Changes: { type: Number, default: 0 },
    absoluteT2Changes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// one row per (rater, comparison)
NoteCounterSchema.index({ rater: 1, comparison: 1 }, { unique: true });

module.exports = mongoose.model("NoteCounter", NoteCounterSchema);
