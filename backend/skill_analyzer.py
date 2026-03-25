"""
NLP-based skill matching engine for the inRebus Agency platform.

Robust Version: Handles missing sentence-transformers or scikit-learn gracefully.
"""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Final

import numpy as np

# Try to import heavy dependencies, fallback to None if missing
try:
    from sentence_transformers import SentenceTransformer
    HAS_SEMANTIC = True
except ImportError:
    HAS_SEMANTIC = False
    class SentenceTransformer: pass # Dummy

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_TFIDF = True
except ImportError:
    HAS_TFIDF = False
    class TfidfVectorizer: pass # Dummy

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Piedmont Regional Skills Taxonomy
# ---------------------------------------------------------------------------

PIEDMONT_TAXONOMY: Final[dict[str, list[str]]] = {
    "manifattura_avanzata": [
        "tornitura cnc", "fresatura cnc", "programmazione fanuc", "programmazione heidenhain",
        "controllo qualita", "metrologia", "disegno tecnico", "lettura tavola tecnica",
        "saldatura mig", "saldatura tig", "saldatura a filo", "lamiera", "piegatura",
        "stampaggio", "pressofusione", "trattamenti termici", "taglio laser", 
        "taglio plasma", "elettroerosione", "montaggio meccanico", "assemblaggio"
    ],
    "automazione_industriale": [
        "programmazione plc", "siemens s7", "allen bradley", "omron", "scada", "hmi",
        "elettrotecnica", "pneumatica", "oleodinamica", "robotica industriale", "cobot",
        "fanuc robot", "kuka", "comau", "manutenzione predittiva", "industria 4.0", "iot industriale"
    ],
    "logistica_supply_chain": [
        "gestione magazzino", "wms", "erp", "sap mm", "sap wm", "picking", "packing",
        "spedizioni internazionali", "incoterms", "dogana", "lean manufacturing", 
        "kanban", "kaizen", "5s", "supply chain management"
    ],
    "informatica_ict": [
        "python", "java", "javascript", "typescript", "sql", "postgresql", "mysql",
        "mongodb", "rest api", "fastapi", "django", "react", "angular", "vue",
        "docker", "kubernetes", "ci/cd", "git", "machine learning", "data analysis",
        "power bi", "excel avanzato"
    ],
    "costruzioni_impiantistica": [
        "autocad", "revit", "bim", "progettazione impianti", "impianti elettrici",
        "impianti idraulici", "impianti hvac", "sicurezza cantiere", "d.lgs 81/08",
        "rspp", "aspp", "coordinatore sicurezza", "computo metrico", "capitolato",
        "direzione lavori"
    ],
    "soft_skills": [
        "problem solving", "team working", "comunicazione", "leadership", 
        "gestione del tempo", "flessibilita", "adattabilita", "attenzione al dettaglio",
        "lavoro autonomo", "gestione stress"
    ],
    "lingue": [ "inglese b2", "inglese c1", "francese", "tedesco", "spagnolo" ]
}

_ALL_TAXONOMY_TERMS: Final[list[str]] = [
    term for terms in PIEDMONT_TAXONOMY.values() for term in terms
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _get_transformer_model():
    if not HAS_SEMANTIC:
        return None
    try:
        model = SentenceTransformer(settings.sentence_transformer_model)
        return model
    except Exception as e:
        logger.warning(f"Could not load semantic model: {e}")
        return None

@lru_cache(maxsize=1)
def _get_tfidf_vectorizer():
    if not HAS_TFIDF:
        return None
    vectorizer = TfidfVectorizer(
        analyzer="word", ngram_range=(1, 2), lowercase=True, strip_accents="unicode"
    )
    corpus = [" ".join(_ALL_TAXONOMY_TERMS)] + _ALL_TAXONOMY_TERMS
    vectorizer.fit(corpus)
    return vectorizer

_NORMALISE_RE = re.compile(r"[^a-z0-9\s/]")

def _normalise(text: str) -> str:
    text = text.lower().strip()
    text = _NORMALISE_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text)

# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def compute_semantic_score(cv_text: str, job_text: str) -> float:
    model = _get_transformer_model()
    if model is None:
        return 0.0
    try:
        embeddings = model.encode([cv_text, job_text], convert_to_numpy=True, normalize_embeddings=True)
        return max(0.0, min(1.0, float(np.dot(embeddings[0], embeddings[1]))))
    except Exception:
        return 0.0

def compute_tfidf_score(cv_text: str, job_text: str) -> float:
    vectorizer = _get_tfidf_vectorizer()
    if vectorizer is None or not HAS_TFIDF:
        # Emergency fallback: basic Jaccard-like word overlap
        s1 = set(_normalise(cv_text).split())
        s2 = set(_normalise(job_text).split())
        if not s2: return 0.0
        return len(s1 & s2) / len(s2)
    try:
        tfidf_matrix = vectorizer.transform([_normalise(cv_text), _normalise(job_text)])
        score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        return max(0.0, min(1.0, score))
    except Exception:
        return 0.0

def analyse_skill_gap(cv_text: str, required_skills: list[str]) -> tuple[list[str], list[str]]:
    norm_cv = _normalise(cv_text)
    matched = [s for s in required_skills if _normalise(s) in norm_cv]
    gap = [s for s in required_skills if s not in matched]
    return matched, gap

def compute_match(cv_text: str, job_description: str, required_skills: list[str], 
                  semantic_weight: float = 0.7, tfidf_weight: float = 0.3) -> dict[str, object]:
    job_text = f"{job_description} {' '.join(required_skills)}"
    
    sem_score = compute_semantic_score(cv_text, job_text)
    tfi_score = compute_tfidf_score(cv_text, job_text)
    
    # If semantic failed, boost TF-IDF or use it directly
    if not HAS_SEMANTIC or sem_score == 0:
        composite = tfi_score
    else:
        composite = (semantic_weight * sem_score + tfidf_weight * tfi_score)
    
    matched_skills, gap_skills = analyse_skill_gap(cv_text, required_skills)
    
    # Heuristic boost for matched skills to make the demo feel responsive
    if len(required_skills) > 0:
        matched_ratio = len(matched_skills) / len(required_skills)
        composite = (composite + matched_ratio) / 2

    return {
        "score": round(max(0.0, min(1.0, composite)), 4),
        "semantic_score": round(float(sem_score), 4),
        "tfidf_score": round(float(tfi_score), 4),
        "matched_skills": matched_skills,
        "gap_skills": gap_skills,
    }
