from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from app.db.database import Base


class RateLimitEntry(Base):
    __tablename__ = "rate_limit_entries"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String(255), index=True, nullable=False)  # ip or user_id
    endpoint = Column(String(255), nullable=False)
    request_count = Column(Integer, default=1)
    window_start = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_request = Column(DateTime, default=lambda: datetime.now(timezone.utc))
