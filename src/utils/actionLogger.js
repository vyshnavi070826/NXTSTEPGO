const storage = require('../services/storage');

/**
 * Log user action to database or local storage
 * @param {String} userId - User ID
 * @param {String} actionType - Type of action (LOGIN, BOOKMARK_ADD, etc.)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Created action log document
 */
async function logUserAction(userId, actionType, options = {}) {
  try {
    if (!userId) {
      console.warn('logUserAction: userId is required');
      return null;
    }
    return await storage.logUserAction(userId, actionType, options);
  } catch (error) {
    console.error('Error logging user action:', error);
    return null;
  }
}

async function getUserActionHistory(userId, options = {}) {
  return await storage.getUserActionHistory(userId, options);
}

async function getUserActionSummary(userId) {
  return await storage.getUserActionSummary(userId);
}

async function getDepartmentAnalytics(departmentId) {
  return await storage.getDepartmentAnalytics(departmentId);
}

module.exports = {
  logUserAction,
  getUserActionHistory,
  getUserActionSummary,
  getDepartmentAnalytics
};
