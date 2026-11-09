const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

// Serve all static assets from frontend
const frontendPath = path.join(__dirname, "../frontend");
const templatesPath = path.join(frontendPath, "templates");

app.use(express.static(frontendPath));

// Health check endpoint
app.get("/api/health", (req, res) => {
  const isMongoReady = mongoose.connection && mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    storageMode: isMongoReady ? "mongodb" : "local-file-store",
    mongoConnected: isMongoReady,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Homepage & index routes
app.get(["/", "/index", "/index.html"], (req, res) => {
  res.sendFile(path.join(templatesPath, "index.html"));
});

// Authentication page routes
app.get(["/login", "/login.html"], (req, res) => {
  res.sendFile(path.join(frontendPath, "login.html"));
});

app.get(["/signup", "/signup.html"], (req, res) => {
  res.sendFile(path.join(frontendPath, "signup.html"));
});

// Template HTML routes (serve from templates folder, with or without .html)
const templatePages = [
  'departments',
  'hub',
  'jobs',
  'exams',
  'programs',
  'startup',
  'startup-guide',
  'skill-matcher',
  'bookmarks',
  'collections',
  'NxstepGo'
];

templatePages.forEach(page => {
  const filePath = path.join(templatesPath, `${page}.html`);
  app.get([`/${page}`, `/${page}.html`], (req, res) => {
    res.sendFile(filePath);
  });
});

// Handle /templates/<file> paths for any relative redirects
app.get("/templates/:file", (req, res) => {
  const requestedFile = req.params.file;
  const targetPath = path.join(templatesPath, requestedFile);
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  // If file was login or signup, serve from frontend root
  const rootTarget = path.join(frontendPath, requestedFile);
  if (fs.existsSync(rootTarget)) {
    return res.sendFile(rootTarget);
  }
  res.status(404).send("Page not found");
});

// MongoDB connection handling (fail-safe with fallback)
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 2500,
    socketTimeoutMS: 10000,
    connectTimeoutMS: 2500,
    bufferCommands: false
  })
  .then(() => {
    console.log("✓ MongoDB Connected Successfully");
  })
  .catch(err => {
    console.warn("ℹ️ MongoDB unavailable:", err.message);
    console.log("✓ System active: using built-in persistent local storage (data/local_db.json)");
  });
} else {
  console.log("✓ System active: using built-in persistent local storage (data/local_db.json)");
}

// REST API Routes
app.use("/api/departments", require("./routes/index"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/preferences", require("./routes/preferenceRoutes"));
app.use("/api/skill-matcher", require("./routes/skillMatcherRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));

module.exports = app;
