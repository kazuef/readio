from datetime import datetime, timedelta, timezone

import pytest

from app.repositories.metadata_repository import MetadataRepository
from app.schemas.metadata import JobMetadata


@pytest.mark.asyncio
async def test_atomic_metadata_roundtrip(tmp_path):
    repo = MetadataRepository(tmp_path)
    now = datetime.now(timezone.utc)
    item = JobMetadata(id="01JEXAMPLE0000000000000000", source_url="https://example.com/", status="queued", created_at=now, updated_at=now, expires_at=now + timedelta(hours=24))
    await repo.save(item)
    loaded = await repo.get(item.id)
    assert loaded == item
    assert not list(tmp_path.glob("*.tmp"))
