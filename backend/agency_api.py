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

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import (
    CandidateORM,
    JobOfferORM,
    MatchResultORM,
    create_all_tables,
    get_db,
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
    # Pre-warm the NLP model to avoid cold-start latency on first request
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
    """Register a new job candidate with CV text and declared skills."""
    candidate = CandidateORM(
        id=uuid.uuid4(),
        full_name=payload.full_name,
        cv_text=payload.cv_text,
        skills=payload.skills,
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
    candidate = db.query(CandidateORM).filter(CandidateORM.id == candidate_id).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found.",
        )
    return _orm_to_candidate(candidate)


@app.delete(
    "/candidates/{candidate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Candidates"],
    summary="Delete a candidate",
)
def delete_candidate(
    candidate_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    """Permanently remove a candidate record from the database."""
    candidate = db.query(CandidateORM).filter(CandidateORM.id == candidate_id).first()
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
        id=uuid.uuid4(),
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
    offer = db.query(JobOfferORM).filter(JobOfferORM.id == job_offer_id).first()
    if offer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job offer {job_offer_id} not found.",
        )
    return _orm_to_job_offer(offer)


@app.delete(
    "/job-offers/{job_offer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Job Offers"],
    summary="Delete a job offer",
)
def delete_job_offer(
    job_offer_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> None:
    """Permanently remove a job offer from the database."""
    offer = db.query(JobOfferORM).filter(JobOfferORM.id == job_offer_id).first()
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
        .filter(CandidateORM.id == payload.candidate_id)
        .first()
    )
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {payload.candidate_id} not found.",
        )

    offer = (
        db.query(JobOfferORM).filter(JobOfferORM.id == payload.job_offer_id).first()
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
            MatchResultORM.candidate_id == payload.candidate_id,
            MatchResultORM.job_offer_id == payload.job_offer_id,
        )
        .first()
    )
    if existing is not None:
        db.delete(existing)
        db.flush()

    match_orm = MatchResultORM(
        id=uuid.uuid4(),
        candidate_id=payload.candidate_id,
        job_offer_id=payload.job_offer_id,
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
    offer = db.query(JobOfferORM).filter(JobOfferORM.id == job_offer_id).first()
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
            )
        )

    ranked.sort(key=lambda r: r.score, reverse=True)

    return JobRankingResponse(
        job_offer=_orm_to_job_offer(offer),
        rankings=ranked[:top_n],
    )


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
    candidate = db.query(CandidateORM).filter(CandidateORM.id == candidate_id).first()
    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate {candidate_id} not found.",
        )

    matches = (
        db.query(MatchResultORM)
        .filter(MatchResultORM.candidate_id == candidate_id)
        .order_by(MatchResultORM.score.desc())
        .all()
    )
    return [_orm_to_match_result(m) for m in matches]
