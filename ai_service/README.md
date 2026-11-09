# AI Skill Matcher Microservice

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.x-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Sentence_Transformers-FFD21E?style=flat-square)](https://huggingface.co/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Cosine_Similarity-F7931E?style=flat-square&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)

---

## 1. Overview

This is an optional Python-based machine learning microservice for sentence-embedding skill matching and job recommendations. The service runs a Flask HTTP listener on port 5001.

NOTE: The primary NxtStepGo Node.js application server includes its own built-in high-performance smart skill-matching engine that operates out of the box with zero external dependencies. This Python microservice is optional and can be activated when deep-learning vector embeddings (`all-MiniLM-L6-v2`) are specifically required.

---

## 2. Features

* **Semantic Understanding:** Uses HuggingFace's `all-MiniLM-L6-v2` transformer model to map skills and text into 384-dimensional dense vector space.
* **Confidence Scoring:** Calculates cosine similarity across pre-encoded job skill requirements.
* **Learning Resources:** Associates missing skills with curated online courses.
* **CORS Enabled:** Cross-Origin Resource Sharing enabled for communication with the primary Node.js application server.

---

## 3. Architecture

```
Client Browser
     |
     v
Node.js Express Application Server (Port 5000)
     |
     | [Optional proxy call if ENABLE_AI_SERVICE=true]
     v
Python Flask Microservice (Port 5001)
     |
     v
Sentence Transformers (all-MiniLM-L6-v2 Embeddings)
```

---

## 4. Setup and Installation

### 4.1 Install Python Dependencies

```bash
cd ai_service
pip install -r requirements.txt
```

### 4.2 Run the Microservice

```bash
python ai_service/skill_matcher_ai.py
```

Console output upon successful initialization:

```
[INFO] Loading semantic embedding model...
[INFO] Model loaded successfully
[INFO] Loading skill data from: src/models/skillData.json
[INFO] Loaded 15 jobs across 5 departments
[INFO] Starting AI Skill Matcher on port 5001...
```

---

## 5. API Endpoints

### 5.1 Match Skills
* **Endpoint:** `POST /api/ai-match`
* **Payload:**
  ```json
  {
    "skills": "Python, Machine Learning, Data Analysis",
    "department": "all"
  }
  ```

### 5.2 Extract Skills
* **Endpoint:** `POST /api/extract-skills`
* **Payload:**
  ```json
  {
    "text": "I can build models in Python and analyze genomic data.",
    "threshold": 0.65
  }
  ```

### 5.3 Health Check
* **Endpoint:** `GET /health`
* **Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "service": "AI Skill Matcher",
    "model": "all-MiniLM-L6-v2",
    "version": "1.0"
  }
  ```
