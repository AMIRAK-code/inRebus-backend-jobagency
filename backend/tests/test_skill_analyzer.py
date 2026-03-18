"""
Unit tests for skill_analyzer.py.

These tests do not require a running database or NLP model download.
The Sentence-Transformer model is mocked to avoid network calls in CI.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def mock_transformer_model():
    """Replace the Sentence-Transformer model with a deterministic stub."""
    mock_model = MagicMock()

    def fake_encode(texts, **kwargs):
        rng = np.random.default_rng(sum(len(t) for t in texts))
        vecs = rng.random((len(texts), 128)).astype(np.float32)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        return vecs / norms

    mock_model.encode.side_effect = fake_encode

    with patch("skill_analyzer._get_transformer_model", return_value=mock_model):
        from skill_analyzer import _get_transformer_model
        _get_transformer_model.cache_clear()
        yield mock_model
        _get_transformer_model.cache_clear()


# ---------------------------------------------------------------------------
# Tests for _normalise
# ---------------------------------------------------------------------------


def test_normalise_lowercases():
    from skill_analyzer import _normalise

    assert _normalise("Python") == "python"


def test_normalise_strips_punctuation():
    from skill_analyzer import _normalise

    assert "!" not in _normalise("hello!")


def test_normalise_collapses_whitespace():
    from skill_analyzer import _normalise

    assert _normalise("  hello   world  ") == "hello world"


# ---------------------------------------------------------------------------
# Tests for analyse_skill_gap
# ---------------------------------------------------------------------------


def test_analyse_skill_gap_all_matched():
    from skill_analyzer import analyse_skill_gap

    cv = "Experienced in python sql docker machine learning"
    skills = ["python", "sql", "docker"]
    matched, gap = analyse_skill_gap(cv, skills)
    assert set(matched) == {"python", "sql", "docker"}
    assert gap == []


def test_analyse_skill_gap_all_missing():
    from skill_analyzer import analyse_skill_gap

    cv = "Background in marketing and sales"
    skills = ["python", "sql", "docker"]
    matched, gap = analyse_skill_gap(cv, skills)
    assert matched == []
    assert set(gap) == {"python", "sql", "docker"}


def test_analyse_skill_gap_partial():
    from skill_analyzer import analyse_skill_gap

    cv = "Experienced in python and sql but not docker"
    skills = ["python", "sql", "kubernetes"]
    matched, gap = analyse_skill_gap(cv, skills)
    assert "python" in matched
    assert "sql" in matched
    assert "kubernetes" in gap


def test_analyse_skill_gap_empty_skills():
    from skill_analyzer import analyse_skill_gap

    matched, gap = analyse_skill_gap("any cv text", [])
    assert matched == []
    assert gap == []


def test_analyse_skill_gap_case_insensitive():
    from skill_analyzer import analyse_skill_gap

    cv = "Proficient in Python and SQL"
    skills = ["python", "sql"]
    matched, gap = analyse_skill_gap(cv, skills)
    assert set(matched) == {"python", "sql"}


# ---------------------------------------------------------------------------
# Tests for compute_semantic_score
# ---------------------------------------------------------------------------


def test_compute_semantic_score_returns_float_in_range():
    from skill_analyzer import compute_semantic_score

    score = compute_semantic_score("experienced python developer", "python software engineer")
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


def test_compute_semantic_score_identical_texts():
    """Identical texts should produce a score of 1.0 when using real normalised embeddings."""
    mock_model = MagicMock()
    unit_vec = np.array([[1.0, 0.0, 0.0]], dtype=np.float32)
    mock_model.encode.side_effect = lambda texts, **kw: np.tile(unit_vec, (len(texts), 1))

    with patch("skill_analyzer._get_transformer_model", return_value=mock_model):
        from skill_analyzer import compute_semantic_score, _get_transformer_model
        _get_transformer_model.cache_clear()
        score = compute_semantic_score("hello world", "hello world")
        assert score == pytest.approx(1.0, abs=1e-6)
        _get_transformer_model.cache_clear()


# ---------------------------------------------------------------------------
# Tests for compute_tfidf_score
# ---------------------------------------------------------------------------


def test_compute_tfidf_score_returns_float_in_range():
    from skill_analyzer import compute_tfidf_score

    score = compute_tfidf_score(
        "python developer with experience in sql and docker",
        "python sql kubernetes",
    )
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


# ---------------------------------------------------------------------------
# Tests for compute_match (integration)
# ---------------------------------------------------------------------------


def test_compute_match_returns_required_keys():
    from skill_analyzer import compute_match

    result = compute_match(
        cv_text="Experienced python developer with sql and docker skills",
        job_description="We are looking for a python backend engineer",
        required_skills=["python", "sql", "kubernetes"],
    )
    assert "score" in result
    assert "matched_skills" in result
    assert "gap_skills" in result


def test_compute_match_score_bounds():
    from skill_analyzer import compute_match

    result = compute_match(
        cv_text="Experienced python developer",
        job_description="Python software engineer needed",
        required_skills=["python"],
    )
    assert 0.0 <= result["score"] <= 1.0


def test_compute_match_gap_analysis_correctness():
    from skill_analyzer import compute_match

    result = compute_match(
        cv_text="I know python and sql",
        job_description="Backend developer",
        required_skills=["python", "sql", "docker"],
    )
    assert "python" in result["matched_skills"]
    assert "sql" in result["matched_skills"]
    assert "docker" in result["gap_skills"]


def test_compute_match_weights_sum_to_one_implicitly():
    """The composite score should be in [0,1] regardless of individual component values."""
    from skill_analyzer import compute_match

    result = compute_match(
        cv_text="completamente diverso dal lavoro richiesto",
        job_description="programmazione cnc fresatura fanuc",
        required_skills=["tornitura cnc", "metrologia"],
        semantic_weight=0.7,
        tfidf_weight=0.3,
    )
    assert 0.0 <= result["score"] <= 1.0
