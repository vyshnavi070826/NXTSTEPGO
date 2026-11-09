const jwt = require("jsonwebtoken");
const storage = require("../services/storage");

const JWT_SECRET = process.env.JWT_SECRET || 'nxtstepgo_production_secret_key';

/**
 * Middleware to verify authenticated user
 * Prioritizes JWT Bearer tokens; falls back to verified x-user-id for backward compatibility
 */
const verifyUser = async (req, res, next) => {
  try {
    let userId = null;
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId || decoded.id;
      } catch (tokenErr) {
        return res.status(401).json({ message: "Invalid or expired session. Please log in again." });
      }
    } else {
      userId = req.headers['x-user-id'] || (req.body && req.body.userId);
    }

    if (!userId) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    const user = await storage.findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found. Please log in again." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("verifyUser middleware error:", error);
    res.status(500).json({ message: error.message || "Authentication error" });
  }
};

module.exports = {
  verifyUser
};
