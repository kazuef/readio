import asyncio
import ipaddress
import socket
from dataclasses import dataclass
from urllib.parse import urlsplit, urlunsplit

from app.errors import AppError


@dataclass(frozen=True)
class ValidatedUrl:
    normalized_url: str
    hostname: str
    port: int
    resolved_ips: tuple[str, ...]


async def validate_url(value: str) -> ValidatedUrl:
    try:
        parts = urlsplit(value.strip())
        if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
            raise ValueError
        if parts.username or parts.password:
            raise AppError("URL_NOT_ALLOWED", 403)
        hostname = parts.hostname.rstrip(".").lower()
        if hostname == "localhost" or hostname.endswith(".localhost"):
            raise AppError("URL_NOT_ALLOWED", 403)
        try:
            ipaddress.ip_address(hostname)
            raise AppError("URL_NOT_ALLOWED", 403)
        except ValueError:
            pass
        port = parts.port or (443 if parts.scheme.lower() == "https" else 80)
        if port not in {80, 443}:
            raise AppError("URL_NOT_ALLOWED", 403)
    except AppError:
        raise
    except (ValueError, UnicodeError):
        raise AppError("INVALID_URL", 400) from None

    try:
        infos = await asyncio.to_thread(socket.getaddrinfo, hostname, port, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise AppError("ARTICLE_FETCH_FAILED", 422) from None
    ips = tuple(sorted({info[4][0] for info in infos}))
    if not ips or any(not ipaddress.ip_address(ip).is_global for ip in ips):
        raise AppError("URL_NOT_ALLOWED", 403)
    netloc = hostname if port in {80, 443} else f"{hostname}:{port}"
    normalized = urlunsplit((parts.scheme.lower(), netloc, parts.path or "/", parts.query, ""))
    return ValidatedUrl(normalized, hostname, port, ips)
