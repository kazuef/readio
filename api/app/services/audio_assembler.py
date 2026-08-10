import asyncio
import json
from pathlib import Path

from app.errors import AppError
from app.repositories.audio_repository import AudioRepository


class AudioAssembler:
    def __init__(self, repository: AudioRepository):
        self.repository = repository

    async def assemble(self, job_id: str, chunks: list[Path], work_dir: Path) -> tuple[Path, float]:
        if not chunks or any(not path.exists() for path in chunks):
            raise AppError("TTS_TEMPORARY_ERROR", 503)
        concat_file = work_dir / "concat.txt"
        concat_file.write_text("".join(f"file '{path.name}'\n" for path in chunks), encoding="utf-8")
        final = work_dir / "final.mp3"
        process = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_file.name,
            "-c",
            "copy",
            final.name,
            cwd=work_dir,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        _, _stderr = await process.communicate()
        if process.returncode or not final.exists() or final.stat().st_size == 0:
            raise AppError("TTS_TEMPORARY_ERROR", 503)
        duration = await self._duration(final)
        return self.repository.publish(job_id, final), duration

    async def _duration(self, path: Path) -> float:
        process = await asyncio.create_subprocess_exec(
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            str(path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await process.communicate()
        try:
            return float(json.loads(stdout)["format"]["duration"])
        except (KeyError, ValueError, TypeError, json.JSONDecodeError):
            raise AppError("TTS_TEMPORARY_ERROR", 503) from None
