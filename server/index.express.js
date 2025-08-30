// server/index.express.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// require your routers/models as you already do
const ratingsRouter = require("./routes/ratings");
const prefsRouter = require("./routes/preferences");

module.exports = function createServer() {
  const app = express();

  app.use(express.json());
  app.use(cors({
    origin: [
      /localhost:\d+$/,                         // local dev
      /\.vercel\.app$/,                         // your vercel domain(s)
    ],
    credentials: false,
  }));

  // connect to Mongo only once per lambda container
  if (!global._mongoose) {
    const uri = process.env.MONGODB_URI;
    global._mongoose = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
  }

  // mount your routes exactly as before:
  app.use("/api/ratings", ratingsRouter);
  app.use("/api/preferences", prefsRouter);

  // If your original file had health:
  app.get("/api/health", (_, res) => res.json({ ok: true }));

  return app;
};
