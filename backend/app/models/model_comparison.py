from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class ModelComparison(Base):
    __tablename__ = "model_comparisons"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    target_column = Column(String(100), nullable=False)
    date_column = Column(String(100), nullable=False)
    periods = Column(Integer, default=12)
    results = Column(JSON, nullable=True)
    best_model = Column(String(50), nullable=True)
    best_accuracy = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
