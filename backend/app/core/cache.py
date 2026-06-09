import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.cache import CacheEntry


def get_cache(db: Session, key: str):
    entry = db.query(CacheEntry).filter(CacheEntry.cache_key == key).first()
    if not entry:
        return None
    if entry.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        db.delete(entry)
        db.commit()
        return None
    try:
        return json.loads(entry.cache_value)
    except Exception:
        return None


def set_cache(db: Session, key: str, value, ttl_seconds: int = 300):
    try:
        existing = db.query(CacheEntry).filter(CacheEntry.cache_key == key).first()
        expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=ttl_seconds)
        if existing:
            existing.cache_value = json.dumps(value)
            existing.expires_at = expires
        else:
            entry = CacheEntry(cache_key=key, cache_value=json.dumps(value), expires_at=expires)
            db.add(entry)
        db.commit()
    except Exception:
        db.rollback()


def invalidate_cache(db: Session, key: str):
    db.query(CacheEntry).filter(CacheEntry.cache_key == key).delete()
    db.commit()


def invalidate_pattern(db: Session, pattern: str):
    db.query(CacheEntry).filter(CacheEntry.cache_key.contains(pattern)).delete()
    db.commit()
