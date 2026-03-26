"""
inRebus Agency - Recruitment Matching API.

FastAPI application exposing endpoints for:
  - Candidate registration and retrieval
  - Job offer publication and retrieval
  - NLP-based candidate-job matching (semantic + TF-IDF)
  - Ranked candidate shortlist for recruiters

Persistence is handled via SQLAlchemy with a PostgreSQL backend.
All schemas use Pydantic v2 models defined in models.py.
"""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from fastapi import Depends, FastAPI, HTTPException, Query, status, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from config import settings
from database import (
    CandidateORM,
    CandidateShortlistORM,
    JobOfferORM,
    MatchResultORM,
    create_all_tables,
    get_db,
    SessionLocal,
)
from models import (
    CandidateCreate,
    CandidateRead,
    JobOfferCreate,
    JobOfferRead,
    JobRankingResponse,
    MatchRequest,
    MatchResult,
    RankedCandidate,
    RankedJobOffer,
    CandidateRankingResponse,
)
from skill_analyzer import compute_match

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise resources on startup and clean up on shutdown."""
    logger.info("inRebus Agency API starting up.")
    # Ensure database tables exist (idempotent)
    create_all_tables()

    # Pre-warm the NLP models (will fallback to lexical if missing)
    try:
        from skill_analyzer import _get_transformer_model, _get_tfidf_vectorizer

        _get_transformer_model()
        _get_tfidf_vectorizer()
        logger.info("NLP models pre-warmed successfully.")
    except Exception:
        logger.warning("NLP model pre-warm failed; will initialise on first request.", exc_info=True)
    yield
    logger.info("inRebus Agency API shutting down.")


# ---------------------------------------------------------------------------
# FastAPI application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="inRebus Agency - Recruitment Matching API",
    description=(
        "REST API for matching industrial job candidates to job offers using "
        "the Piedmont Regional Skills Taxonomy and NLP-based semantic matching."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------


def _orm_to_candidate(candidate: CandidateORM) -> CandidateRead:
    return CandidateRead.model_validate(candidate)


def _orm_to_job_offer(offer: JobOfferORM) -> JobOfferRead:
    return JobOfferRead.model_validate(offer)


def _orm_to_match_result(match: MatchResultORM) -> MatchResult:
    return MatchResult.model_validate(match)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    """Return the API health status."""
    return {"status": "ok", "service": "inRebus Agency API"}


# ---------------------------------------------------------------------------
# Candidate endpoints
# ---------------------------------------------------------------------------


@app.post(
    "/candidates",
    response_model=CandidateRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Candidates"],
    summary="Register a new candidate",
)
def create_candidate(
    payload: CandidateCreate,
    db: Session = Depends(get_db),
) -> CandidateRead:
    """Register a new job candidate with CV text and declared/auto-extracted skills."""
    skills = payload.skills
    
    # Auto-extract skills if none provided using the local Piedmont Taxonomy
    if not skills:
        from skill_analyzer import _ALL_TAXONOMY_TERMS, _normalise
        norm_cv = _normalise(payload.cv_text)
        skills = [term for term in _ALL_TAXONOMY_TERMS if _normalise(term) in norm_cv]
        # Remove duplicates while preserving order
        skills = list(dict.fromkeys(skills))

    candidate = CandidateORM(
        id=str(uuid.uuid4()),
        full_name=payload.full_name,
        cv_text=payload.cv_text,
        skills=skills,
        created_at=datetime.now(timezone.utc),
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _orm_to_candidate(candidate)


@app.get(
    "/candidates",
    response_model=list[CandidateRead],
    tags=["Candidates"],
    summary="List all registered candidates",
)
def list_candidates(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[CandidateRead]:
    """Return a paginated list of all registered candidates."""
    candidates = db.query(CandidateORM).offset(skip).limit(limit).all()
    return [_orm_to_candidate(c) for c in candidates]


@app.get(
    "/candidates/{candidate_id}",
    response_model=CandidateRead,
    tags=["Candidates"],
    summary="Retrieve a candidate by ID",
)
def get_candidate(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> CandidateRead:
    """Return the details of a specific candidate."""
    candidate = db.query(CandidateORM).filter(CandidateORM.id == str(candidate_id)).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found.",
        )
    return _orm_to_candidate(candidate)


@app.delete(
    "/candidates/{candidate_id}",
    status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None,
    tags=["Candidates"],
    summary="Delete a candidate",
)
def delete_candidate(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    """Permanently remove a candidate record from the database."""
    candidate = db.query(CandidateORM).filter(CandidateORM.id == str(candidate_id)).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found.",
        )
    db.delete(candidate)
    db.commit()


# ---------------------------------------------------------------------------
# Job offer endpoints
# ---------------------------------------------------------------------------


@app.post(
    "/job-offers",
    response_model=JobOfferRead,
    status_code=status.HTTP_201_CREATED,
    tags=["Job Offers"],
    summary="Publish a new job offer",
)
def create_job_offer(
    payload: JobOfferCreate,
    db: Session = Depends(get_db),
) -> JobOfferRead:
    """Publish a new job offer with required skills from the Piedmont Taxonomy."""
    offer = JobOfferORM(
        id=str(uuid.uuid4()),
        title=payload.title,
        company=payload.company,
        description=payload.description,
        required_skills=payload.required_skills,
        created_at=datetime.now(timezone.utc),
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return _orm_to_job_offer(offer)


@app.get(
    "/job-offers",
    response_model=list[JobOfferRead],
    tags=["Job Offers"],
    summary="List all published job offers",
)
def list_job_offers(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[JobOfferRead]:
    """Return a paginated list of all published job offers."""
    offers = db.query(JobOfferORM).offset(skip).limit(limit).all()
    return [_orm_to_job_offer(o) for o in offers]


@app.get(
    "/job-offers/{job_offer_id}",
    response_model=JobOfferRead,
    tags=["Job Offers"],
    summary="Retrieve a job offer by ID",
)
def get_job_offer(
    job_offer_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> JobOfferRead:
    """Return the details of a specific job offer."""
    offer = db.query(JobOfferORM).filter(JobOfferORM.id == str(job_offer_id)).first()
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer {job_offer_id} not found.",
        )
    return _orm_to_job_offer(offer)


@app.delete(
    "/job-offers/{job_offer_id}",
    status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None,
    tags=["Job Offers"],
    summary="Delete a job offer",
)
def delete_job_offer(
    job_offer_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    """Permanently remove a job offer from the database."""
    offer = db.query(JobOfferORM).filter(JobOfferORM.id == str(job_offer_id)).first()
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer {job_offer_id} not found.",
        )
    db.delete(offer)
    db.commit()


# ---------------------------------------------------------------------------
# Matching endpoints
# ---------------------------------------------------------------------------


@app.post(
    "/matches",
    response_model=MatchResult,
    status_code=status.HTTP_201_CREATED,
    tags=["Matching"],
    summary="Compute a candidate-job match",
)
def compute_candidate_job_match(
    payload: MatchRequest,
    db: Session = Depends(get_db),
) -> MatchResult:
    """
    Compute the NLP-based match score between a candidate and a job offer.

    The result is persisted to the database and returned to the caller.
    If a match already exists, it is recomputed and the record updated.
    """
    candidate = (
        db.query(CandidateORM)
        .filter(CandidateORM.id == str(payload.candidate_id))
        .first()
    )
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {payload.candidate_id} not found.",
        )

    offer = (
        db.query(JobOfferORM).filter(JobOfferORM.id == str(payload.job_offer_id)).first()
    )
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer {payload.job_offer_id} not found.",
        )

    result = compute_match(
        cv_text=candidate.cv_text,
        job_description=offer.description,
        required_skills=offer.required_skills,
    )

    # Upsert logic: remove previous result for this pair if it exists
    existing = (
        db.query(MatchResultORM)
        .filter(
            MatchResultORM.candidate_id == str(payload.candidate_id),
            MatchResultORM.job_offer_id == str(payload.job_offer_id),
        )
        .first()
    )
    if existing is not None:
        db.delete(existing)
        db.flush()

    match_orm = MatchResultORM(
        id=str(uuid.uuid4()),
        candidate_id=str(payload.candidate_id),
        job_offer_id=str(payload.job_offer_id),
        score=result["score"],
        matched_skills=result["matched_skills"],
        gap_skills=result["gap_skills"],
        computed_at=datetime.now(timezone.utc),
    )
    db.add(match_orm)
    db.commit()
    db.refresh(match_orm)
    return _orm_to_match_result(match_orm)


@app.get(
    "/job-offers/{job_offer_id}/rankings",
    response_model=JobRankingResponse,
    tags=["Matching"],
    summary="Rank all candidates for a job offer",
)
def rank_candidates_for_job(
    job_offer_id: uuid.UUID,
    top_n: int = Query(default=10, ge=1, le=100, description="Number of top candidates to return."),
    db: Session = Depends(get_db),
) -> JobRankingResponse:
    """
    Compute and rank all candidates for a specific job offer.

    Matches are computed on-the-fly for each candidate and the top N results
    are returned sorted by descending match score.
    """
    offer = db.query(JobOfferORM).filter(JobOfferORM.id == str(job_offer_id)).first()
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer {job_offer_id} not found.",
        )

    candidates = db.query(CandidateORM).all()

    ranked: list[RankedCandidate] = []
    for candidate in candidates:
        result = compute_match(
            cv_text=candidate.cv_text,
            job_description=offer.description,
            required_skills=offer.required_skills,
        )
        ranked.append(
            RankedCandidate(
                candidate=_orm_to_candidate(candidate),
                score=result["score"],
                matched_skills=result["matched_skills"],
                gap_skills=result["gap_skills"],
                semantic_score=result.get("semantic_score", 0.0),
                tfidf_score=result.get("tfidf_score", 0.0),
            )
        )

    ranked.sort(key=lambda r: r.score, reverse=True)

    return JobRankingResponse(
        job_offer=_orm_to_job_offer(offer),
        rankings=ranked[:top_n],
    )


@app.patch(
    "/job-offers/{job_offer_id}/toggle-active",
    response_model=JobOfferRead,
    tags=["Job Offers"],
    summary="Toggle the active state of a job offer",
)
def toggle_job_offer_active(
    job_offer_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> JobOfferRead:
    """Toggle the is_active flag on a job offer (active ↔ archived)."""
    offer = db.query(JobOfferORM).filter(JobOfferORM.id == str(job_offer_id)).first()
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer {job_offer_id} not found.",
        )
    offer.is_active = not offer.is_active
    db.commit()
    db.refresh(offer)
    return _orm_to_job_offer(offer)


@app.get(
    "/candidates/{candidate_id}/matches",
    response_model=list[MatchResult],
    tags=["Matching"],
    summary="Retrieve all stored matches for a candidate",
)
def get_candidate_matches(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[MatchResult]:
    """Return all previously computed and stored match results for a candidate."""
    candidate = db.query(CandidateORM).filter(CandidateORM.id == str(candidate_id)).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found.",
        )

    matches = (
        db.query(MatchResultORM)
        .filter(MatchResultORM.candidate_id == str(candidate_id))
        .order_by(MatchResultORM.score.desc())
        .all()
    )
    return [_orm_to_match_result(m) for m in matches]


@app.get(
    "/candidates/{candidate_id}/rankings",
    response_model=CandidateRankingResponse,
    tags=["Matching"],
    summary="Rank all active job offers for a candidate",
)
def rank_job_offers_for_candidate(
    candidate_id: uuid.UUID,
    top_n: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> CandidateRankingResponse:
    """Reverse matching: find the best active job offers for a given candidate."""
    candidate = db.query(CandidateORM).filter(CandidateORM.id == str(candidate_id)).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found.",
        )

    offers = db.query(JobOfferORM).filter(JobOfferORM.is_active == True).all()

    ranked: list[RankedJobOffer] = []
    for offer in offers:
        result = compute_match(
            cv_text=candidate.cv_text,
            job_description=offer.description,
            required_skills=offer.required_skills,
        )
        ranked.append(
            RankedJobOffer(
                job_offer=_orm_to_job_offer(offer),
                score=result["score"],
                matched_skills=result["matched_skills"],
                gap_skills=result["gap_skills"],
                semantic_score=result.get("semantic_score", 0.0),
                tfidf_score=result.get("tfidf_score", 0.0),
            )
        )

    ranked.sort(key=lambda r: r.score, reverse=True)

    return CandidateRankingResponse(
        candidate=_orm_to_candidate(candidate),
        rankings=ranked[:top_n],
    )


# ---------------------------------------------------------------------------
# Shortlist endpoints
@app.post(
    "/shortlist/{candidate_id}/toggle",
    status_code=status.HTTP_200_OK,
    tags=["Shortlist"],
    summary="Toggle a candidate in the recruiter's shortlist",
)
def toggle_candidate_shortlist(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    """Add or remove a candidate from the persistent shortlist."""
    candidate = db.query(CandidateORM).filter(CandidateORM.id == str(candidate_id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    existing = db.query(CandidateShortlistORM).filter(CandidateShortlistORM.candidate_id == str(candidate_id)).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"saved": False}
    else:
        new_shortlist = CandidateShortlistORM(id=str(uuid.uuid4()), candidate_id=str(candidate_id))
        db.add(new_shortlist)
        db.commit()
        return {"saved": True}


@app.get(
    "/shortlist",
    response_model=list[uuid.UUID],
    tags=["Shortlist"],
    summary="Get all shortlisted candidate IDs",
)
def get_shortlist(db: Session = Depends(get_db)) -> list[uuid.UUID]:
    rows = db.query(CandidateShortlistORM.candidate_id).all()
    return [row[0] for row in rows]


# ---------------------------------------------------------------------------
# Demo seed endpoint - populates realistic sample data for demonstrations
# ---------------------------------------------------------------------------

_DEMO_CANDIDATES = [
    {
        "full_name": "Marco Bianchi",
        "cv_text": "Sviluppatore software con 6 anni di esperienza in Python e sviluppo backend. Ho lavorato con FastAPI, Django, PostgreSQL e Docker. Esperto in machine learning e analisi dei dati con scikit-learn e pandas. Ho conseguito la laurea in Informatica presso il Politecnico di Torino.",
        "skills": ["python", "fastapi", "postgresql", "docker", "machine learning", "sql", "git"],
    },
    {
        "full_name": "Giulia Ferretti",
        "cv_text": "Operatrice CNC con 8 anni di esperienza in ambiente manifatturiero. Specializzata in tornitura e fresatura CNC su macchine Fanuc e Siemens. Certificata per il controllo qualità e metrologia. Esperienza nel settore automotive e aeronautico.",
        "skills": ["tornitura cnc", "fresatura cnc", "fanuc", "siemens", "metrologia", "controllo qualita"],
    },
    {
        "full_name": "Andrea Conti",
        "cv_text": "Tecnico di automazione industriale con competenze in programmazione PLC Siemens S7 e Allen Bradley. Esperienza con sistemi SCADA, HMI e robotica collaborativa. Ho partecipato a progetti di Industria 4.0 in stabilimenti produttivi del nord Italia.",
        "skills": ["programmazione plc", "siemens", "scada", "hmi", "robotica industriale", "industria 4.0"],
    },
    {
        "full_name": "Valentina Russo",
        "cv_text": "Responsabile logistica con 5 anni di esperienza nella gestione magazzino e supply chain. Utilizzo sistemi WMS e SAP per la gestione delle scorte. Formata in metodologie Lean Manufacturing e Kanban. Ottima capacità di problem solving e leadership.",
        "skills": ["gestione magazzino", "wms", "sap", "lean manufacturing", "kanban", "supply chain", "leadership"],
    },
    {
        "full_name": "Luca Marino",
        "cv_text": "Sviluppatore full-stack con 4 anni di esperienza in React, TypeScript e Node.js. Familiarità con Docker, Kubernetes e pipeline CI/CD con GitHub Actions. Ho lavorato su piattaforme SaaS B2B nel settore HR e fintech.",
        "skills": ["javascript", "typescript", "react", "docker", "kubernetes", "git", "sql"],
    },
]

_DEMO_OFFERS = [
    {
        "title": "Sviluppatore Backend Python",
        "company": "TechNord S.r.l.",
        "description": "Cerchiamo uno sviluppatore Python esperto per potenziare il nostro team backend. Il candidato lavorerà con FastAPI, PostgreSQL e sistemi cloud. Gradita esperienza con machine learning e analisi dati.",
        "required_skills": ["python", "fastapi", "postgresql", "docker", "sql"],
        "is_active": True,
    },
    {
        "title": "Operatore CNC Senior",
        "company": "Metalmeccanica Rossi S.p.A.",
        "description": "Ricerchiamo operatore CNC con esperienza su torni e frese Fanuc. Il candidato dovrà gestire il controllo qualità dei pezzi lavorati e collaborare con l'ufficio tecnico per ottimizzare i cicli di lavorazione.",
        "required_skills": ["tornitura cnc", "fresatura cnc", "fanuc", "metrologia", "controllo qualita"],
        "is_active": True,
    },
    {
        "title": "Tecnico Automazione PLC",
        "company": "Automazioni Piemonte S.r.l.",
        "description": "Selezioniamo tecnico specializzato in programmazione PLC Siemens per progetti di automazione industriale. Richiesta esperienza con SCADA e HMI. Conoscenza di Industria 4.0 è un plus.",
        "required_skills": ["programmazione plc", "siemens", "scada", "hmi", "industria 4.0"],
        "is_active": True,
    },
]


@app.post(
    "/demo/seed",
    status_code=status.HTTP_201_CREATED,
    tags=["Demo"],
    summary="Seed the database with realistic Italian demo data",
)
def seed_demo_data(db: Session = Depends(get_db)) -> dict[str, int]:
    """Populate the database with realistic demo candidates and job offers.
    
    Safe to call multiple times — skips entries that already exist by name.
    """
    from skill_analyzer import _ALL_TAXONOMY_TERMS, _normalise  # noqa: PLC0415
    
    candidates_created = 0
    for demo in _DEMO_CANDIDATES:
        existing = db.query(CandidateORM).filter(CandidateORM.full_name == demo["full_name"]).first()
        if existing:
            continue
        
        base_skills: list[str] = list(demo["skills"])
        norm_cv = _normalise(demo["cv_text"])
        # Auto-extract extra taxonomy terms found in the CV text
        extra = [t for t in _ALL_TAXONOMY_TERMS if _normalise(t) in norm_cv and t not in base_skills]
        all_skills = list(dict.fromkeys(base_skills + extra))
        
        db.add(CandidateORM(
            id=str(uuid.uuid4()),
            full_name=demo["full_name"],
            cv_text=demo["cv_text"],
            skills=all_skills,
            created_at=datetime.now(timezone.utc),
        ))
        candidates_created += 1

    offers_created = 0
    for demo in _DEMO_OFFERS:
        existing = db.query(JobOfferORM).filter(JobOfferORM.title == demo["title"]).first()
        if existing:
            continue
        db.add(JobOfferORM(
            id=str(uuid.uuid4()),
            title=demo["title"],
            company=demo["company"],
            description=demo["description"],
            required_skills=list(demo["required_skills"]),
            is_active=bool(demo["is_active"]),
            created_at=datetime.now(timezone.utc),
        ))
        offers_created += 1

    db.commit()
    logger.info("Demo seed: %d candidates, %d offers created.", candidates_created, offers_created)
    return {"candidates_created": candidates_created, "offers_created": offers_created}
