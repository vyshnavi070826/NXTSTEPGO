# NxtStepGo Developer and Operations Handover Manual

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.22-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9.2-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-HS256-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Bcrypt](https://img.shields.io/badge/Bcrypt-Security-4A90E2?style=flat-square)](https://github.com/kelektiv/node.bcrypt.js)
[![Test Suite](https://img.shields.io/badge/Tests-Passing_100%25-brightgreen?style=flat-square)](https://github.com/)

---

## 1. Engineering Principles

Any engineer contributing to or maintaining NxtStepGo must uphold these non-negotiable operational principles:

1. **Fail Closed:** Authentication, authorization, and input validation must never default to open. Unauthenticated or malformed requests must be halted with HTTP 400 or 401.
2. **Resilience and Zero Silent Loss:** All state modifications must be persisted atomically. The storage layer must function predictably regardless of remote database status.
3. **No Sensitive Data Leaks:** Passwords must always be hashed with `bcryptjs` before storage. Secrets, credentials, and raw hashes must never appear in API responses, logs, or source code.
4. **Deterministic Testing:** All features and bug fixes must be backed by reproducible automated verification (`npm test`).

---

## 2. Local Environment Setup

### 2.1 Prerequisites

* **Node.js:** v18.x or v20.x or v24.x LTS.
* **npm:** v9.x or higher.
* **Git:** For version control tracking.

### 2.2 Quick Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd NXTSTEPGO

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# 4. Execute test suite to verify baseline integrity
npm test

# 5. Start the local server
npm start
```

---

## 3. Storage Layer Mechanics

The persistence layer (`src/services/storage.js`) implements a resilient dual-mode adapter:

```
Request to storage.js
   |
   |-- Check: mongoose.connection.readyState === 1 ?
   |
   +---> [TRUE]: Delegate directly to Mongoose Models (User, UserPreference, UserActionLog)
   |
   +---> [FALSE]: Read and Write to Atomic Local Store (data/local_db.json)
```

### Key Implementation Invariants

* **Atomic File Writes:** In local storage mode, data is serialized to `data/local_db.json.tmp` and renamed to `data/local_db.json` via synchronous atomic filesystem operations. This prevents data corruption during unexpected server interruptions.
* **ID Format Compatibility:** Generated local IDs use 24-character hexadecimal strings (`crypto.randomBytes(12).toString('hex')`), ensuring 100% structural compatibility with MongoDB ObjectIDs.
* **No Database Hangs:** Mongoose is initialized with `bufferCommands: false` and a 2.5-second connection timeout, ensuring that offline or blocked cloud connections never freeze HTTP requests.

---

## 4. API Endpoints Reference

### Authentication Endpoints

* `POST /api/auth/signup`: Create a new student account. Validates email uniqueness and hashes password with Bcrypt.
* `POST /api/auth/login`: Authenticate email and password. Returns signed JWT bearer token.

### Preference and Bookmark Endpoints

*All preference endpoints require `Authorization: Bearer <token>` or verified `x-user-id` header.*

* `GET /api/preferences`: Retrieve user preferences, bookmarked resources, and personal collections.
* `POST /api/preferences/bookmark`: Add resource to bookmarks (`type`: `'program'`, `'job'`, `'exam'`, `'startup'`).
* `POST /api/preferences/remove-bookmark`: Remove resource from bookmarks.
* `POST /api/preferences/collection/create`: Create new personal collection.
* `POST /api/preferences/collection/add-item`: Add item to personal collection.
* `POST /api/preferences/collection/remove-item`: Remove item from personal collection.
* `POST /api/preferences/collection/delete`: Delete personal collection.
* `POST /api/preferences/track-department`: Record department exploration event.

### Skill Diagnostic Endpoints

* `POST /api/skill-matcher/match`: Matches user skill string against job catalog using exact, category-level, and Levenshtein distance calculations.
* `POST /api/skill-matcher/extract`: Extracts validated skills from free-form natural language text.
* `GET /api/skill-matcher/available-skills`: Returns sorted list of all unique skills across all departments.
* `GET /api/skill-matcher/learning-resources/:skill`: Returns curated course links for a specified skill.

### System Endpoints

* `GET /api/health`: Health probe returning operational status, storage mode, and uptime.

---

## 5. Automated Testing Guidelines

The automated regression test suite is located at `scripts/verify_e2e.js`. It runs end-to-end integration tests over local HTTP without requiring external testing frameworks.

To execute the suite:

```bash
npm test
```

### Adding New Test Cases

When creating a new route or modifying business logic, append a validation test to `scripts/verify_e2e.js`:

```javascript
// Example test case in scripts/verify_e2e.js
const result = await request('POST', '/api/example/endpoint', { key: 'value' }, authHeader);
if (result.status !== 200) {
  throw new Error('Example endpoint failed to return HTTP 200');
}
```

---

## 6. Production Deployment Checklist

Before deploying NxtStepGo to staging or production environments, verify the following:

1. **Environment Secrets:** Ensure `JWT_SECRET` in `.env` is set to a cryptographically random string with high entropy. Never commit `.env` to git.
2. **MongoDB Connection String:** When connecting to a production MongoDB Atlas cluster, set `MONGO_URI` to a verified connection string with valid network access whitelist.
3. **Process Supervision:** In production, run the server under a process manager such as PM2 or systemd:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name nxtstepgo
   ```
4. **Reverse Proxy:** Terminate TLS/SSL (HTTPS) at Nginx or Cloudflare and proxy incoming traffic to port 5000:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name career.nxtstepgo.com;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
5. **Static Asset Caching:** Configure reverse proxy cache-control headers for `/style/*` and `/script/*` assets.
