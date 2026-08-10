import re
from datetime import UTC, datetime

from fastapi import APIRouter, Request

from app.dependencies import metadata_repository
from app.errors import MESSAGES, AppError
from app.middleware.rate_limit import RateLimiter
from app.schemas.responses import JobError, JobResponse

router = APIRouter()
limiter = RateLimiter()
ULID_PATTERN = re.compile(r"^[0-9A-HJKMNP-TV-Z]{26}$")


@router.get("/jobs/{job_id}", response_model=JobResponse, response_model_exclude_none=True)
async def get_job(job_id: str, request: Request) -> JobResponse:
    limiter.check(request, "jobs", 60, 60)
    if not ULID_PATTERN.fullmatch(job_id):
        raise AppError("INVALID_JOB_ID", 400)
    item = await metadata_repository.get(job_id)
    if not item or item.expires_at <= datetime.now(UTC):
        raise AppError("JOB_NOT_FOUND", 404)
    error = (
        JobError(code=item.error_code, message=MESSAGES.get(item.error_code, MESSAGES["INTERNAL_ERROR"]))
        if item.error_code
        else None
    )
    ready = item.status == "ready"
    return JobResponse(
        id=item.id,
        status=item.status,
        title=item.title,
        source_url=item.source_url if ready else None,
        audio_url=f"/audio/{item.id}" if ready else None,
        duration_seconds=item.duration_seconds if ready else None,
        created_at=item.created_at,
        updated_at=item.updated_at,
        expires_at=item.expires_at,
        error=error,
    )
