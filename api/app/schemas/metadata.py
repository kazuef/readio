from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

JobStatus = Literal["queued", "fetching", "extracting", "generating_audio", "ready", "failed"]


class JobMetadata(BaseModel):
    schema_version: int = 1
    id: str
    source_url: str = Field(max_length=2048)
    title: str | None = Field(default=None, max_length=200)
    status: JobStatus
    audio_filename: str | None = None
    duration_seconds: float | None = None
    character_count: int = Field(default=0, ge=0, le=30_000)
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    error_code: str | None = None
