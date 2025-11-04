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
  },
  { timestamps: true }
);

// one row per (rater, comparison)
NoteCounterSchema.index({ rater: 1, comparison: 1 }, { unique: true });

module.exports = mongoose.model("NoteCounter", NoteCounterSchema);
