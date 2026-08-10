import os
from pathlib import Path


class AudioRepository:
    def __init__(self, directory: Path):
        self.directory = directory

    def path_for(self, job_id: str) -> Path:
        return self.directory / f"{job_id}.mp3"

    def publish(self, job_id: str, source: Path) -> Path:
        destination = self.path_for(job_id)
        temporary = destination.with_suffix(".mp3.tmp")
        temporary.write_bytes(source.read_bytes())
        with temporary.open("rb") as handle:
            os.fsync(handle.fileno())
        os.replace(temporary, destination)
        return destination

    def delete(self, job_id: str) -> None:
        self.path_for(job_id).unlink(missing_ok=True)
