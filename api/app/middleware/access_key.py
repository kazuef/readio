import secrets

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import Settings
from app.errors import MESSAGES


class AccessKeyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings):
        super().__init__(app)
        self.expected = settings.mvp_access_key.get_secret_value()

    async def dispatch(self, request, call_next):
        if request.url.path in {"/health", "/docs", "/openapi.json", "/generate"}:
        # if request.url.path == "/health":
            return await call_next(request)
        supplied = request.headers.get("x-mvp-key", "")
        if not self.expected or not secrets.compare_digest(supplied, self.expected):
            request_id = getattr(request.state, "request_id", None)
            return JSONResponse(
                status_code=401,
                content={"error": {"code": "ACCESS_DENIED", "message": MESSAGES["ACCESS_DENIED"], "request_id": request_id}},
            )
        return await call_next(request)
