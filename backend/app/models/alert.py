from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class AlertConfig(Base):
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    alert_type = Column(String(50), nullable=False)  # threshold, forecast_fail, report_complete, low_stock, demand_spike
    threshold_value = Column(Float, nullable=True)
    threshold_operator = Column(String(10), nullable=True)  # gt, lt, gte, lte
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    target_column = Column(String(100), nullable=True)
    email_enabled = Column(Boolean, default=False)
    in_app_enabled = Column(Boolean, default=True)
    email_address = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")


class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(Integer, primary_key=True, index=True)
    alert_config_id = Column(Integer, ForeignKey("alert_configs.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(String(50), nullable=False)
    triggered_value = Column(Float, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
