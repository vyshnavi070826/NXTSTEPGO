const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

// File path for resilient local JSON storage
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

// Ensure local data store directory and file exist
function ensureDataStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [],
      preferences: [],
      actionLogs: [],
      departments: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  }
}

// Generate MongoDB-compatible 24-char hex IDs
function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// Read database file
function readDB() {
  ensureDataStore();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading local_db.json, resetting to empty:', err.message);
    const fallback = { users: [], preferences: [], actionLogs: [], departments: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

// Write database file safely
function writeDB(data) {
  ensureDataStore();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// Check if MongoDB is connected and ready
function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// Lazy-load Mongoose models if needed
function getModels() {
  return {
    User: require('../models/User'),
    UserPreference: require('../models/UserPreference'),
    UserActionLog: require('../models/UserActionLog'),
    Department: require('../models/department')
  };
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

async function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();

  if (isMongoConnected()) {
    try {
      const { User } = getModels();
      return await User.findOne({ email: normalized });
    } catch (err) {
      console.warn('MongoDB query failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  return db.users.find(u => u.email.toLowerCase() === normalized) || null;
}

async function findUserById(id) {
  if (!id) return null;
  const strId = String(id);

  if (isMongoConnected()) {
    try {
      const { User } = getModels();
      return await User.findById(strId);
    } catch (err) {
      console.warn('MongoDB query failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  return db.users.find(u => String(u._id) === strId) || null;
}

async function createUser(userData) {
  const { name, email, password } = userData;
  const normalizedEmail = email.trim().toLowerCase();

  if (isMongoConnected()) {
    try {
      const { User, UserPreference } = getModels();
      const newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        password,
        profile: { currentDepartment: 'all', ...(userData.profile || {}) },
        activityStats: { accountCreatedAt: new Date(), ...(userData.activityStats || {}) }
      });
      await newUser.save();

      const userPref = new UserPreference({ userId: newUser._id });
      await userPref.save();

      return newUser;
    } catch (err) {
      console.warn('MongoDB save failed, saving to local store:', err.message);
    }
  }

  const db = readDB();
  const now = new Date().toISOString();
  const userId = generateId();

  const userRecord = {
    _id: userId,
    name: name.trim(),
    email: normalizedEmail,
    password,
    profile: {
      phone: '',
      location: '',
      bio: '',
      avatar: '',
      currentDepartment: 'all',
      yearOfStudy: null,
      ...(userData.profile || {})
    },
    accountStatus: 'active',
    activityStats: {
      totalLoginCount: 1,
      lastLoginAt: now,
      lastLogoutAt: null,
      totalBookmarks: 0,
      totalSearches: 0,
      accountCreatedAt: now,
      lastActivityAt: now
    },
    notificationPreferences: {
      emailNotifications: true,
      jobAlerts: true,
      programUpdates: true,
      weeklyDigest: false
    },
    createdAt: now,
    updatedAt: now
  };

  db.users.push(userRecord);

  // Initialize matching user preferences record
  const prefRecord = {
    _id: generateId(),
    userId: userId,
    exploredDepartments: [],
    bookmarkedPrograms: [],
    bookmarkedJobs: [],
    bookmarkedStartups: [],
    bookmarkedExams: [],
    personalCollections: [],
    createdAt: now,
    updatedAt: now
  };
  db.preferences.push(prefRecord);

  writeDB(db);
  return userRecord;
}

async function updateUser(id, updates) {
  const strId = String(id);

  if (isMongoConnected()) {
    try {
      const { User } = getModels();
      return await User.findByIdAndUpdate(strId, updates, { new: true });
    } catch (err) {
      console.warn('MongoDB update failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  const idx = db.users.findIndex(u => String(u._id) === strId);
  if (idx === -1) return null;

  const current = db.users[idx];
  db.users[idx] = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  writeDB(db);
  return db.users[idx];
}

// ============================================================================
// PREFERENCES & BOOKMARKS
// ============================================================================

async function getPreferences(userId) {
  const strUserId = String(userId);

  if (isMongoConnected()) {
    try {
      const { UserPreference } = getModels();
      let pref = await UserPreference.findOne({ userId: strUserId });
      if (!pref) {
        pref = new UserPreference({ userId: strUserId });
        await pref.save();
      }
      return pref;
    } catch (err) {
      console.warn('MongoDB query failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  let pref = db.preferences.find(p => String(p.userId) === strUserId);
  if (!pref) {
    const now = new Date().toISOString();
    pref = {
      _id: generateId(),
      userId: strUserId,
      exploredDepartments: [],
      bookmarkedPrograms: [],
      bookmarkedJobs: [],
      bookmarkedStartups: [],
      bookmarkedExams: [],
      personalCollections: [],
      createdAt: now,
      updatedAt: now
    };
    db.preferences.push(pref);
    writeDB(db);
  }
  return pref;
}

async function trackDepartment(userId, department) {
  const strUserId = String(userId);
  const pref = await getPreferences(strUserId);

  if (isMongoConnected()) {
    try {
      if (!pref.exploredDepartments.includes(department)) {
        pref.exploredDepartments.push(department);
        await pref.save();
      }
      return pref;
    } catch (err) {
      console.warn('MongoDB save failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  const pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  if (pIdx !== -1) {
    if (!db.preferences[pIdx].exploredDepartments.includes(department)) {
      db.preferences[pIdx].exploredDepartments.push(department);
      db.preferences[pIdx].updatedAt = new Date().toISOString();
      writeDB(db);
    }
    return db.preferences[pIdx];
  }
  return pref;
}

async function addBookmark(userId, bookmarkData) {
  const strUserId = String(userId);
  const { type, elementId, title, department = 'all', metadata = {} } = bookmarkData;
  const bookmarkField = `bookmarked${type.charAt(0).toUpperCase() + type.slice(1)}s`;

  if (isMongoConnected()) {
    try {
      const pref = await getPreferences(strUserId);
      if (pref[bookmarkField] && !pref[bookmarkField].some(item => item.elementId === elementId)) {
        pref[bookmarkField].push({ title, type, elementId, department, metadata, addedAt: new Date() });
        await pref.save();
      }
      return pref;
    } catch (err) {
      console.warn('MongoDB bookmark save failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  let pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  if (pIdx === -1) {
    await getPreferences(strUserId);
    pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  }

  const currentPref = db.preferences[pIdx];
  if (!currentPref[bookmarkField]) {
    currentPref[bookmarkField] = [];
  }

  const exists = currentPref[bookmarkField].some(b => String(b.elementId) === String(elementId));
  if (!exists) {
    currentPref[bookmarkField].push({
      _id: generateId(),
      title,
      type,
      elementId: String(elementId),
      department,
      metadata,
      addedAt: new Date().toISOString()
    });
    currentPref.updatedAt = new Date().toISOString();
    writeDB(db);
  }

  return currentPref;
}

async function removeBookmark(userId, type, elementId) {
  const strUserId = String(userId);
  const bookmarkField = `bookmarked${type.charAt(0).toUpperCase() + type.slice(1)}s`;

  if (isMongoConnected()) {
    try {
      const pref = await getPreferences(strUserId);
      if (pref[bookmarkField]) {
        pref[bookmarkField] = pref[bookmarkField].filter(item => String(item.elementId) !== String(elementId));
        await pref.save();
      }
      return pref;
    } catch (err) {
      console.warn('MongoDB bookmark removal failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  const pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  if (pIdx !== -1 && db.preferences[pIdx][bookmarkField]) {
    db.preferences[pIdx][bookmarkField] = db.preferences[pIdx][bookmarkField].filter(
      item => String(item.elementId) !== String(elementId)
    );
    db.preferences[pIdx].updatedAt = new Date().toISOString();
    writeDB(db);
    return db.preferences[pIdx];
  }
  return null;
}

async function createCollection(userId, name, description = '') {
  const strUserId = String(userId);

  if (isMongoConnected()) {
    try {
      const pref = await getPreferences(strUserId);
      pref.personalCollections.push({
        name: name.trim(),
        description: description.trim(),
        items: [],
        createdAt: new Date()
      });
      await pref.save();
      return pref;
    } catch (err) {
      console.warn('MongoDB collection create failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  const pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  if (pIdx !== -1) {
    if (!db.preferences[pIdx].personalCollections) {
      db.preferences[pIdx].personalCollections = [];
    }
    db.preferences[pIdx].personalCollections.push({
      _id: generateId(),
      name: name.trim(),
      description: description.trim(),
      items: [],
      createdAt: new Date().toISOString()
    });
    db.preferences[pIdx].updatedAt = new Date().toISOString();
    writeDB(db);
    return db.preferences[pIdx];
  }
  return null;
}

async function addToCollection(userId, collectionName, item) {
  const strUserId = String(userId);

  if (isMongoConnected()) {
    try {
      const pref = await getPreferences(strUserId);
      const collection = pref.personalCollections.find(c => c.name === collectionName);
      if (collection) {
        collection.items.push(item);
        await pref.save();
      }
      return pref;
    } catch (err) {
      console.warn('MongoDB addToCollection failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  const pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  if (pIdx !== -1 && db.preferences[pIdx].personalCollections) {
    const col = db.preferences[pIdx].personalCollections.find(c => c.name === collectionName);
    if (col) {
      col.items.push({
        _id: generateId(),
        ...item,
        addedAt: new Date().toISOString()
      });
      db.preferences[pIdx].updatedAt = new Date().toISOString();
      writeDB(db);
    }
    return db.preferences[pIdx];
  }
  return null;
}

async function removeFromCollection(userId, collectionName, elementId) {
  const strUserId = String(userId);

  if (isMongoConnected()) {
    try {
      const pref = await getPreferences(strUserId);
      const collection = pref.personalCollections.find(c => c.name === collectionName);
      if (collection) {
        collection.items = collection.items.filter(item => String(item.elementId) !== String(elementId));
        await pref.save();
      }
      return pref;
    } catch (err) {
      console.warn('MongoDB removeFromCollection failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  const pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  if (pIdx !== -1 && db.preferences[pIdx].personalCollections) {
    const col = db.preferences[pIdx].personalCollections.find(c => c.name === collectionName);
    if (col) {
      col.items = col.items.filter(item => String(item.elementId) !== String(elementId));
      db.preferences[pIdx].updatedAt = new Date().toISOString();
      writeDB(db);
    }
    return db.preferences[pIdx];
  }
  return null;
}

async function deleteCollection(userId, collectionName) {
  const strUserId = String(userId);

  if (isMongoConnected()) {
    try {
      const pref = await getPreferences(strUserId);
      pref.personalCollections = pref.personalCollections.filter(c => c.name !== collectionName);
      await pref.save();
      return pref;
    } catch (err) {
      console.warn('MongoDB deleteCollection failed, falling back to local store:', err.message);
    }
  }

  const db = readDB();
  const pIdx = db.preferences.findIndex(p => String(p.userId) === strUserId);
  if (pIdx !== -1 && db.preferences[pIdx].personalCollections) {
    db.preferences[pIdx].personalCollections = db.preferences[pIdx].personalCollections.filter(
      c => c.name !== collectionName
    );
    db.preferences[pIdx].updatedAt = new Date().toISOString();
    writeDB(db);
    return db.preferences[pIdx];
  }
  return null;
}

// ============================================================================
// AUDIT & ACTION LOGGING
// ============================================================================

async function logUserAction(userId, actionType, options = {}) {
  if (!userId) return null;
  const strUserId = String(userId);
  const now = new Date();

  const logEntry = {
    _id: generateId(),
    userId: strUserId,
    actionType,
    resourceInfo: {
      resourceType: options.resourceType || null,
      resourceId: options.resourceId || null,
      resourceName: options.resourceName || null,
      departmentId: options.departmentId || null,
      departmentName: options.departmentName || null
    },
    metadata: options.metadata || {},
    status: options.status || 'SUCCESS',
    error: options.error || null,
    sessionId: options.sessionId || null,
    summary: `${actionType} on ${options.resourceType || 'resource'}: ${options.resourceName || ''}`.trim(),
    timestamp: now.toISOString()
  };

  if (isMongoConnected()) {
    try {
      const { UserActionLog, User } = getModels();
      const doc = new UserActionLog({
        userId: strUserId,
        actionType,
        resourceInfo: logEntry.resourceInfo,
        metadata: logEntry.metadata,
        status: logEntry.status,
        error: logEntry.error,
        sessionId: logEntry.sessionId,
        summary: logEntry.summary,
        timestamp: now
      });
      await doc.save();

      // Safely update user activity statistics
      const update = { $set: { 'activityStats.lastActivityAt': now } };
      if (actionType === 'LOGIN') {
        update.$inc = { 'activityStats.totalLoginCount': 1 };
        update.$set['activityStats.lastLoginAt'] = now;
      } else if (actionType === 'BOOKMARK_ADD') {
        update.$inc = { 'activityStats.totalBookmarks': 1 };
      } else if (actionType === 'SKILL_SEARCH') {
        update.$inc = { 'activityStats.totalSearches': 1 };
      }
      await User.findByIdAndUpdate(strUserId, update);
      return doc;
    } catch (err) {
      console.warn('MongoDB log action failed, storing in local store:', err.message);
    }
  }

  const db = readDB();
  db.actionLogs.push(logEntry);

  // Update stats on local user record
  const uIdx = db.users.findIndex(u => String(u._id) === strUserId);
  if (uIdx !== -1) {
    const stats = db.users[uIdx].activityStats || {};
    stats.lastActivityAt = now.toISOString();
    if (actionType === 'LOGIN') {
      stats.totalLoginCount = (stats.totalLoginCount || 0) + 1;
      stats.lastLoginAt = now.toISOString();
    } else if (actionType === 'BOOKMARK_ADD') {
      stats.totalBookmarks = (stats.totalBookmarks || 0) + 1;
    } else if (actionType === 'SKILL_SEARCH') {
      stats.totalSearches = (stats.totalSearches || 0) + 1;
    }
    db.users[uIdx].activityStats = stats;
    db.users[uIdx].updatedAt = now.toISOString();
  }

  writeDB(db);
  return logEntry;
}

async function getUserActionHistory(userId, options = {}) {
  const strUserId = String(userId);
  const { limit = 50, skip = 0, actionType, startDate, endDate } = options;

  if (isMongoConnected()) {
    try {
      const { UserActionLog } = getModels();
      const query = { userId: strUserId };
      if (actionType) query.actionType = actionType;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }
      return await UserActionLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit);
    } catch (err) {
      console.warn('MongoDB log query failed, reading local store:', err.message);
    }
  }

  const db = readDB();
  let logs = db.actionLogs.filter(l => String(l.userId) === strUserId);
  if (actionType) logs = logs.filter(l => l.actionType === actionType);
  if (startDate) logs = logs.filter(l => new Date(l.timestamp) >= new Date(startDate));
  if (endDate) logs = logs.filter(l => new Date(l.timestamp) <= new Date(endDate));

  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return logs.slice(skip, skip + limit);
}

async function getUserActionSummary(userId) {
  const strUserId = String(userId);

  if (isMongoConnected()) {
    try {
      const { UserActionLog } = getModels();
      const summary = await UserActionLog.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(strUserId) } },
        { $group: { _id: '$actionType', count: { $sum: 1 }, lastOccurred: { $max: '$timestamp' } } },
        { $sort: { count: -1 } }
      ]);
      return summary;
    } catch (err) {
      console.warn('MongoDB summary failed, using local store:', err.message);
    }
  }

  const db = readDB();
  const userLogs = db.actionLogs.filter(l => String(l.userId) === strUserId);
  const counts = {};
  for (const log of userLogs) {
    if (!counts[log.actionType]) {
      counts[log.actionType] = { count: 0, lastOccurred: log.timestamp };
    }
    counts[log.actionType].count++;
    if (new Date(log.timestamp) > new Date(counts[log.actionType].lastOccurred)) {
      counts[log.actionType].lastOccurred = log.timestamp;
    }
  }

  return Object.entries(counts).map(([actionType, data]) => ({
    _id: actionType,
    count: data.count,
    lastOccurred: data.lastOccurred
  }));
}

async function getDepartmentAnalytics(departmentId) {
  if (isMongoConnected()) {
    try {
      const { UserActionLog } = getModels();
      const analytics = await UserActionLog.aggregate([
        { $match: { 'resourceInfo.departmentId': departmentId } },
        { $group: { _id: '$actionType', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
        { $project: { _id: 1, count: 1, uniqueUserCount: { $size: '$uniqueUsers' } } }
      ]);
      return analytics;
    } catch (err) {
      console.warn('MongoDB department analytics failed, using local store:', err.message);
    }
  }

  const db = readDB();
  const deptLogs = db.actionLogs.filter(
    l => l.resourceInfo && String(l.resourceInfo.departmentId) === String(departmentId)
  );

  const stats = {};
  for (const log of deptLogs) {
    if (!stats[log.actionType]) {
      stats[log.actionType] = { count: 0, users: new Set() };
    }
    stats[log.actionType].count++;
    stats[log.actionType].users.add(log.userId);
  }

  return Object.entries(stats).map(([actionType, data]) => ({
    _id: actionType,
    count: data.count,
    uniqueUserCount: data.users.size
  }));
}

// Initial self-check
ensureDataStore();

module.exports = {
  isMongoConnected,
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  getPreferences,
  trackDepartment,
  addBookmark,
  removeBookmark,
  createCollection,
  addToCollection,
  removeFromCollection,
  deleteCollection,
  logUserAction,
  getUserActionHistory,
  getUserActionSummary,
  getDepartmentAnalytics
};
