import asyncio
import shutil
from datetime import UTC, datetime, timedelta

from app.config import Settings
from app.repositories.audio_repository import AudioRepository
from app.repositories.metadata_repository import MetadataRepository


class CleanupService:
    def __init__(self, settings: Settings, metadata: MetadataRepository, audio: AudioRepository, active_jobs: set[str]):
        self.settings = settings
        self.metadata = metadata
        self.audio = audio
        self.active_jobs = active_jobs

    async def run_once(self) -> None:
        now = datetime.now(UTC)
        known_ids: set[str] = set()
        for path in self.metadata.paths():
            item = await self.metadata.get(path.stem)
            if not item:
                continue
            known_ids.add(item.id)
            if item.id not in self.active_jobs and item.expires_at <= now:
                self.audio.delete(item.id)
                shutil.rmtree(self.settings.tmp_dir / item.id, ignore_errors=True)
                await self.metadata.delete(item.id)
        cutoff = now - timedelta(hours=self.settings.retention_hours)
        for path in self.settings.audio_dir.glob("*.mp3"):
            modified = datetime.fromtimestamp(path.stat().st_mtime, UTC)
            if path.stem not in known_ids and modified <= cutoff:
                path.unlink(missing_ok=True)
        for path in self.settings.tmp_dir.iterdir():
            modified = datetime.fromtimestamp(path.stat().st_mtime, UTC)
            if path.name not in self.active_jobs and modified <= cutoff:
                shutil.rmtree(path, ignore_errors=True)

    async def loop(self) -> None:
        while True:
            await self.run_once()
            await asyncio.sleep(3600)
