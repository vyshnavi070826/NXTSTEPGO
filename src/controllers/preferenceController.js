const storage = require("../services/storage");

/**
 * Initialize user preferences when they first register or log in
 */
exports.initializePreferences = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const pref = await storage.getPreferences(userId);
    res.status(200).json({ message: "Preferences initialized", preferences: pref });
  } catch (error) {
    console.error("initializePreferences error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Track explored departments
 */
exports.trackDepartment = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { department } = req.body;

    if (!department) {
      return res.status(400).json({ message: "Department identifier required" });
    }

    const pref = await storage.trackDepartment(userId, department);

    // Audit log department view
    await storage.logUserAction(userId, 'DEPARTMENT_VIEW', {
      resourceType: 'department',
      resourceId: department,
      resourceName: department,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    res.json({ message: "Department tracked", preferences: pref });
  } catch (error) {
    console.error("trackDepartment error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Save an educational resource to bookmarks
 */
exports.addBookmark = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type, elementId, title, department, metadata } = req.body;

    if (!type || !elementId || !title) {
      return res.status(400).json({ message: "Bookmark type, elementId, and title are required" });
    }

    if (!['program', 'job', 'exam', 'startup'].includes(type)) {
      return res.status(400).json({ message: "Invalid bookmark type" });
    }

    const pref = await storage.addBookmark(userId, {
      type,
      elementId,
      title,
      department: department || 'all',
      metadata: metadata || {}
    });

    // Audit log bookmark creation
    await storage.logUserAction(userId, 'BOOKMARK_ADD', {
      resourceType: type,
      resourceId: String(elementId),
      resourceName: title,
      departmentId: department,
      metadata,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    res.json({ message: `${type} bookmarked successfully`, preferences: pref });
  } catch (error) {
    console.error("addBookmark error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Remove an item from bookmarks
 */
exports.removeBookmark = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { type, elementId, title, department } = req.body;

    if (!type || !elementId) {
      return res.status(400).json({ message: "Bookmark type and elementId are required" });
    }

    const pref = await storage.removeBookmark(userId, type, elementId);

    // Audit log bookmark removal
    await storage.logUserAction(userId, 'BOOKMARK_REMOVE', {
      resourceType: type,
      resourceId: String(elementId),
      resourceName: title || String(elementId),
      departmentId: department,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    res.json({ message: `${type} removed from bookmarks`, preferences: pref });
  } catch (error) {
    console.error("removeBookmark error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new personal collection
 */
exports.createCollection = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Collection name is required" });
    }

    const pref = await storage.createCollection(userId, name.trim(), description || '');

    // Audit log collection creation
    await storage.logUserAction(userId, 'COLLECTION_CREATE', {
      resourceType: 'collection',
      resourceId: name.trim(),
      resourceName: name.trim(),
      metadata: { description },
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    res.status(201).json({ message: "Collection created", preferences: pref });
  } catch (error) {
    console.error("createCollection error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Add an item to a personal collection
 */
exports.addToCollection = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { collectionName, type, elementId, title, department, metadata } = req.body;

    if (!collectionName) {
      return res.status(400).json({ message: "Collection name required" });
    }

    const item = { title, type, elementId, department, metadata };
    const pref = await storage.addToCollection(userId, collectionName, item);

    if (!pref) {
      return res.status(404).json({ message: "Collection or preferences not found" });
    }

    res.json({ message: "Item added to collection", preferences: pref });
  } catch (error) {
    console.error("addToCollection error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Remove an item from a personal collection
 */
exports.removeFromCollection = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { collectionName, elementId } = req.body;

    if (!collectionName || !elementId) {
      return res.status(400).json({ message: "Collection name and elementId are required" });
    }

    const pref = await storage.removeFromCollection(userId, collectionName, elementId);
    if (!pref) {
      return res.status(404).json({ message: "Collection or preferences not found" });
    }

    res.json({ message: "Item removed from collection", preferences: pref });
  } catch (error) {
    console.error("removeFromCollection error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieve all bookmarks and collections for user
 */
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const pref = await storage.getPreferences(userId);
    res.json(pref);
  } catch (error) {
    console.error("getPreferences error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a personal collection
 */
exports.deleteCollection = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { collectionName } = req.body;

    if (!collectionName) {
      return res.status(400).json({ message: "Collection name required" });
    }

    const pref = await storage.deleteCollection(userId, collectionName);

    // Audit log collection deletion
    await storage.logUserAction(userId, 'COLLECTION_DELETE', {
      resourceType: 'collection',
      resourceId: collectionName,
      resourceName: collectionName,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.connection.remoteAddress || null
    });

    res.json({ message: "Collection deleted", preferences: pref });
  } catch (error) {
    console.error("deleteCollection error:", error);
    res.status(500).json({ message: error.message });
  }
};
