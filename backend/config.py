"""
Application configuration loaded from environment variables.

A .env file in the backend directory is supported via python-dotenv.
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the inRebus Agency backend."""

    database_url: str = Field(
        default="postgresql://inrebus:inrebus@localhost:5432/inrebus_agency",
        description="PostgreSQL connection string (sync SQLAlchemy format).",
    )

    sentence_transformer_model: str = Field(
        default="paraphrase-multilingual-MiniLM-L12-v2",
        description=(
            "HuggingFace model identifier used for semantic skill matching. "
            "The multilingual variant supports both Italian and English."
        ),
    )

    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Allowed CORS origins for the React development server.",
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
