from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    from app.models import (
        User, Dataset, Forecast, Notification, ModelComparison,
        ActivityLog, AnomalyDetection, CacheEntry,
        ForecastSchedule, AlertConfig, AlertLog,
        Integration, WebhookLog, DashboardWidget, RateLimitEntry,
    )
    Base.metadata.create_all(bind=engine)
