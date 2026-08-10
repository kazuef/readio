import asyncio

import ulid
from fastapi import APIRouter, Request

from app.dependencies import job_service, settings
from app.errors import AppError
from app.middleware.rate_limit import RateLimiter
from app.schemas.requests import GenerateRequest
from app.schemas.responses import GenerateResponse
from app.services.url_validator import validate_url

router = APIRouter()
limiter = RateLimiter()


@router.post("/generate", response_model=GenerateResponse, status_code=202)
async def generate(payload: GenerateRequest, request: Request) -> GenerateResponse:
    limiter.check(request, "generate", 10, 3600)
    if not settings.generation_enabled:
        raise AppError("GENERATION_DISABLED", 503)
    if len(job_service.active_jobs) >= settings.max_concurrent_jobs:
        raise AppError("RATE_LIMITED", 429)
    validated = await validate_url(payload.url)
    job_id = str(ulid.ULID())
    item = await job_service.create(job_id, validated.normalized_url)
    job_service.active_jobs.add(job_id)
    asyncio.create_task(job_service.process(job_id), name=f"job-{job_id}")
    return GenerateResponse(id=job_id, status=item.status, status_url=f"/jobs/{job_id}")
