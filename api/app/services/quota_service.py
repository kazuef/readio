import asyncio
import json
import os
from datetime import UTC, datetime
from pathlib import Path

from filelock import FileLock

from app.errors import AppError


class QuotaService:
    def __init__(self, directory: Path, limit: int):
        self.directory = directory
        self.limit = limit
        self._lock = asyncio.Lock()

    async def reserve(self, characters: int) -> None:
        async with self._lock:
            await asyncio.to_thread(self._reserve_sync, characters)

    def _reserve_sync(self, characters: int) -> None:
        now = datetime.now(UTC)
        month = now.strftime("%Y-%m")
        path = self.directory / f"{month}.json"
        with FileLock(str(path) + ".lock"):
            data = {"month": month, "reserved_characters": 0}
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
            updated = int(data.get("reserved_characters", 0)) + characters
            if updated > self.limit:
                raise AppError("MONTHLY_LIMIT_REACHED", 429)
            data = {
                "month": month,
                "reserved_characters": updated,
                "updated_at": now.isoformat().replace("+00:00", "Z"),
            }
            temp = path.with_suffix(".json.tmp")
            with temp.open("w", encoding="utf-8") as handle:
                json.dump(data, handle, ensure_ascii=False, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp, path)
