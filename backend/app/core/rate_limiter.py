from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.rate_limit import RateLimitEntry

RATE_LIMITS = {
    "/api/auth/login": {"limit": 10, "window_seconds": 60},
    "/api/auth/register": {"limit": 5, "window_seconds": 60},
    "/api/forecasts/": {"limit": 30, "window_seconds": 60},
    "/api/datasets/upload": {"limit": 20, "window_seconds": 60},
    "/api/anomalies/detect": {"limit": 10, "window_seconds": 60},
    "default": {"limit": 100, "window_seconds": 60},
}


def get_rate_limit_config(path: str) -> dict:
    for pattern, config in RATE_LIMITS.items():
        if pattern != "default" and path.startswith(pattern):
            return config
    return RATE_LIMITS["default"]


def check_rate_limit(db: Session, identifier: str, endpoint: str):
    config = get_rate_limit_config(endpoint)
    limit = config["limit"]
    window = config["window_seconds"]
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    window_start = now - timedelta(seconds=window)

    entry = db.query(RateLimitEntry).filter(
        RateLimitEntry.identifier == identifier,
        RateLimitEntry.endpoint == endpoint,
    ).first()

    if not entry:
        entry = RateLimitEntry(identifier=identifier, endpoint=endpoint,
                               request_count=1, window_start=now, last_request=now)
        db.add(entry)
        db.commit()
        return

    if entry.window_start < window_start:
        entry.request_count = 1
        entry.window_start = now
        entry.last_request = now
        db.commit()
        return

    entry.request_count += 1
    entry.last_request = now
    db.commit()

    if entry.request_count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Max {limit} requests per {window}s.",
            headers={"Retry-After": str(window)},
        )
