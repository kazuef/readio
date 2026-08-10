import socket

import pytest

from app.errors import AppError
from app.services.url_validator import validate_url


@pytest.mark.asyncio
@pytest.mark.parametrize("url", ["ftp://example.com/a", "http://localhost/a", "http://127.0.0.1/a", "https://user:pass@example.com/a", "https://example.com:8080/a"])
async def test_rejects_unsafe_urls(url):
    with pytest.raises(AppError):
        await validate_url(url)


@pytest.mark.asyncio
async def test_allows_public_https_and_removes_fragment(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))])
    result = await validate_url("HTTPS://Example.com/story?q=1#part")
    assert result.normalized_url == "https://example.com/story?q=1"
    assert result.resolved_ips == ("93.184.216.34",)


@pytest.mark.asyncio
async def test_rejects_private_dns_result(monkeypatch):
    monkeypatch.setattr(socket, "getaddrinfo", lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.4", 443))])
    with pytest.raises(AppError) as error:
        await validate_url("https://example.com/story")
    assert error.value.code == "URL_NOT_ALLOWED"
