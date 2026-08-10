from dataclasses import dataclass
from urllib.parse import urljoin

import httpcore
import httpx

from app.config import Settings
from app.errors import AppError
from app.services.url_validator import ValidatedUrl, validate_url


@dataclass(frozen=True)
class FetchedArticlePage:
    final_url: str
    html: str
    content_type: str


class _PinnedNetworkBackend(httpcore.AsyncNetworkBackend):
    """Connect to the validated IP while preserving the original Host/SNI."""

    def __init__(self, ip_address: str):
        self.ip_address = ip_address
        self.backend = httpcore.AnyIOBackend()

    async def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        return await self.backend.connect_tcp(
            self.ip_address,
            port,
            timeout=timeout,
            local_address=local_address,
            socket_options=socket_options,
        )

    async def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise RuntimeError("Unix sockets are not supported")


class _PinnedTransport(httpx.AsyncHTTPTransport):
    def __init__(self, ip_address: str):
        super().__init__(trust_env=False, retries=0)
        self._pool = httpcore.AsyncConnectionPool(
            ssl_context=httpx.create_ssl_context(verify=True, trust_env=False),
            network_backend=_PinnedNetworkBackend(ip_address),
            max_connections=1,
            max_keepalive_connections=0,
        )


async def fetch_article(initial: ValidatedUrl, settings: Settings) -> FetchedArticlePage:
    current = initial
    timeout = httpx.Timeout(settings.fetch_timeout_seconds)
    headers = {"User-Agent": "YOMIMIMI/1.0 (+https://example.invalid/support)", "Accept": "text/html,application/xhtml+xml"}
    for redirect_count in range(settings.max_redirects + 1):
        current = await validate_url(current.normalized_url)
        # A fresh transport pins this request to an already validated public IP.
        transport = _PinnedTransport(current.resolved_ips[0])
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False, headers=headers, transport=transport) as client:
            try:
                async with client.stream("GET", current.normalized_url) as response:
                    if response.status_code in {301, 302, 303, 307, 308}:
                        location = response.headers.get("location")
                        if not location or redirect_count >= settings.max_redirects:
                            raise AppError("ARTICLE_FETCH_FAILED", 422)
                        current = await validate_url(urljoin(current.normalized_url, location))
                        continue
                    if response.status_code != 200:
                        raise AppError("ARTICLE_FETCH_FAILED", 422)
                    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                    if content_type not in {"text/html", "application/xhtml+xml"}:
                        raise AppError("ARTICLE_FETCH_FAILED", 422)
                    length = response.headers.get("content-length")
                    if length and int(length) > settings.max_fetch_bytes:
                        raise AppError("ARTICLE_TOO_LARGE", 413)
                    body = bytearray()
                    async for part in response.aiter_bytes():
                        body.extend(part)
                        if len(body) > settings.max_fetch_bytes:
                            raise AppError("ARTICLE_TOO_LARGE", 413)
                    encoding = response.encoding or "utf-8"
                    return FetchedArticlePage(current.normalized_url, body.decode(encoding, errors="replace"), content_type)
            except AppError:
                raise
            except (httpx.HTTPError, ValueError, UnicodeError):
                raise AppError("ARTICLE_FETCH_FAILED", 422) from None
    raise AppError("ARTICLE_FETCH_FAILED", 422)
