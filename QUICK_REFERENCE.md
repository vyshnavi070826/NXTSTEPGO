# NxtStepGo Platform Quick Reference

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.22-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![JWT](https://img.shields.io/badge/JWT-Tokens-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Bcrypt](https://img.shields.io/badge/Bcrypt-Security-4A90E2?style=flat-square)](https://github.com/kelektiv/node.bcrypt.js)

---

## 1. Quick Commands

| Operation | Command | Description |
| :--- | :--- | :--- |
| **Start Server** | `npm start` | Runs application server on port 5000. |
| **Development** | `npm run dev` | Runs with nodemon hot-reload. |
| **Run Test Suite** | `npm test` | Executes end-to-end regression tests across all routes. |
| **Install Packages** | `npm install` | Installs locked dependencies. |

---

## 2. Platform Endpoints

### Web Pages

* Homepage: `http://localhost:5000/`
* Department Catalog: `http://localhost:5000/departments.html`
* Biotechnology Hub: `http://localhost:5000/hub.html?dept=biotech`
* Skill Matcher: `http://localhost:5000/skill-matcher.html`
* Student Login: `http://localhost:5000/login.html`
* Student Registration: `http://localhost:5000/signup.html`
* Bookmarks Dashboard: `http://localhost:5000/bookmarks.html`
* Personal Collections: `http://localhost:5000/collections.html`

### REST API Routes

* `GET /api/health` - System health probe and storage mode.
* `POST /api/auth/signup` - Register student account (name, email, password).
* `POST /api/auth/login` - Authenticate account and receive JWT token.
* `GET /api/preferences` - Retrieve user bookmarks and collections.
* `POST /api/preferences/bookmark` - Add item to bookmarks.
* `POST /api/preferences/remove-bookmark` - Remove item from bookmarks.
* `POST /api/preferences/collection/create` - Create personal collection.
* `POST /api/skill-matcher/match` - Smart skill matching against jobs.
* `POST /api/skill-matcher/extract` - Extract skills from free-form text.
* `GET /api/skill-matcher/available-skills` - List all unique skills.

---

## 3. Supported Departments

| Identifier | Department Name | Key Focus Areas |
| :--- | :--- | :--- |
| `chem-eng` | Chemical Engineering | Process Design, Catalysis, Separation, Thermodynamics |
| `biotech` | Biotechnology | Bioprocess, Fermentation, Molecular Biology, Immunology |
| `bioinfo` | Bioinformatics | Genomics Data Analysis, BLAST, Protein Modeling, Python |
| `bioeng-nano`| Bioengineering | Nanotechnology, Biocompatibility, Medical Devices |
| `chem` | Chemistry | Organic Synthesis, Analytical Chemistry, Spectroscopy, NMR |

---

## 4. Tracked User Actions

All actions are audited in `user_action_logs` and local storage:

* `SIGNUP`: New student account created.
* `LOGIN`: User authentication session established.
* `LOGOUT`: User session terminated.
* `DEPARTMENT_VIEW`: Department hub page explored.
* `BOOKMARK_ADD`: Opportunity added to student bookmarks.
* `BOOKMARK_REMOVE`: Opportunity removed from student bookmarks.
* `COLLECTION_CREATE`: New personal collection created.
* `COLLECTION_DELETE`: Personal collection deleted.
* `SKILL_SEARCH`: Diagnostic skill matching executed.
