from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class AnomalyDetection(Base):
    __tablename__ = "anomaly_detections"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_column = Column(String(100), nullable=False)
    date_column = Column(String(100), nullable=False)
    anomalies = Column(JSON, nullable=True)
    anomaly_count = Column(Integer, default=0)
    severity = Column(String(20), default="low")
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset")
    owner = relationship("User")
