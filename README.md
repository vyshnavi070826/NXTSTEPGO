# NxtStepGo Career Intelligence Hub

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.22-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9.2-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![JWT](https://img.shields.io/badge/JWT-Session_Tokens-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Bcrypt](https://img.shields.io/badge/Bcrypt-Password_Encryption-4A90E2?style=flat-square)](https://github.com/kelektiv/node.bcrypt.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

NxtStepGo is an enterprise career intelligence and institutional pathway platform tailored for undergraduate and postgraduate students in specialized sciences and engineering disciplines. The platform aggregates curated higher education programs (M.Tech and Ph.D.), national competitive examinations, industrial career roles, startup resources, and automated skill-to-role matching diagnostics across five specialized departments:

* Chemical Engineering
* Biotechnology
* Bioinformatics
* Bioengineering and Nanotechnology
* Chemistry

---

## Architecture Overview

The system runs on a unified, high-availability architecture designed for zero-downtime operation, resilient offline fallback, and high throughput.

```
Browser Client
   |
   | HTTP / REST (Static Pages, Assets, JSON APIs)
   v
Express Application Server (Node.js : Port 5000)
   |
   +---> Static Asset Engine (HTML5, Tailwind, Lucide Icons)
   |
   +---> Security Middleware (Bcrypt Hashing, JWT Bearer Token Verification)
   |
   +---> Smart Skill Matcher Engine (Levenshtein Distance + Semantic Category Matching)
   |
   +---> Resilient Storage Engine (src/services/storage.js)
            |
            |--- State Check: Is MongoDB Connected?
            |
            +---> YES: MongoDB Atlas / Local MongoDB Replica (Mongoose 9.2)
            |
            +---> NO:  Atomic Persistent JSON Vault (data/local_db.json)
```

### Architectural Decisions

1. **Unified Application Server:** Replaced the fragile multi-process requirement (Node.js web process + Python worker) with a single, high-efficiency Node.js application server. The application serves web assets, exposes REST endpoints, executes skill diagnostics, and handles persistence in a single process.
2. **Standardized Frontend:** Standardized on a semantic Multi-Page Application (MPA) layout backed by standard HTML5, CSS3, and JavaScript. The unreferenced monolithic React prototype (`NxstepGo.html`) has been decoupled from production routing.
3. **Dual-Mode Resilient Storage Engine:** Application operations (user registration, login, bookmarking, and personal collections) operate with zero degradation even if remote cloud databases are offline, persisting to an atomic local store (`data/local_db.json`) while automatically using MongoDB when connectivity is available.
4. **Hardened Security:** Passwords are cryptographically salted and hashed with `bcryptjs` (cost factor 10). Client sessions are authenticated via signed JSON Web Tokens (HS256).

---

## Directory Structure

```
NXTSTEPGO/
|-- data/                              # Local atomic storage vault (auto-created, git-ignored)
|   `-- local_db.json                  # Persistent records for offline operation
|-- frontend/                          # Client web interface assets
|   |-- login.html                     # Student authentication portal
|   |-- signup.html                    # Student registration portal
|   |-- script/                        # Client datasets and logic
|   |   `-- data.js                    # Curated departmental records and institutional data
|   |-- style/                         # Stylesheets
|   |   `-- styles.css                 # Custom utility styles and animations
|   `-- templates/                     # Multi-page templates
|       |-- bookmarks.html             # Personal saved bookmarks interface
|       |-- collections.html           # Custom student collections interface
|       |-- departments.html           # Branch selection catalog
|       |-- exams.html                 # Competitive examination guide
|       |-- hub.html                   # Central departmental intelligence hub
|       |-- index.html                 # Platform landing page
|       |-- jobs.html                  # Industry placement and job catalog
|       |-- programs.html              # M.Tech and Ph.D. university programs
|       |-- skill-matcher.html         # Automated skill diagnostic interface
|       |-- startup.html               # Entrepreneurial ecosystem directory
|       `-- startup-guide.html         # Comprehensive startup execution guide
|-- scripts/                           # Engineering and verification utilities
|   |-- insertTestDoc.js               # Database seeding test script
|   `-- verify_e2e.js                  # Automated end-to-end regression test suite
|-- src/                               # Application source code
|   |-- app.js                         # Express application setup, routes, and middleware
|   |-- server.js                      # HTTP server lifecycle and graceful shutdown
|   |-- controllers/                   # REST controller business logic
|   |   |-- analyticsController.js     # User action telemetry and audit reporting
|   |   |-- authController.js          # Registration, login, and JWT generation
|   |   |-- departmentController.js    # Department management
|   |   |-- preferenceController.js    # Bookmarks, collections, and tracking
|   |   `-- skillMatcherController.js  # Smart skill extraction and matching engine
|   |-- middleware/                    # Security and request interceptors
|   |   `-- index.js                   # JWT token and user authentication validator
|   |-- models/                        # Mongoose schemas and skill metadata
|   |   |-- department.js              # Department schema
|   |   |-- skillData.js               # Skill catalog and learning resource references
|   |   |-- skillData.json             # Raw skill mappings
|   |   |-- User.js                    # User profile and account schema
|   |   |-- UserActionLog.js           # Comprehensive user action audit schema
|   |   `-- UserPreference.js          # Bookmarks and personal collection schema
|   |-- routes/                        # Express routing declarations
|   |   |-- analyticsRoutes.js         # Analytics endpoints
|   |   |-- authRoutes.js              # Authentication endpoints
|   |   |-- departmentRoutes.js        # Department endpoints
|   |   |-- preferenceRoutes.js        # Bookmarks and collections endpoints
|   |   `-- skillMatcherRoutes.js      # Skill matching endpoints
|   `-- services/                      # Enterprise service adapters
|       `-- storage.js                 # Resilient storage engine (MongoDB + local fallback)
|-- .env.example                       # Environment configuration template
|-- .gitignore                         # Version control exclusions
|-- package.json                       # Package manifest and lifecycle scripts
`-- package-lock.json                  # Locked dependency tree
```

---

## Installation and Quick Start

### Prerequisites

* Node.js 18.0.0 or higher (Node.js 24.x recommended)
* npm 9.0.0 or higher

### Step 1: Install Dependencies

Execute the clean installation command:

```bash
npm install
```

### Step 2: Configure Environment

Copy the example environment file to `.env`:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Review `.env` variables:

```ini
PORT=5000
NODE_ENV=development
JWT_SECRET=replace_with_a_long_random_entropy_secret_string

# Optional: Remote MongoDB connection string.
# If omitted or unreachable, the system automatically runs using local atomic storage.
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
```

### Step 3: Start the Application

Start the web application server:

```bash
npm start
```

For development with hot reloading:

```bash
npm run dev
```

### Step 4: Access the Platform

Open any modern web browser and navigate to:

```
http://localhost:5000/
```

---

## Automated Verification and Tests

The platform includes an automated regression test suite covering health probes, authentication security, bad-password rejection, bookmark operations, collections management, smart skill matching, and HTTP route availability:

```bash
npm test
```

### Test Suite Execution Output

```
Testing NxtStepGo End-to-End...
1. Health check: 200 {"status":"ok","storageMode":"local-file-store","mongoConnected":false}
2. Signup status: 201 User ID: 3b8fe34a92659b5fe1251e31 Token present: true
3. Login status: 200 User: Verified Student Token present: true
4. Bad login rejected: YES (400)
5. Bookmark status: 200 job bookmarked successfully
6. Bookmarked jobs count: 1
7. Create Collection status: 201 Collection created
8. Skill Match status: 200 Total matches: 6 Top match: Data Scientist
Page: / -> HTTP 200
Page: /departments.html -> HTTP 200
Page: /hub.html?dept=biotech -> HTTP 200
Page: /jobs.html?dept=biotech -> HTTP 200
Page: /exams.html?dept=biotech -> HTTP 200
Page: /programs.html?dept=biotech -> HTTP 200
Page: /bookmarks.html -> HTTP 200
Page: /collections.html -> HTTP 200
Page: /login.html -> HTTP 200
Page: /signup.html -> HTTP 200
Page: /skill-matcher.html -> HTTP 200

[OK] ALL VERIFICATION TESTS PASSED SUCCESSFULLY
```

---

## Core API Specification

### 1. Health Probe

* **Endpoint:** `GET /api/health`
* **Access:** Public
* **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "storageMode": "local-file-store",
    "mongoConnected": false,
    "uptime": 128.45,
    "timestamp": "2026-11-09T10:00:00.000Z"
  }
  ```

### 2. Authentication

#### Register Account
* **Endpoint:** `POST /api/auth/signup`
* **Access:** Public
* **Payload:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securePassword123"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "message": "Signup successful",
    "token": "eyJhbGciOi...",
    "userId": "acbfe006012d8bef5f581be2",
    "user": {
      "_id": "acbfe006012d8bef5f581be2",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "profile": { "currentDepartment": "all" }
    }
  }
  ```

#### Authenticate
* **Endpoint:** `POST /api/auth/login`
* **Access:** Public
* **Payload:**
  ```json
  {
    "email": "jane@example.com",
    "password": "securePassword123"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOi...",
    "userId": "acbfe006012d8bef5f581be2",
    "user": {
      "_id": "acbfe006012d8bef5f581be2",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "profile": { "currentDepartment": "all" }
    }
  }
  ```

### 3. Preferences and Bookmarks

*Header Required:* `Authorization: Bearer <token>` (or `x-user-id: <id>`)

#### Retrieve User Preferences
* **Endpoint:** `GET /api/preferences`
* **Response (200 OK):**
  ```json
  {
    "userId": "acbfe006012d8bef5f581be2",
    "bookmarkedPrograms": [],
    "bookmarkedJobs": [],
    "bookmarkedStartups": [],
    "bookmarkedExams": [],
    "personalCollections": []
  }
  ```

#### Add Bookmark
* **Endpoint:** `POST /api/preferences/bookmark`
* **Payload:**
  ```json
  {
    "type": "job",
    "elementId": "Bioinformatics Analyst",
    "title": "Bioinformatics Analyst",
    "department": "bioinfo",
    "metadata": { "location": "Bangalore" }
  }
  ```

#### Create Collection
* **Endpoint:** `POST /api/preferences/collection/create`
* **Payload:**
  ```json
  {
    "name": "Target M.Tech Programs",
    "description": "Institutions to apply to in 2027"
  }
  ```

### 4. Skill Diagnostic Engine

#### Match Skills to Roles
* **Endpoint:** `POST /api/skill-matcher/match`
* **Payload:**
  ```json
  {
    "skills": "Python, Machine Learning, Data Analysis",
    "department": "all"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "success": true,
    "method": "smart-match",
    "skillsProvided": ["Python", "Machine Learning", "Data Analysis"],
    "totalMatches": 6,
    "matches": [
      {
        "title": "Data Scientist",
        "department": "bioinfo",
        "confidence": 92,
        "matchedSkills": ["Python", "Machine Learning", "Data Analysis"],
        "remainingSkills": ["SQL", "Statistics"]
      }
    ]
  }
  ```

#### Extract Skills from Natural Language
* **Endpoint:** `POST /api/skill-matcher/extract`
* **Payload:**
  ```json
  {
    "text": "I have experience working with HPLC, mass spectrometry, and cell cultures."
  }
  ```

---

## Security and Compliance Standards

* **Password Security:** Salted and hashed using `bcryptjs` with 10 salt rounds. Passwords are never returned in JSON responses or log outputs.
* **Token Authentication:** Cryptographic JWT tokens signed with HS256 algorithm and 7-day expiration.
* **Fail-Closed Principle:** Protected routes reject requests lacking valid credentials with HTTP 401 Unauthorized or HTTP 404 Not Found.
* **Audit Trail:** Critical user actions (LOGIN, SIGNUP, BOOKMARK_ADD, BOOKMARK_REMOVE, COLLECTION_CREATE) are recorded in an audit table with client metadata and timestamps.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
