from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_cloud_credentials_json: SecretStr = SecretStr("")
    mvp_access_key: SecretStr = SecretStr("dev-only-change-me")
    generation_enabled: bool = True
    tts_language_code: str = "ja-JP"
    tts_voice_name: str = "ja-JP-Wavenet-A"
    tts_speaking_rate: float = Field(default=1.0, ge=0.25, le=4.0)
    tts_max_chunk_bytes: int = Field(default=4500, ge=100, le=5000)
    audio_dir: Path = Path("data/audio")
    metadata_dir: Path = Path("data/metadata")
    usage_dir: Path = Path("data/usage")
    tmp_dir: Path = Path("data/tmp")
    max_fetch_bytes: int = 5_242_880
    max_article_characters: int = 30_000
    fetch_timeout_seconds: int = 30
    job_timeout_seconds: int = 300
    max_redirects: int = 3
    max_concurrent_jobs: int = 2
    monthly_tts_character_limit: int = 5_000_000
    retention_hours: int = 24
    log_level: str = "INFO"
    expose_docs: bool = False

    def ensure_directories(self) -> None:
        for path in (self.audio_dir, self.metadata_dir, self.usage_dir, self.tmp_dir):
            path.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
