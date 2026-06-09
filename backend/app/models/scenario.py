from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class ForecastScenario(Base):
    __tablename__ = "forecast_scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    base_forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=True)
    variables = Column(JSON, nullable=True)  # {"sales_growth": 0.1, "seasonality": 1.2, "demand_factor": 0.9}
    results = Column(JSON, nullable=True)
    status = Column(String(50), default="pending")
    is_saved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
    dataset = relationship("Dataset")
