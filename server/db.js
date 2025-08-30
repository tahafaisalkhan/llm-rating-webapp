// server/db.js
const mongoose = require("mongoose");

let cached = global.__mongoCached;
if (!cached) {
  cached = global.__mongoCached = { conn: null, promise: null };
}

async function connectMongo() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI not set");

    // Keep this lightweight. No connect at import time.
    mongoose.set("strictQuery", true);

    cached.promise = mongoose
      .connect(uri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 8000, // don't hang forever
      })
      .then((m) => m.connection)
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectMongo;
