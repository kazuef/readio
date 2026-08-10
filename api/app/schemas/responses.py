from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from .metadata import JobStatus


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: Optional[str] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class GenerateResponse(BaseModel):
    id: str
    status: JobStatus
    status_url: str


class JobError(BaseModel):
    code: str
    message: str


class JobResponse(BaseModel):
    id: str
    status: JobStatus
    title: Optional[str]
    source_url: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    error: Optional[JobError] = None
