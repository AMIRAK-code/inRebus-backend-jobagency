# inRebus Agency - Recruitment Matching System

Enterprise-grade recruitment platform connecting industrial candidates to job offers using NLP-based semantic matching and the Piedmont Regional Skills Taxonomy.

## Architecture

```
inRebus-backend-jobagency/
├── backend/                     # Python 3.11+ / FastAPI backend
│   ├── agency_api.py            # REST API endpoints (candidates, offers, matching)
│   ├── skill_analyzer.py        # NLP matching engine (Sentence-Transformers + TF-IDF)
│   ├── database.py              # SQLAlchemy ORM models + PostgreSQL connection
│   ├── models.py                # Pydantic v2 request/response schemas
│   ├── config.py                # Environment-based configuration (pydantic-settings)
│   ├── requirements.txt         # Python dependencies
│   ├── pyproject.toml           # pytest configuration
│   └── tests/                   # Unit tests (pytest)
│       ├── test_skill_analyzer.py
│       └── test_models.py
└── frontend/                    # React 18 + Vite + Tailwind CSS frontend
    ├── src/
    │   ├── App.jsx              # Main application with tabbed navigation
    │   ├── api.js               # Centralised API client
    │   ├── index.css            # Tailwind base + component styles
    │   └── components/
    │       ├── RecruiterDashboard.jsx  # Candidate rankings, match scores, gap analysis
    │       ├── CandidateForm.jsx       # Candidate registration form
    │       └── JobOfferForm.jsx        # Job offer publication form
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy, PostgreSQL
- **NLP**: Sentence-Transformers (BERT `paraphrase-multilingual-MiniLM-L12-v2`), Scikit-Learn TF-IDF
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide-React
- **Validation**: Pydantic v2

## Matching Algorithm

The matching engine uses a two-stage pipeline:

1. **Semantic similarity** (70% weight): Sentence-Transformer cosine similarity between CV text and job description embeddings. Supports Italian and English.
2. **Lexical similarity** (30% weight): TF-IDF cosine similarity fitted on the Piedmont Regional Skills Taxonomy corpus.
3. **Gap analysis**: Keyword-level matching to identify matched versus missing skills.

## Setup

### Backend

```bash
cd backend
cp .env.example .env         # configure DATABASE_URL
pip install -r requirements.txt
uvicorn agency_api:app --reload --port 8000
# for me  python -m uvicorn agency_api:app --reload --port 8000
```

API documentation is available at `http://localhost:8000/docs`.

### Frontend

```bash 
cd frontend
npm install
npm run dev                  # development server at http://localhost:5173
```

### Testing

```bash
cd backend
pytest tests/ -v
```

## Features

- Candidate registration with CV text and declared skills
- Job offer publication with required skills from the Piedmont Taxonomy
- NLP-based semantic matching with composite scoring
- Recruiter Dashboard with ranked candidates, progress bars, and gap analysis
- PostgreSQL persistence with SQLAlchemy ORM
- Mobile-first responsive UI