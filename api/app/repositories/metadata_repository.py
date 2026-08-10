from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

from app.schemas.metadata import JobMetadata


class MetadataRepository:
    def __init__(self, directory: Path):
        self.directory = directory
        self._locks: dict[str, asyncio.Lock] = {}

    def _path(self, job_id: str) -> Path:
        return self.directory / f"{job_id}.json"

    async def save(self, metadata: JobMetadata) -> None:
        lock = self._locks.setdefault(metadata.id, asyncio.Lock())
        async with lock:
            await asyncio.to_thread(self._save_sync, metadata)

    def _save_sync(self, metadata: JobMetadata) -> None:
        path = self._path(metadata.id)
        temp = path.with_suffix(".json.tmp")
        payload = metadata.model_dump_json(indent=2)
        with temp.open("w", encoding="utf-8") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)

    async def get(self, job_id: str) -> JobMetadata | None:
        path = self._path(job_id)
        if not path.exists():
            return None
        try:
            return await asyncio.to_thread(self._read_sync, path)
        except (OSError, json.JSONDecodeError, ValueError):
            return None

    @staticmethod
    def _read_sync(path: Path) -> JobMetadata:
        return JobMetadata.model_validate_json(path.read_text(encoding="utf-8"))

    async def delete(self, job_id: str) -> None:
        await asyncio.to_thread(self._path(job_id).unlink, missing_ok=True)

    def paths(self) -> list[Path]:
        return list(self.directory.glob("*.json"))
