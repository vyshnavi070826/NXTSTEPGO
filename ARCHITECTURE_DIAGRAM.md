# NxtStepGo System Architecture Specification

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.22-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9.2-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-HS256_Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Bcrypt](https://img.shields.io/badge/Bcrypt-Salted_Hash-4A90E2?style=flat-square)](https://github.com/kelektiv/node.bcrypt.js)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Utility_UI-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 1. System Topology

```
+-------------------------------------------------------------------------+
|                              CLIENT LAYER                               |
|                                                                         |
|  Standard Desktop & Mobile Web Browsers (HTML5, Tailwind CSS, Lucide)   |
|  - Branch Exploration   - Department Hubs       - Jobs & Exams Guides   |
|  - Skill Diagnostics    - Personal Bookmarks    - Custom Collections    |
+------------------------------------+------------------------------------+
                                     |
                                     | HTTPS / REST Calls
                                     v
+-------------------------------------------------------------------------+
|                        APPLICATION SERVER (NODE.JS)                     |
|                                                                         |
|  +---------------------+   +---------------------+   +---------------+  |
|  |   Static Router     |   |   Security Gate     |   | Smart Matcher |  |
|  | (Express Static UI) |   | (JWT / Bcrypt / ACL)|   | (Fuzzy/Levens)|  |
|  +---------------------+   +---------------------+   +---------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |             CONTROLLERS & REST APIS (/api/*)                      |  |
|  |  - AuthController        - PreferenceController                   |  |
|  |  - DepartmentController  - AnalyticsController                    |  |
|  |  - SkillMatcherController                                         |  |
|  +-------------------------------------------------------------------+  |
|                                     |                                   |
|                                     v                                   |
|  +-------------------------------------------------------------------+  |
|  |             RESILIENT STORAGE ADAPTER (src/services/storage.js)   |  |
|  |  Automatically routes requests based on active database state    |  |
|  +-------------------------------------------------------------------+  |
+-------------------+---------------------------------+-------------------+
                    |                                 |
         [MongoDB Ready: TRUE]              [MongoDB Ready: FALSE]
                    |                                 |
                    v                                 v
+-----------------------------------+   +---------------------------------+
|          PRIMARY STORAGE          |   |       LOCAL ATOMIC VAULT        |
|  MongoDB Atlas / Replica Set      |   |  data/local_db.json             |
|  - users collection               |   |  - Atomic sync writes via tmp   |
|  - user_preferences collection    |   |  - Zero cloud dependency        |
|  - user_action_logs collection    |   |  - Complete schema parity       |
+-----------------------------------+   +---------------------------------+
```

---

## 2. Component Responsibility Matrix

| Component | File Path | Primary Responsibility |
| :--- | :--- | :--- |
| **Server Lifecycle** | `src/server.js` | Initializes HTTP listener, manages port configuration, handles graceful SIGINT/SIGTERM teardown. |
| **Application Core** | `src/app.js` | Configures Express middleware, mounts static directories, defines health checks, routes API endpoints. |
| **Storage Engine** | `src/services/storage.js` | Dual-mode persistence engine. Seamlessly switches between MongoDB and local JSON database. |
| **Auth Controller** | `src/controllers/authController.js` | Validates registration, executes Bcrypt password hashing, signs JWT session tokens. |
| **Preference Controller**| `src/controllers/preferenceController.js` | Manages departmental visit tracking, bookmarks addition/removal, and personal collections. |
| **Skill Matcher** | `src/controllers/skillMatcherController.js` | Executes fuzzy string matching, Levenshtein distance calculations, and category clustering. |
| **Analytics Controller**| `src/controllers/analyticsController.js` | Provides audit logs, user activity aggregates, and departmental engagement statistics. |
| **Auth Middleware** | `src/middleware/index.js` | Enforces fail-closed token validation via JWT; authenticates user identity before protected operations. |

---

## 3. Data Flow and Execution Lifecycles

### 3.1 User Registration and Session Establishment

```
Client Form Submission (POST /api/auth/signup)
   |
   v
AuthController: Validate payload (name, email format, password min length 6)
   |
   v
Storage Adapter: Check if email already exists (case-insensitive)
   |--[Exists]--> Return HTTP 400 ("An account with this email already exists")
   |
   v
Bcrypt: Generate salt (10 rounds) and hash password
   |
   v
Storage Adapter: Create User record + Initialize empty UserPreference document
   |
   v
JWT: Sign token with payload { userId, email, name }, 7-day expiration
   |
   v
Audit Logger: Write SIGNUP event to user_action_logs
   |
   v
Response: Return HTTP 201 Created with JWT token and sanitized User profile (password omitted)
```

### 3.2 Bookmarking a Career Resource

```
Client Action: User clicks "Bookmark" on Job, Program, Exam, or Startup card
   |
   v
Client Request: POST /api/preferences/bookmark with headers:
   - Authorization: Bearer <token>
   - Content-Type: application/json
   |
   v
Auth Middleware: Validate JWT signature and expiration
   |--[Invalid]--> Return HTTP 401 Unauthorized
   |--[Valid]----> Attach req.user and proceed
   |
   v
PreferenceController: Validate bookmark type enum ('program', 'job', 'exam', 'startup')
   |
   v
Storage Adapter: Append bookmark to matching array if elementId is not already present
   |
   v
Audit Logger: Record BOOKMARK_ADD event in action log
   |
   v
Response: Return HTTP 200 OK with updated UserPreference document
```

---

## 4. Dual-Architecture Resolution

### Resolution Summary

Prior to this standardization, the repository contained two architectural splits:
1. **Frontend:** Coexistence of a multi-page HTML architecture (`frontend/templates/*.html`) and a standalone, monolithic React single-file script (`NxstepGo.html`).
2. **Backend:** Expectation of two distinct background processes (Node.js on port 5000 and a Python Flask worker on port 5001 requiring PyTorch and Sentence Transformers).

### Implemented Architectural Decisions

* **Frontend Resolution:** The Multi-Page Application (MPA) was selected as the standard production frontend. It provides faster initial page loads, eliminates CDN dependencies on runtime Babel transpilation, and ensures clean browser history management. The monolithic prototype (`NxstepGo.html`) was unlinked from production navigation.
* **Backend Resolution:** The Node.js application server was upgraded with an internal smart skill-matching engine that provides Levenshtein distance fuzzy matching, typo resilience, and category semantic clustering in pure Node.js. This eliminates the operational overhead of managing a 2.5 GB PyTorch environment while maintaining the option to activate the external Python microservice via environment flag (`ENABLE_AI_SERVICE=true`) if needed.

---

## 5. Security Architecture

1. **Authentication:**
   * Passwords are encrypted before storage using `bcryptjs` with a work factor of 10.
   * Authentication sessions are verified via cryptographically signed JWT tokens (HS256).
   * Token expiration is bounded to 7 days.
2. **Authorization & Tenant Isolation:**
   * Every read and write to user preferences, bookmarks, collections, and action logs references the authenticated user ID extracted from the verified token.
   * Spoofing user identifiers via manual headers without valid signatures is blocked by `src/middleware/index.js`.
3. **Information Disclosure Prevention:**
   * User documents returned to client endpoints omit password hashes.
   * Authentication failures return generic error messages ("Invalid email or password") to prevent user enumeration attacks.
   * Sensitive files (`.env`, `data/local_db.json`, logs) are excluded from version control via `.gitignore`.
