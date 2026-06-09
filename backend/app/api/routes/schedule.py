"""
Smart Automation — Forecast scheduling and automated alerts.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.schedule import ForecastSchedule
from app.core.security import get_current_user
from app.core.roles import require_permission

router = APIRouter(prefix="/api/schedules", tags=["Smart Automation"])

INTERVALS = {
    "hourly": timedelta(hours=1),
    "daily": timedelta(days=1),
    "weekly": timedelta(weeks=1),
    "monthly": timedelta(days=30),
}


class ScheduleCreate(BaseModel):
    name: str
    dataset_id: int
    model_type: str = "linear_regression"
    target_column: str
    date_column: str
    periods: int = 12
    interval: str = "daily"
    config: Optional[dict] = None


class ScheduleResponse(BaseModel):
    id: int
    name: str
    dataset_id: int
    model_type: str
    target_column: str
    date_column: str
    periods: int
    interval: str
    is_active: bool
    last_run: Optional[datetime]
    next_run: Optional[datetime]
    run_count: int
    created_at: datetime
    model_config = {"from_attributes": True}


def _calculate_next_run(interval: str) -> datetime:
    delta = INTERVALS.get(interval, timedelta(days=1))
    return datetime.now(timezone.utc).replace(tzinfo=None) + delta


def _run_scheduled_forecast(schedule_id: int, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.forecast import Forecast
    from app.ml.forecasting import run_forecast
    from app.services.notification_service import notify_forecast_complete, notify_forecast_error

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        schedule = db.query(ForecastSchedule).filter(ForecastSchedule.id == schedule_id).first()
        if not schedule or not schedule.is_active:
            return
        dataset = db.query(Dataset).filter(Dataset.id == schedule.dataset_id).first()
        if not dataset:
            return

        forecast_name = f"{schedule.name} - Auto {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        forecast = Forecast(
            name=forecast_name, model_type=schedule.model_type,
            periods=schedule.periods, target_column=schedule.target_column,
            date_column=schedule.date_column, dataset_id=schedule.dataset_id,
            owner_id=schedule.owner_id, status="running",
        )
        db.add(forecast)
        db.commit()
        db.refresh(forecast)

        result = run_forecast(dataset.file_path, schedule.model_type, schedule.periods,
                              schedule.target_column, schedule.date_column, [])
        forecast.predictions = result["predictions"]
        forecast.historical_data = result["historical"]
        forecast.accuracy_score = result.get("r2_score")
        forecast.mae = result.get("mae")
        forecast.rmse = result.get("rmse")
        forecast.status = "completed"

        schedule.last_run = datetime.now(timezone.utc).replace(tzinfo=None)
        schedule.next_run = _calculate_next_run(schedule.interval)
        schedule.run_count += 1
        db.commit()
        notify_forecast_complete(db, schedule.owner_id, forecast_name, forecast.accuracy_score)
    except Exception as e:
        if 'forecast' in locals():
            forecast.status = "error"
            forecast.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/", response_model=ScheduleResponse, status_code=201)
def create_schedule(
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_forecasts")),
):
    if schedule_data.interval not in INTERVALS:
        raise HTTPException(status_code=400, detail=f"Interval must be one of: {', '.join(INTERVALS.keys())}")
    dataset = db.query(Dataset).filter(Dataset.id == schedule_data.dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    schedule = ForecastSchedule(
        **schedule_data.model_dump(),
        owner_id=current_user.id,
        next_run=_calculate_next_run(schedule_data.interval),
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/", response_model=List[ScheduleResponse])
def list_schedules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ForecastSchedule).filter(ForecastSchedule.owner_id == current_user.id).all()


@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ForecastSchedule).filter(ForecastSchedule.id == schedule_id, ForecastSchedule.owner_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return s


@router.patch("/{schedule_id}/toggle")
def toggle_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ForecastSchedule).filter(ForecastSchedule.id == schedule_id, ForecastSchedule.owner_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    s.is_active = not s.is_active
    db.commit()
    return {"message": f"Schedule {'activated' if s.is_active else 'paused'}", "is_active": s.is_active}


@router.post("/{schedule_id}/run-now")
def run_now(
    schedule_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_forecasts")),
):
    s = db.query(ForecastSchedule).filter(ForecastSchedule.id == schedule_id, ForecastSchedule.owner_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    from app.core.config import settings
    background_tasks.add_task(_run_scheduled_forecast, s.id, settings.DATABASE_URL)
    return {"message": "Scheduled forecast triggered"}


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = db.query(ForecastSchedule).filter(ForecastSchedule.id == schedule_id, ForecastSchedule.owner_id == current_user.id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(s)
    db.commit()
    return {"message": "Schedule deleted"}
