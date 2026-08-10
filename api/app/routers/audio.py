import hashlib
import re
from datetime import datetime, timezone
from email.utils import formatdate

from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse

from app.dependencies import audio_repository, metadata_repository
from app.errors import AppError
from app.middleware.rate_limit import RateLimiter
from app.routers.jobs import ULID_PATTERN

router = APIRouter()
limiter = RateLimiter()
RANGE_PATTERN = re.compile(r"^bytes=(\d*)-(\d*)$")


@router.get("/audio/{job_id}")
async def get_audio(job_id: str, request: Request):
    limiter.check(request, "audio", 30, 60)
    if not ULID_PATTERN.fullmatch(job_id):
        raise AppError("AUDIO_NOT_FOUND", 404)
    item = await metadata_repository.get(job_id)
    path = audio_repository.path_for(job_id)
    if not item or item.status != "ready" or item.expires_at <= datetime.now(timezone.utc) or not path.exists():
        raise AppError("AUDIO_NOT_FOUND", 404)
    stat = path.stat()
    etag = hashlib.sha256(f"{stat.st_size}:{stat.st_mtime_ns}".encode()).hexdigest()
    headers = {
        "Accept-Ranges": "bytes",
        "ETag": f'"{etag}"',
        "Last-Modified": formatdate(stat.st_mtime, usegmt=True),
        "Cache-Control": "private, max-age=300",
    }
    range_header = request.headers.get("range")
    if not range_header:
        return FileResponse(path, media_type="audio/mpeg", filename=None, headers=headers)
    match = RANGE_PATTERN.fullmatch(range_header)
    if not match or "," in range_header:
        return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{stat.st_size}"})
    start_text, end_text = match.groups()
    if not start_text and not end_text:
        return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{stat.st_size}"})
    if start_text:
        start = int(start_text)
        end = int(end_text) if end_text else stat.st_size - 1
    else:
        suffix = int(end_text)
        start = max(0, stat.st_size - suffix)
        end = stat.st_size - 1
    if start >= stat.st_size or start > end:
        return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{stat.st_size}"})
    end = min(end, stat.st_size - 1)
    with path.open("rb") as handle:
        handle.seek(start)
        content = handle.read(end - start + 1)
    return Response(
        content=content,
        status_code=206,
        media_type="audio/mpeg",
        headers={**headers, "Content-Range": f"bytes {start}-{end}/{stat.st_size}", "Content-Length": str(len(content))},
    )
