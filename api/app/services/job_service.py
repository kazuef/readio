import asyncio
import logging
import shutil
from datetime import datetime, timedelta, timezone

from app.config import Settings
from app.errors import AppError
from app.repositories.metadata_repository import MetadataRepository
from app.schemas.metadata import JobMetadata
from app.services.article_extractor import extract_article
from app.services.article_fetcher import fetch_article
from app.services.audio_assembler import AudioAssembler
from app.services.quota_service import QuotaService
from app.services.text_chunker import split_text
from app.services.text_normalizer import normalize_text
from app.services.tts_service import TtsService
from app.services.url_validator import validate_url

logger = logging.getLogger("yomimimi.jobs")


class JobService:
    def __init__(
        self,
        settings: Settings,
        metadata: MetadataRepository,
        quota: QuotaService,
        tts: TtsService,
        assembler: AudioAssembler,
    ):
        self.settings = settings
        self.metadata = metadata
        self.quota = quota
        self.tts = tts
        self.assembler = assembler
        self.semaphore = asyncio.Semaphore(settings.max_concurrent_jobs)
        self.active_jobs: set[str] = set()

    async def create(self, job_id: str, source_url: str) -> JobMetadata:
        now = datetime.now(timezone.utc)
        item = JobMetadata(
            id=job_id,
            source_url=source_url,
            status="queued",
            created_at=now,
            updated_at=now,
            expires_at=now + timedelta(hours=self.settings.retention_hours),
        )
        await self.metadata.save(item)
        return item

    async def process(self, job_id: str) -> None:
        self.active_jobs.add(job_id)
        try:
            await asyncio.wait_for(self._run(job_id), timeout=self.settings.job_timeout_seconds)
        except asyncio.TimeoutError:
            await self._fail(job_id, "JOB_TIMEOUT")
        except AppError as exc:
            await self._fail(job_id, exc.code)
        except Exception:
            await self._fail(job_id, "INTERNAL_ERROR")
        finally:
            self.active_jobs.discard(job_id)
            shutil.rmtree(self.settings.tmp_dir / job_id, ignore_errors=True)

    async def _run(self, job_id: str) -> None:
        async with self.semaphore:
            item = await self._update(job_id, status="fetching")
            validated = await validate_url(item.source_url)
            page = await fetch_article(validated, self.settings)
            item = await self._update(job_id, status="extracting", source_url=page.final_url)
            article = extract_article(page)
            text = normalize_text(article.text)
            if len(text) < 200:
                raise AppError("ARTICLE_EXTRACTION_FAILED", 422)
            if len(text) > self.settings.max_article_characters:
                raise AppError("ARTICLE_TOO_LARGE", 413)
            await self.quota.reserve(len(text))
            await self._update(
                job_id,
                status="generating_audio",
                title=article.title,
                character_count=len(text),
            )
            chunks = split_text(text, self.settings.tts_max_chunk_bytes)
            work_dir = self.settings.tmp_dir / job_id
            print("##########################")
            paths = await self.tts.synthesize(chunks, work_dir)
            print(f"#####\n{paths}\n#####")
            _, duration = await self.assembler.assemble(job_id, paths, work_dir)
            await self._update(
                job_id,
                status="ready",
                audio_filename=f"{job_id}.mp3",
                duration_seconds=duration,
                error_code=None,
            )
            logger.info("job_completed", extra={"job_id": job_id, "stage": "ready", "character_count": len(text)})

    async def _update(self, job_id: str, **changes) -> JobMetadata:
        item = await self.metadata.get(job_id)
        if not item:
            raise AppError("JOB_NOT_FOUND", 404)
        item = item.model_copy(update={**changes, "updated_at": datetime.now(timezone.utc)})
        await self.metadata.save(item)
        return item

    async def _fail(self, job_id: str, code: str) -> None:
        try:
            await self._update(job_id, status="failed", error_code=code, audio_filename=None, duration_seconds=None)
            logger.warning("job_failed", extra={"job_id": job_id, "stage": "failed"})
        except AppError:
            pass

    async def recover_interrupted(self) -> None:
        for path in self.metadata.paths():
            item = await self.metadata.get(path.stem)
            if item and item.status not in {"ready", "failed"}:
                await self._fail(item.id, "INTERNAL_ERROR")
