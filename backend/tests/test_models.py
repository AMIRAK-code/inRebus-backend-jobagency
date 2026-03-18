"""
Unit tests for the Pydantic v2 models defined in models.py.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from models import (
    CandidateCreate,
    CandidateRead,
    JobOfferCreate,
    JobOfferRead,
    MatchRequest,
    MatchResult,
    RankedCandidate,
)


# ---------------------------------------------------------------------------
# CandidateCreate
# ---------------------------------------------------------------------------


def test_candidate_create_valid():
    c = CandidateCreate(
        full_name="Mario Rossi",
        cv_text="Experienced python developer with 5 years of experience.",
        skills=["python", "sql"],
    )
    assert c.full_name == "Mario Rossi"
    assert c.skills == ["python", "sql"]


def test_candidate_create_default_skills():
    c = CandidateCreate(
        full_name="Lucia Bianchi",
        cv_text="Administrative professional with strong organisational skills.",
    )
    assert c.skills == []


def test_candidate_create_invalid_short_name():
    with pytest.raises(ValidationError):
        CandidateCreate(full_name="A", cv_text="Some longer cv text here for testing.")


def test_candidate_create_invalid_short_cv():
    with pytest.raises(ValidationError):
        CandidateCreate(full_name="Mario Rossi", cv_text="Short")


# ---------------------------------------------------------------------------
# JobOfferCreate
# ---------------------------------------------------------------------------


def test_job_offer_create_valid():
    offer = JobOfferCreate(
        title="Operatore CNC",
        company="Acme SpA",
        description="We are looking for a skilled CNC operator with Fanuc experience.",
        required_skills=["tornitura cnc", "programmazione fanuc"],
    )
    assert offer.title == "Operatore CNC"
    assert len(offer.required_skills) == 2


def test_job_offer_create_empty_skills_invalid():
    with pytest.raises(ValidationError):
        JobOfferCreate(
            title="Operatore CNC",
            company="Acme SpA",
            description="Long enough description for this test case.",
            required_skills=[],
        )


def test_job_offer_create_short_title_invalid():
    with pytest.raises(ValidationError):
        JobOfferCreate(
            title="A",
            company="Acme SpA",
            description="Long enough description for this test case.",
            required_skills=["python"],
        )


# ---------------------------------------------------------------------------
# MatchResult
# ---------------------------------------------------------------------------


def test_match_result_valid():
    cid = uuid.uuid4()
    jid = uuid.uuid4()
    now = datetime.now(timezone.utc)
    result = MatchResult(
        candidate_id=cid,
        job_offer_id=jid,
        score=0.75,
        matched_skills=["python", "sql"],
        gap_skills=["docker"],
        computed_at=now,
    )
    assert result.score == 0.75
    assert "python" in result.matched_skills


def test_match_result_score_out_of_bounds():
    with pytest.raises(ValidationError):
        MatchResult(
            candidate_id=uuid.uuid4(),
            job_offer_id=uuid.uuid4(),
            score=1.5,
            matched_skills=[],
            gap_skills=[],
            computed_at=datetime.now(timezone.utc),
        )


def test_match_result_score_negative_invalid():
    with pytest.raises(ValidationError):
        MatchResult(
            candidate_id=uuid.uuid4(),
            job_offer_id=uuid.uuid4(),
            score=-0.1,
            matched_skills=[],
            gap_skills=[],
            computed_at=datetime.now(timezone.utc),
        )


# ---------------------------------------------------------------------------
# MatchRequest
# ---------------------------------------------------------------------------


def test_match_request_valid():
    req = MatchRequest(candidate_id=uuid.uuid4(), job_offer_id=uuid.uuid4())
    assert isinstance(req.candidate_id, uuid.UUID)


def test_match_request_invalid_uuid():
    with pytest.raises(ValidationError):
        MatchRequest(candidate_id="not-a-uuid", job_offer_id=uuid.uuid4())
