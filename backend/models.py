"""
Pydantic v2 models for the inRebus Agency API.

All request/response contracts are defined here using strict type hints
in compliance with the inRebus coding standards.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Candidate models
# ---------------------------------------------------------------------------


class CandidateCreate(BaseModel):
    """Payload required to register a new candidate."""

    full_name: str = Field(..., min_length=2, max_length=200, examples=["Mario Rossi"])
    cv_text: str = Field(
        ...,
        min_length=10,
        description="Full text of the candidate curriculum vitae.",
    )
    skills: list[str] = Field(
        default_factory=list,
        description="Explicit skills declared by the candidate.",
    )


class CandidateRead(CandidateCreate):
    """Candidate representation returned by the API."""

    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Job offer models
# ---------------------------------------------------------------------------


class JobOfferCreate(BaseModel):
    """Payload required to publish a new job offer."""

    title: str = Field(
        ..., min_length=2, max_length=300, examples=["Operatore CNC Senior"]
    )
    company: str = Field(..., min_length=2, max_length=200, examples=["FIAT SpA"])
    description: str = Field(
        ...,
        min_length=10,
        description="Full textual description of the job offer.",
    )
    required_skills: list[str] = Field(
        ...,
        min_length=1,
        description="List of required skills according to the Piedmont Taxonomy.",
    )


class JobOfferRead(JobOfferCreate):
    """Job offer representation returned by the API."""

    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Matching models
# ---------------------------------------------------------------------------


class MatchRequest(BaseModel):
    """Request payload to compute a match between a candidate and a job offer."""

    candidate_id: UUID
    job_offer_id: UUID


class MatchResult(BaseModel):
    """Result of the NLP-based matching computation."""

    candidate_id: UUID
    job_offer_id: UUID
    score: float = Field(..., ge=0.0, le=1.0, description="Cosine similarity score.")
    matched_skills: list[str] = Field(
        default_factory=list,
        description="Skills present in both CV and job requirements.",
    )
    gap_skills: list[str] = Field(
        default_factory=list,
        description="Required skills absent from the candidate profile.",
    )
    computed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RankedCandidate(BaseModel):
    """A candidate ranked by match score for a given job offer."""

    candidate: CandidateRead
    score: float = Field(..., ge=0.0, le=1.0)
    matched_skills: list[str]
    gap_skills: list[str]


class JobRankingResponse(BaseModel):
    """Ranked list of candidates for a specific job offer."""

    job_offer: JobOfferRead
    rankings: list[RankedCandidate]
