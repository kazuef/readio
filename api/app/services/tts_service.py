import asyncio
import json
import random
from pathlib import Path

from google.api_core import exceptions as google_exceptions
from google.cloud import texttospeech
from google.oauth2 import service_account

from app.config import Settings
from app.errors import AppError


class TtsService:
    def __init__(self, settings: Settings):
        self.settings = settings

    def _client(self) -> texttospeech.TextToSpeechAsyncClient:
        raw = self.settings.google_cloud_credentials_json.get_secret_value()
        if not raw:
            raise AppError("TTS_TEMPORARY_ERROR", 503)
        try:
            info = json.loads(raw)
            credentials = service_account.Credentials.from_service_account_info(info)
            return texttospeech.TextToSpeechAsyncClient(credentials=credentials)
        except (ValueError, TypeError, KeyError):
            raise AppError("TTS_TEMPORARY_ERROR", 503) from None

    async def synthesize(self, chunks: list[str], output_dir: Path) -> list[Path]:
        output_dir.mkdir(parents=True, exist_ok=True)
        client = self._client()
        paths: list[Path] = []
        try:
            for index, chunk in enumerate(chunks):
                response = await self._synthesize_with_retry(client, chunk)
                if not response.audio_content or len(response.audio_content) < 3 or response.audio_content[:2] not in {b"ID", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}:
                    raise AppError("TTS_TEMPORARY_ERROR", 503)
                path = output_dir / f"chunk-{index:04}.mp3"
                path.write_bytes(response.audio_content)
                paths.append(path)
        finally:
            close = getattr(client, "close", None) or getattr(client.transport, "close", None)
            if close:
                result = close()
                if asyncio.iscoroutine(result):
                    await result
        return paths

    async def _synthesize_with_retry(self, client: texttospeech.TextToSpeechAsyncClient, chunk: str):
        request = texttospeech.SynthesizeSpeechRequest(
            input=texttospeech.SynthesisInput(text=chunk),
            voice=texttospeech.VoiceSelectionParams(
                language_code=self.settings.tts_language_code,
                name=self.settings.tts_voice_name,
            ),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=self.settings.tts_speaking_rate,
            ),
        )
        for attempt in range(4):
            try:
                return await client.synthesize_speech(request=request, timeout=30)
            except (google_exceptions.TooManyRequests, google_exceptions.ServiceUnavailable, google_exceptions.DeadlineExceeded):
                if attempt == 3:
                    break
                await asyncio.sleep((2**attempt) + random.random() * 0.25)
            except google_exceptions.GoogleAPICallError:
                break
        raise AppError("TTS_TEMPORARY_ERROR", 503)
