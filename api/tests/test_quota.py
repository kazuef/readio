import pytest

from app.errors import AppError
from app.services.quota_service import QuotaService


@pytest.mark.asyncio
async def test_quota_never_writes_over_limit(tmp_path):
    service = QuotaService(tmp_path, 10)
    await service.reserve(8)
    with pytest.raises(AppError) as error:
        await service.reserve(3)
    assert error.value.code == "MONTHLY_LIMIT_REACHED"
