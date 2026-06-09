import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class ActivityLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response: Response = await call_next(request)
        duration_ms = int((time.time() - start_time) * 1000)

        if request.url.path.startswith("/api/"):
            try:
                from app.db.database import SessionLocal
                from app.services.activity_service import log_activity
                from app.core.security import decode_token
                from app.core.config import settings

                user_id = None
                auth_header = request.headers.get("Authorization", "")
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]
                    payload = decode_token(token)
                    if payload:
                        username = payload.get("sub")
                        if username:
                            db = SessionLocal()
                            from app.models.user import User
                            user = db.query(User).filter(User.username == username).first()
                            if user:
                                user_id = user.id
                                # Rate limiting check
                                if settings.RATE_LIMIT_ENABLED:
                                    try:
                                        from app.core.rate_limiter import check_rate_limit
                                        identifier = str(user_id)
                                        check_rate_limit(db, identifier, request.url.path)
                                    except Exception:
                                        pass
                            db.close()

                db = SessionLocal()
                parts = request.url.path.split("/")
                action = f"{request.method}:{parts[2] if len(parts) > 2 else 'root'}"
                log_activity(
                    db, action=action, user_id=user_id,
                    method=request.method, endpoint=str(request.url.path),
                    status_code=response.status_code,
                    ip_address=request.client.host if request.client else None,
                    response_time_ms=duration_ms,
                )
                db.close()
            except Exception:
                pass

        response.headers["X-Response-Time"] = str(duration_ms)
        return response
