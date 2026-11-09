require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

// Start HTTP server immediately
const server = app.listen(PORT, () => {
  console.log(`✅ NxtStepGo Career Hub running on port ${PORT}`);
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    console.log("✓ Database: Connected to MongoDB");
  } else {
    console.log("✓ Database: Using resilient local storage");
  }
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down cleanly...");
  server.close(() => {
    if (mongoose.connection) mongoose.connection.close();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down cleanly...");
  server.close(() => {
    if (mongoose.connection) mongoose.connection.close();
    process.exit(0);
  });
});
