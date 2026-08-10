import time
from collections import defaultdict, deque

from fastapi import Request

from app.errors import AppError


class RateLimiter:
    def __init__(self):
        self.events: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def check(self, request: Request, scope: str, limit: int, window_seconds: int) -> None:
        client = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = self.events[(client, scope)]
        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            raise AppError("RATE_LIMITED", 429)
        bucket.append(now)
