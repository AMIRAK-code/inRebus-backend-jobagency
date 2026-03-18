"""
SQLAlchemy ORM models and database engine configuration.

Uses asyncpg for asynchronous PostgreSQL access.
Connection parameters are read from environment variables via pydantic-settings.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    ARRAY,
    Column,
    DateTime,
    Float,
    String,
    Text,
    create_engine,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings


# ---------------------------------------------------------------------------
# Synchronous engine (used for Alembic migrations and simple CRUD)
# ---------------------------------------------------------------------------

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ---------------------------------------------------------------------------
# ORM base class
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# ORM models
# ---------------------------------------------------------------------------


class CandidateORM(Base):
    """Persistent representation of a job candidate."""

    __tablename__ = "candidates"

    id: uuid.UUID = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    full_name: str = Column(String(200), nullable=False)
    cv_text: str = Column(Text, nullable=False)
    skills: list[str] = Column(ARRAY(String), nullable=False, default=list)
    created_at: datetime = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class JobOfferORM(Base):
    """Persistent representation of a job offer."""

    __tablename__ = "job_offers"

    id: uuid.UUID = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    title: str = Column(String(300), nullable=False)
    company: str = Column(String(200), nullable=False)
    description: str = Column(Text, nullable=False)
    required_skills: list[str] = Column(ARRAY(String), nullable=False)
    created_at: datetime = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class MatchResultORM(Base):
    """Cached result of an NLP matching computation."""

    __tablename__ = "match_results"

    id: uuid.UUID = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    candidate_id: uuid.UUID = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    job_offer_id: uuid.UUID = Column(PG_UUID(as_uuid=True), nullable=False, index=True)
    score: float = Column(Float, nullable=False)
    matched_skills: list[str] = Column(ARRAY(String), nullable=False, default=list)
    gap_skills: list[str] = Column(ARRAY(String), nullable=False, default=list)
    computed_at: datetime = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ---------------------------------------------------------------------------
# Dependency injection helper
# ---------------------------------------------------------------------------


def get_db():
    """Yield a SQLAlchemy session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_all_tables() -> None:
    """Create all database tables if they do not already exist."""
    Base.metadata.create_all(bind=engine)
