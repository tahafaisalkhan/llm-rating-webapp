// server/db.js
const mongoose = require("mongoose");

/**
 * Keep one connection & cached models per Lambda container.
 * Avoids OverwriteModelError and reconnect storms.
 */
let cached = global._mongoose_cache;
if (!cached) {
  cached = global._mongoose_cache = { conn: null, promise: null };
}

async function connectMongo() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");

    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectMongo;
