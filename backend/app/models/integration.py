from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    integration_type = Column(String(50), nullable=False)  # webhook, erp, inventory, external_api
    endpoint_url = Column(String(500), nullable=True)
    api_key = Column(String(500), nullable=True)
    headers = Column(JSON, nullable=True)
    payload_template = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    last_triggered = Column(DateTime, nullable=True)
    trigger_count = Column(Integer, default=0)
    config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")


class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id = Column(Integer, primary_key=True, index=True)
    integration_id = Column(Integer, ForeignKey("integrations.id"), nullable=False)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=True)
    response_status = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    success = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    integration = relationship("Integration")
