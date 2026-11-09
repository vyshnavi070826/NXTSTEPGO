const express = require("express");
const router = express.Router();

const analyticsController = require("../controllers/analyticsController");
const { verifyUser } = require("../middleware");

// Authenticated user action history and stats routes
router.get("/user/action-history", verifyUser, analyticsController.getUserActionHistory);
router.get("/user/action-summary", verifyUser, analyticsController.getUserActionSummary);
router.get("/user/activity-stats", verifyUser, analyticsController.getUserActivityStats);

// Public department analytics aggregate
router.get("/department/:departmentId", analyticsController.getDepartmentAnalytics);

module.exports = router;
