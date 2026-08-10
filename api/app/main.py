import asyncio
import logging
import time
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.dependencies import audio_repository, job_service, metadata_repository, settings
from app.errors import AppError, MESSAGES
from app.logging_config import configure_logging
from app.middleware.access_key import AccessKeyMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.routers import audio, generate, health, jobs
from app.services.cleanup_service import CleanupService

configure_logging(settings.log_level)
logger = logging.getLogger("yomimimi.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await job_service.recover_interrupted()
    cleanup = CleanupService(settings, metadata_repository, audio_repository, job_service.active_jobs)
    task = asyncio.create_task(cleanup.loop(), name="cleanup-loop")
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(
    title="YOMIMIMI API",
    docs_url="/docs" if settings.expose_docs else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.expose_docs else None,
    lifespan=lifespan,
)
app.add_middleware(AccessKeyMiddleware, settings=settings)
app.add_middleware(RequestIdMiddleware)
app.include_router(health.router)
app.include_router(generate.router)
app.include_router(jobs.router)
app.include_router(audio.router)


@app.middleware("http")
async def log_request(request: Request, call_next):
    started = time.monotonic()
    response = await call_next(request)
    logger.info(
        "request_completed",
        extra={
            "request_id": getattr(request.state, "request_id", None),
            "status_code": response.status_code,
            "duration_ms": round((time.monotonic() - started) * 1000),
        },
    )
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "request_id": getattr(request.state, "request_id", None)}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, _: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"error": {"code": "INVALID_URL", "message": MESSAGES["INVALID_URL"], "request_id": getattr(request.state, "request_id", None)}},
    )
