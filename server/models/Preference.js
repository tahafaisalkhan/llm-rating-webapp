const mongoose = require("mongoose");

const PreferenceSchema = new mongoose.Schema(
  {
    comparison: { type: String, required: true, unique: true }, // one submission per pair
    set1Id: { type: String, default: "" }, // left id (could be null/blank)
    set2Id: { type: String, default: "" }, // right id (could be null/blank)
    result: { type: Number, enum: [1, 2], required: true } // which set preferred
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preference", PreferenceSchema);
