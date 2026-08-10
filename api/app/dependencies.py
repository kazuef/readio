from app.config import get_settings
from app.repositories.audio_repository import AudioRepository
from app.repositories.metadata_repository import MetadataRepository
from app.services.audio_assembler import AudioAssembler
from app.services.job_service import JobService
from app.services.quota_service import QuotaService
from app.services.tts_service import TtsService

settings = get_settings()
settings.ensure_directories()
metadata_repository = MetadataRepository(settings.metadata_dir)
audio_repository = AudioRepository(settings.audio_dir)
quota_service = QuotaService(settings.usage_dir, settings.monthly_tts_character_limit)
tts_service = TtsService(settings)
audio_assembler = AudioAssembler(audio_repository)
job_service = JobService(settings, metadata_repository, quota_service, tts_service, audio_assembler)
