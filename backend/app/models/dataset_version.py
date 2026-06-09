from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    version = Column(Integer, default=1)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    rows_count = Column(Integer, nullable=True)
    changes_summary = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")


class ExecutiveReport(Base):
    __tablename__ = "executive_reports"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)  # monthly, quarterly, annual, custom
    period_from = Column(String(20), nullable=True)
    period_to = Column(String(20), nullable=True)
    content = Column(JSON, nullable=True)
    is_scheduled = Column(Boolean, default=False)
    schedule_interval = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
