from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class ForecastSchedule(Base):
    __tablename__ = "forecast_schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    model_type = Column(String(50), default="linear_regression")
    target_column = Column(String(100), nullable=False)
    date_column = Column(String(100), nullable=False)
    periods = Column(Integer, default=12)
    interval = Column(String(50), default="daily")  # hourly, daily, weekly, monthly
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime, nullable=True)
    next_run = Column(DateTime, nullable=True)
    run_count = Column(Integer, default=0)
    config = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
    dataset = relationship("Dataset")
