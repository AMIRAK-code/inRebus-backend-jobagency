"""
SQLAlchemy ORM models and database engine configuration.
Robust Version: Uses SQLite by default for the local demo.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# ---------------------------------------------------------------------------
# Synchronous engine (using SQLite as reliable local fallback)
# ---------------------------------------------------------------------------

sqlite_url = "sqlite:///./inrebus_demo.db"

engine = create_engine(
    sqlite_url,
    connect_args={"check_same_thread": False},
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
    __tablename__ = "candidates"

    id: str = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    full_name: str = Column(String(200), nullable=False)
    cv_text: str = Column(Text, nullable=False)
    skills: list[str] = Column(JSON, nullable=False, default=list)
    created_at: datetime = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class CandidateShortlistORM(Base):
    __tablename__ = "candidate_shortlists"

    id: str = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    candidate_id: str = Column(String(36), nullable=False, index=True, unique=True)
    created_at: datetime = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class JobOfferORM(Base):
    __tablename__ = "job_offers"

    id: str = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    title: str = Column(String(300), nullable=False)
    company: str = Column(String(200), nullable=False)
    description: str = Column(Text, nullable=False)
    required_skills: list[str] = Column(JSON, nullable=False)
    is_active: bool = Column(Boolean, nullable=False, default=True)
    created_at: datetime = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class MatchResultORM(Base):
    __tablename__ = "match_results"

    id: str = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    candidate_id: str = Column(String(36), nullable=False, index=True)
    job_offer_id: str = Column(String(36), nullable=False, index=True)
    score: float = Column(Float, nullable=False)
    matched_skills: list[str] = Column(JSON, nullable=False, default=list)
    gap_skills: list[str] = Column(JSON, nullable=False, default=list)
    computed_at: datetime = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_all_tables() -> None:
    Base.metadata.create_all(bind=engine)
