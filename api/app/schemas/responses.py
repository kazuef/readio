from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from .metadata import JobStatus


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str | None = None


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
    title: str | None
    source_url: str | None = None
    audio_url: str | None = None
    duration_seconds: float | None = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime
    error: JobError | None = None
