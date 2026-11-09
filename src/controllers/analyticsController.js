const storage = require("../services/storage");

/**
 * Get user action history
 */
exports.getUserActionHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { limit = 50, skip = 0, actionType, startDate, endDate } = req.query;

    const history = await storage.getUserActionHistory(userId, {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      actionType,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error("getUserActionHistory error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user action summary
 */
exports.getUserActionSummary = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const summary = await storage.getUserActionSummary(userId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error("getUserActionSummary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user activity stats
 */
exports.getUserActivityStats = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        accountStatus: user.accountStatus,
        activityStats: user.activityStats,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("getUserActivityStats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get department analytics
 */
exports.getDepartmentAnalytics = async (req, res) => {
  try {
    const { departmentId } = req.params;

    if (!departmentId) {
      return res.status(400).json({ message: "Department ID required" });
    }

    const analytics = await storage.getDepartmentAnalytics(departmentId);

    res.json({
      success: true,
      departmentId,
      data: analytics
    });
  } catch (error) {
    console.error("getDepartmentAnalytics error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
