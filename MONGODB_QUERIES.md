# NxtStepGo MongoDB Telemetry and Query Playbook

[![MongoDB](https://img.shields.io/badge/MongoDB-Aggregations-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-9.2-880000?style=flat-square&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)

---

## 1. Overview

This playbook provides verified MongoDB aggregation pipelines and administration queries for the NxtStepGo platform. All queries are optimized for the indexes defined in `DATABASE_SCHEMA.md` and operate seamlessly with both MongoDB Atlas and local MongoDB replica sets.

---

## 2. User Engagement and Activity Queries

### 2.1 Top 10 Most Active Students (Last 30 Days)

Retrieves the students with the highest number of interactions over the past month.

```javascript
db.user_action_logs.aggregate([
  {
    $match: {
      timestamp: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  },
  {
    $group: {
      _id: "$userId",
      actionCount: { $sum: 1 },
      lastAction: { $max: "$timestamp" }
    }
  },
  {
    $sort: { actionCount: -1 }
  },
  {
    $limit: 10
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "user"
    }
  },
  {
    $project: {
      _id: 0,
      userId: "$_id",
      userName: { $arrayElemAt: ["$user.name", 0] },
      userEmail: { $arrayElemAt: ["$user.email", 0] },
      actionCount: 1,
      lastAction: 1
    }
  }
]);
```

### 2.2 User Activity Summary (Last 7 Days)

Groups actions taken by a specific student to assess feature usage.

```javascript
db.user_action_logs.aggregate([
  {
    $match: {
      userId: ObjectId("TARGET_USER_ID"),
      timestamp: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  },
  {
    $group: {
      _id: "$actionType",
      count: { $sum: 1 },
      lastPerformed: { $max: "$timestamp" }
    }
  },
  {
    $sort: { count: -1 }
  }
]);
```

### 2.3 Dormant Accounts (Inactive for 30+ Days)

Identifies registered students who have not initiated an action in 30 days.

```javascript
db.users.find(
  {
    "activityStats.lastActivityAt": {
      $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    },
    accountStatus: "active"
  },
  {
    name: 1,
    email: 1,
    "activityStats.lastActivityAt": 1,
    "activityStats.totalBookmarks": 1
  }
).sort({ "activityStats.lastActivityAt": 1 });
```

---

## 3. Bookmark and Career Telemetry Queries

### 3.1 Most Bookmarked Career Roles Across Departments

Ranks the most popular industrial positions saved by students.

```javascript
db.user_action_logs.aggregate([
  {
    $match: {
      actionType: "BOOKMARK_ADD",
      "resourceInfo.resourceType": "job"
    }
  },
  {
    $group: {
      _id: "$resourceInfo.resourceName",
      totalBookmarks: { $sum: 1 },
      uniqueStudents: { $addToSet: "$userId" },
      departmentId: { $first: "$resourceInfo.departmentId" }
    }
  },
  {
    $project: {
      jobTitle: "$_id",
      totalBookmarks: 1,
      studentCount: { $size: "$uniqueStudents" },
      departmentId: 1,
      _id: 0
    }
  },
  {
    $sort: { totalBookmarks: -1 }
  },
  {
    $limit: 15
  }
]);
```

### 3.2 Most Popular Higher Education Programs (M.Tech / Ph.D.)

Analyzes which universities and degrees attract the most student interest.

```javascript
db.user_action_logs.aggregate([
  {
    $match: {
      actionType: "BOOKMARK_ADD",
      "resourceInfo.resourceType": "program"
    }
  },
  {
    $group: {
      _id: "$resourceInfo.resourceName",
      bookmarkCount: { $sum: 1 },
      departmentId: { $first: "$resourceInfo.departmentId" }
    }
  },
  {
    $sort: { bookmarkCount: -1 }
  },
  {
    $limit: 20
  }
]);
```

### 3.3 Bookmark Retention and Removal Rate

Calculates the ratio of bookmark additions versus removals to determine student conviction.

```javascript
db.user_action_logs.aggregate([
  {
    $match: {
      actionType: { $in: ["BOOKMARK_ADD", "BOOKMARK_REMOVE"] },
      "resourceInfo.resourceType": "job"
    }
  },
  {
    $group: {
      _id: "$resourceInfo.resourceName",
      added: {
        $sum: { $cond: [{ $eq: ["$actionType", "BOOKMARK_ADD"] }, 1, 0] }
      },
      removed: {
        $sum: { $cond: [{ $eq: ["$actionType", "BOOKMARK_REMOVE"] }, 1, 0] }
      }
    }
  },
  {
    $project: {
      jobTitle: "$_id",
      totalSaved: "$added",
      totalUnsaved: "$removed",
      removalPercentage: {
        $round: [
          {
            $multiply: [
              { $divide: ["$removed", { $max: ["$added", 1] }] },
              100
            ]
          },
          1
        ]
      },
      _id: 0
    }
  },
  {
    $sort: { totalSaved: -1 }
  }
]);
```

---

## 4. Department Engagement Analytics

### 4.1 Department Traffic and Interaction Volume

Aggregates page views and interaction counts across all five academic disciplines.

```javascript
db.user_action_logs.aggregate([
  {
    $match: {
      "resourceInfo.departmentId": { $exists: true, $ne: null }
    }
  },
  {
    $group: {
      _id: "$resourceInfo.departmentId",
      totalInteractions: { $sum: 1 },
      uniqueVisitors: { $addToSet: "$userId" }
    }
  },
  {
    $project: {
      department: "$_id",
      totalInteractions: 1,
      uniqueVisitorCount: { $size: "$uniqueVisitors" },
      _id: 0
    }
  },
  {
    $sort: { totalInteractions: -1 }
  }
]);
```

### 4.2 Cross-Disciplinary Department Exploration

Finds students who explore multiple engineering or scientific fields.

```javascript
db.userpreferences.aggregate([
  {
    $project: {
      userId: 1,
      departmentsExploredCount: { $size: "$exploredDepartments" },
      exploredDepartments: 1
    }
  },
  {
    $match: {
      departmentsExploredCount: { $gt: 1 }
    }
  },
  {
    $sort: { departmentsExploredCount: -1 }
  }
]);
```

---

## 5. Security and Audit Queries

### 5.1 Recent Authentication Events

Audits all login attempts with IP addresses and user agents.

```javascript
db.user_action_logs.find(
  { actionType: "LOGIN" },
  {
    userId: 1,
    "metadata.email": 1,
    "metadata.ipAddress": 1,
    "metadata.userAgent": 1,
    status: 1,
    timestamp: 1
  }
).sort({ timestamp: -1 }).limit(25);
```

### 5.2 User Profile with Stored Preferences (Complete Record)

Fetches a consolidated document joining user credentials, profile stats, and personal collections.

```javascript
db.users.aggregate([
  {
    $match: { _id: ObjectId("TARGET_USER_ID") }
  },
  {
    $lookup: {
      from: "userpreferences",
      localField: "_id",
      foreignField: "userId",
      as: "preferences"
    }
  },
  {
    $unwind: {
      path: "$preferences",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      password: 0 // Explicitly omit password hash from output
    }
  }
]);
```
