"""
NLP-based skill matching engine for the inRebus Agency platform.

Implements a two-stage matching pipeline:
  1. Semantic similarity: Sentence-Transformers (BERT-based) cosine similarity
     between the candidate CV text and the job offer description / required skills.
  2. Lexical gap analysis: normalised keyword comparison using the
     Piedmont Regional Skills Taxonomy to identify matched and missing skills.

The transformer model is initialised once at module import time to avoid
per-request overhead (see PERFORMANCE requirement in coding standards).
"""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Final

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Piedmont Regional Skills Taxonomy (Tassonomia Regionale Piemontese)
# Partial reference corpus used for lexical normalisation and gap analysis.
# ---------------------------------------------------------------------------

PIEDMONT_TAXONOMY: Final[dict[str, list[str]]] = {
    "manifattura_avanzata": [
        "tornitura cnc",
        "fresatura cnc",
        "programmazione fanuc",
        "programmazione heidenhain",
        "controllo qualita",
        "metrologia",
        "disegno tecnico",
        "lettura tavola tecnica",
        "saldatura mig",
        "saldatura tig",
        "saldatura a filo",
        "lamiera",
        "piegatura",
        "stampaggio",
        "pressofusione",
        "trattamenti termici",
        "taglio laser",
        "taglio plasma",
        "elettroerosione",
        "montaggio meccanico",
        "assemblaggio",
    ],
    "automazione_industriale": [
        "programmazione plc",
        "siemens s7",
        "allen bradley",
        "omron",
        "scada",
        "hmi",
        "elettrotecnica",
        "pneumatica",
        "oleodinamica",
        "robotica industriale",
        "cobot",
        "fanuc robot",
        "kuka",
        "comau",
        "manutenzione predittiva",
        "industria 4.0",
        "iot industriale",
    ],
    "logistica_supply_chain": [
        "gestione magazzino",
        "wms",
        "erp",
        "sap mm",
        "sap wm",
        "picking",
        "packing",
        "spedizioni internazionali",
        "incoterms",
        "dogana",
        "lean manufacturing",
        "kanban",
        "kaizen",
        "5s",
        "supply chain management",
    ],
    "informatica_ict": [
        "python",
        "java",
        "javascript",
        "typescript",
        "c++",
        "c#",
        "sql",
        "postgresql",
        "mysql",
        "mongodb",
        "rest api",
        "fastapi",
        "django",
        "react",
        "angular",
        "vue",
        "docker",
        "kubernetes",
        "ci/cd",
        "git",
        "machine learning",
        "data analysis",
        "power bi",
        "excel avanzato",
    ],
    "costruzioni_impiantistica": [
        "autocad",
        "revit",
        "bim",
        "progettazione impianti",
        "impianti elettrici",
        "impianti idraulici",
        "impianti hvac",
        "sicurezza cantiere",
        "d.lgs 81/08",
        "rspp",
        "aspp",
        "coordinatore sicurezza",
        "computo metrico",
        "capitolato",
        "direzione lavori",
    ],
    "soft_skills": [
        "problem solving",
        "team working",
        "comunicazione",
        "leadership",
        "gestione del tempo",
        "flessibilita",
        "adattabilita",
        "attenzione al dettaglio",
        "lavoro autonomo",
        "gestione stress",
    ],
    "lingue": [
        "inglese b2",
        "inglese c1",
        "francese",
        "tedesco",
        "spagnolo",
        "lingua inglese",
        "lingua francese",
        "lingua tedesca",
    ],
}

# Flat list of all taxonomy terms for efficient lookup
_ALL_TAXONOMY_TERMS: Final[list[str]] = [
    term for terms in PIEDMONT_TAXONOMY.values() for term in terms
]


# ---------------------------------------------------------------------------
# Global model initialisation (performance requirement)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _get_transformer_model() -> SentenceTransformer:
    """Return the globally initialised Sentence-Transformer model."""
    logger.info(
        "Loading Sentence-Transformer model: %s", settings.sentence_transformer_model
    )
    model = SentenceTransformer(settings.sentence_transformer_model)
    logger.info("Sentence-Transformer model loaded successfully.")
    return model


@lru_cache(maxsize=1)
def _get_tfidf_vectorizer() -> TfidfVectorizer:
    """Return a TF-IDF vectorizer pre-fitted on the Piedmont taxonomy corpus."""
    vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        lowercase=True,
        strip_accents="unicode",
    )
    corpus = [" ".join(_ALL_TAXONOMY_TERMS)] + _ALL_TAXONOMY_TERMS
    vectorizer.fit(corpus)
    return vectorizer


# ---------------------------------------------------------------------------
# Text normalisation helpers
# ---------------------------------------------------------------------------

_NORMALISE_RE = re.compile(r"[^a-z0-9\s/]")


def _normalise(text: str) -> str:
    """Lower-case, strip punctuation and collapse whitespace."""
    text = text.lower().strip()
    text = _NORMALISE_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text)


# ---------------------------------------------------------------------------
# Core matching functions
# ---------------------------------------------------------------------------


def compute_semantic_score(cv_text: str, job_text: str) -> float:
    """
    Compute the cosine similarity between CV and job description embeddings.

    Uses a multilingual BERT-based Sentence-Transformer model to capture
    semantic equivalences beyond exact keyword matches.

    Parameters
    ----------
    cv_text:
        Full text of the candidate curriculum vitae.
    job_text:
        Concatenation of the job offer description and required skills.

    Returns
    -------
    float
        Cosine similarity in [0.0, 1.0].
    """
    model = _get_transformer_model()
    embeddings = model.encode(
        [cv_text, job_text], convert_to_numpy=True, normalize_embeddings=True
    )
    score: float = float(np.dot(embeddings[0], embeddings[1]))
    # Clamp to [0, 1] to avoid floating-point artefacts
    return max(0.0, min(1.0, score))


def compute_tfidf_score(cv_text: str, job_text: str) -> float:
    """
    Compute TF-IDF cosine similarity as a fallback / complementary signal.

    Parameters
    ----------
    cv_text:
        Full text of the candidate curriculum vitae.
    job_text:
        Concatenation of the job offer description and required skills.

    Returns
    -------
    float
        Cosine similarity in [0.0, 1.0].
    """
    vectorizer = _get_tfidf_vectorizer()
    try:
        tfidf_matrix = vectorizer.transform([_normalise(cv_text), _normalise(job_text)])
        score = float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        return max(0.0, min(1.0, score))
    except Exception:
        logger.warning("TF-IDF scoring failed; returning 0.0", exc_info=True)
        return 0.0


def analyse_skill_gap(
    cv_text: str,
    required_skills: list[str],
) -> tuple[list[str], list[str]]:
    """
    Identify matched and missing skills from the required skill list.

    A required skill is considered matched when its normalised form appears
    as a substring within the normalised CV text.

    Parameters
    ----------
    cv_text:
        Full text of the candidate curriculum vitae.
    required_skills:
        List of skills required by the job offer.

    Returns
    -------
    tuple[list[str], list[str]]
        A pair (matched_skills, gap_skills).
    """
    normalised_cv = _normalise(cv_text)
    matched: list[str] = []
    gap: list[str] = []

    for skill in required_skills:
        if _normalise(skill) in normalised_cv:
            matched.append(skill)
        else:
            gap.append(skill)

    return matched, gap


def compute_match(
    cv_text: str,
    job_description: str,
    required_skills: list[str],
    semantic_weight: float = 0.7,
    tfidf_weight: float = 0.3,
) -> dict[str, object]:
    """
    Compute a composite match score and perform gap analysis.

    The composite score is a weighted combination of:
      - Semantic score  (Sentence-Transformer cosine similarity)
      - TF-IDF score    (lexical cosine similarity)

    Parameters
    ----------
    cv_text:
        Full text of the candidate curriculum vitae.
    job_description:
        Full description of the job offer.
    required_skills:
        Skills required by the job offer.
    semantic_weight:
        Weight assigned to the semantic score (default 0.7).
    tfidf_weight:
        Weight assigned to the TF-IDF score (default 0.3).

    Returns
    -------
    dict
        Keys: ``score``, ``matched_skills``, ``gap_skills``.
    """
    job_text = f"{job_description} {' '.join(required_skills)}"

    semantic_score = compute_semantic_score(cv_text, job_text)
    tfidf_score = compute_tfidf_score(cv_text, job_text)

    composite = (
        semantic_weight * semantic_score + tfidf_weight * tfidf_score
    )
    composite = max(0.0, min(1.0, composite))

    matched_skills, gap_skills = analyse_skill_gap(cv_text, required_skills)

    return {
        "score": round(composite, 4),
        "matched_skills": matched_skills,
        "gap_skills": gap_skills,
    }
