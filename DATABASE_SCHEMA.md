# NxtStepGo Database Schema Specification

[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-9.2-880000?style=flat-square&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![JSON](https://img.shields.io/badge/Storage-Local_JSON_Engine-000000?style=flat-square&logo=json&logoColor=white)](https://www.json.org/)

---

## 1. Overview

The NxtStepGo data model organizes student profiles, preferences, personal collections, and comprehensive action audit logs across four primary schemas:

1. `users`: Stores user identity, authentication credentials, profile data, and aggregated activity stats.
2. `user_preferences`: Manages department exploration records, categorized bookmarks, and user-created custom collections.
3. `user_action_logs`: An append-only audit trail capturing user interactions for telemetry and security monitoring.
4. `departments`: Structural catalog definitions for institutional branches.

Both MongoDB (via Mongoose) and the local atomic JSON storage engine (`data/local_db.json`) adhere strictly to this schema definition.

---

## 2. Collections and Schema Definitions

### 2.1 `users` Collection

Represents registered students, counselors, or administrative users.

#### Schema Fields

| Field Name | BSON Type | Required | Constraints / Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Primary Key | Unique user identifier (24-character hex string). |
| `name` | String | Yes | Trimmed | Full display name of the user. |
| `email` | String | Yes | Unique, Lowercase, Trimmed | Account email address used for authentication. |
| `password` | String | Yes | Bcrypt Hash String | Salted Bcrypt password hash (cost factor 10). |
| `profile.phone` | String | No | Default: `""` | Contact phone number. |
| `profile.location` | String | No | Default: `""` | City or region of the student. |
| `profile.bio` | String | No | Default: `""` | Short personal statement or summary. |
| `profile.avatar` | String | No | Default: `""` | URL to student profile photo. |
| `profile.currentDepartment` | String | No | Default: `"all"` | Currently selected or enrolled department. |
| `profile.yearOfStudy` | Number | No | Default: `null` | Current academic year (e.g., 1, 2, 3, 4). |
| `accountStatus` | String | Yes | Enum: `'active'`, `'inactive'`, `'suspended'`, `'deleted'`. Default: `'active'` | Administrative account status. |
| `activityStats.totalLoginCount`| Number | Yes | Default: `0` | Cumulative successful login count. |
| `activityStats.lastLoginAt` | Date | No | Default: `null` | Timestamp of most recent authentication. |
| `activityStats.lastLogoutAt` | Date | No | Default: `null` | Timestamp of most recent session logout. |
| `activityStats.totalBookmarks` | Number | Yes | Default: `0` | Running counter of items saved to bookmarks. |
| `activityStats.totalSearches` | Number | Yes | Default: `0` | Running counter of skill searches executed. |
| `activityStats.accountCreatedAt`| Date | Yes | Default: `Date.now` | Account creation timestamp. |
| `activityStats.lastActivityAt` | Date | No | Default: `Date.now` | Timestamp of most recent user-initiated action. |
| `notificationPreferences.emailNotifications` | Boolean | Yes | Default: `true` | System email delivery opt-in. |
| `notificationPreferences.jobAlerts` | Boolean | Yes | Default: `true` | Relevant career opening notification opt-in. |
| `notificationPreferences.programUpdates` | Boolean | Yes | Default: `true` | University admission update opt-in. |
| `notificationPreferences.weeklyDigest` | Boolean | Yes | Default: `false` | Weekly digest email opt-in. |
| `createdAt` | Date | Yes | Auto (timestamps) | Document insertion timestamp. |
| `updatedAt` | Date | Yes | Auto (timestamps) | Document update timestamp. |

#### Indexes

* `{ email: 1 }` (Unique): Enforces single account per email address and accelerates lookup on login.
* `{ "activityStats.lastActivityAt": -1 }`: Optimizes retention and active user telemetry queries.

---

### 2.2 `user_preferences` Collection

Stores all personal bookmarks, custom collections, and exploration history per user.

#### Schema Fields

| Field Name | BSON Type | Required | Constraints / Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Primary Key | Document identifier. |
| `userId` | ObjectId | Yes | Unique, Ref: `'User'` | Foreign key referencing `users._id`. |
| `exploredDepartments` | Array[String]| Yes | Default: `[]` | List of department slugs viewed by the student. |
| `bookmarkedPrograms` | Array[Item] | Yes | Default: `[]` | Saved postgraduate degree programs. |
| `bookmarkedJobs` | Array[Item] | Yes | Default: `[]` | Saved industrial job openings. |
| `bookmarkedStartups` | Array[Item] | Yes | Default: `[]` | Saved startup ecosystem companies. |
| `bookmarkedExams` | Array[Item] | Yes | Default: `[]` | Saved national competitive exams. |
| `personalCollections` | Array[Col] | Yes | Default: `[]` | User-created custom lists. |
| `createdAt` | Date | Yes | Default: `Date.now` | Document creation timestamp. |
| `updatedAt` | Date | Yes | Default: `Date.now` | Document update timestamp. |

#### Embedded Type: `Item` (CollectionItemSchema)

```json
{
  "title": "String (Required)",
  "type": "String (Required, Enum: ['program', 'job', 'exam', 'startup'])",
  "elementId": "String (Required)",
  "department": "String (Default: 'all')",
  "metadata": "Mixed (Optional object containing location, deadline, url)",
  "addedAt": "Date (Default: Date.now)"
}
```

#### Embedded Type: `Col` (PersonalCollectionSchema)

```json
{
  "_id": "ObjectId",
  "name": "String (Required, e.g. 'Priority M.Tech Target')",
  "description": "String (Optional)",
  "items": "[CollectionItemSchema]",
  "createdAt": "Date (Default: Date.now)"
}
```

#### Indexes

* `{ userId: 1 }` (Unique): Ensures exactly one preference document per student account.

---

### 2.3 `user_action_logs` Collection

Append-only telemetry collection recording all user operations for auditing, analytics, and diagnostics.

#### Schema Fields

| Field Name | BSON Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Unique audit record identifier. |
| `userId` | ObjectId | Yes | Reference to `users._id` (indexed). |
| `actionType` | String | Yes | Enum: `'LOGIN'`, `'LOGOUT'`, `'SIGNUP'`, `'BOOKMARK_ADD'`, `'BOOKMARK_REMOVE'`, `'SKILL_SEARCH'`, `'DEPARTMENT_VIEW'`, `'JOB_VIEW'`, `'PROGRAM_VIEW'`, `'EXAM_VIEW'`, `'STARTUP_VIEW'`, `'COLLECTION_CREATE'`, `'COLLECTION_UPDATE'`, `'COLLECTION_DELETE'`. |
| `resourceInfo.resourceType` | String | No | Target entity category (`'job'`, `'program'`, `'exam'`, `'startup'`, `'department'`, `'collection'`). |
| `resourceInfo.resourceId` | String | No | Target entity identifier or slug. |
| `resourceInfo.resourceName` | String | No | Display name of the referenced entity. |
| `resourceInfo.departmentId` | String | No | Associated department slug (e.g. `'biotech'`). |
| `resourceInfo.departmentName`| String | No | Associated department display title. |
| `metadata` | Mixed | No | Additional telemetry (search query, result count, duration). |
| `metadata.userAgent` | String | No | Client User-Agent string. |
| `metadata.ipAddress` | String | No | Client IP address. |
| `status` | String | Yes | Enum: `'SUCCESS'`, `'FAILED'`. Default: `'SUCCESS'`. |
| `error` | String | No | Error message if status is `'FAILED'`. |
| `sessionId` | String | No | Client session tracking token. |
| `summary` | String | No | Human-readable generated summary string. |
| `timestamp` | Date | Yes | Execution timestamp (indexed). |

#### Indexes

* `{ userId: 1, timestamp: -1 }`: Accelerates user history retrieval.
* `{ actionType: 1, timestamp: -1 }`: Accelerates platform analytics reporting.
* `{ "resourceInfo.departmentId": 1 }`: Accelerates department-specific telemetry.

---

### 2.4 `departments` Collection

Reference catalog of departments and branches.

#### Schema Fields

| Field Name | BSON Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | Yes | Primary Key. |
| `name` | String | Yes | Department title (e.g. `"Biotechnology"`). |
| `description` | String | No | Summary overview. |
| `programs` | Array[String]| No | List of associated program titles. |
| `jobs` | Array[String]| No | List of associated industrial roles. |
| `createdAt` | Date | Yes | Auto (timestamps). |
| `updatedAt` | Date | Yes | Auto (timestamps). |

---

## 3. Data Integrity and Validation Rules

1. **Email Normalization:** All emails are trimmed and converted to lowercase prior to database persistence.
2. **Password Invariant:** Password fields must be valid Bcrypt hash strings (`$2a$` or `$2b$`). Plain-text values are rejected at controller boundaries.
3. **Bookmark Deduplication:** The storage adapter verifies that `elementId` does not already exist within the targeted bookmark list before appending.
4. **Relational Consistency:** When a user account is deleted, dependent preferences and personal collections are scrubbed in the same transaction or atomic operation.
