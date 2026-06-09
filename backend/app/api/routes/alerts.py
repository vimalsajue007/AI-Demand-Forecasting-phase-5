from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.models.user import User
from app.models.alert import AlertConfig, AlertLog
from app.models.dataset import Dataset
from app.core.security import get_current_user
from app.services.data_processor import load_dataset

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


class AlertConfigCreate(BaseModel):
    name: str
    alert_type: str
    threshold_value: Optional[float] = None
    threshold_operator: Optional[str] = None
    dataset_id: Optional[int] = None
    target_column: Optional[str] = None
    email_enabled: bool = False
    in_app_enabled: bool = True
    email_address: Optional[str] = None
    config: Optional[dict] = None


class AlertConfigResponse(BaseModel):
    id: int
    name: str
    alert_type: str
    threshold_value: Optional[float]
    threshold_operator: Optional[str]
    email_enabled: bool
    in_app_enabled: bool
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class AlertLogResponse(BaseModel):
    id: int
    title: str
    message: str
    alert_type: str
    triggered_value: Optional[float]
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


@router.post("/configs", response_model=AlertConfigResponse, status_code=201)
def create_alert_config(
    alert_data: AlertConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_types = ["threshold", "forecast_fail", "report_complete", "low_stock", "demand_spike"]
    if alert_data.alert_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Alert type must be one of: {', '.join(valid_types)}")

    alert = AlertConfig(**alert_data.model_dump(), owner_id=current_user.id)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/configs", response_model=List[AlertConfigResponse])
def list_alert_configs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AlertConfig).filter(AlertConfig.owner_id == current_user.id).all()


@router.patch("/configs/{alert_id}/toggle")
def toggle_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(AlertConfig).filter(AlertConfig.id == alert_id, AlertConfig.owner_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active = not alert.is_active
    db.commit()
    return {"message": f"Alert {'enabled' if alert.is_active else 'disabled'}", "is_active": alert.is_active}


@router.delete("/configs/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(AlertConfig).filter(AlertConfig.id == alert_id, AlertConfig.owner_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}


@router.post("/configs/{alert_id}/check")
def check_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger an alert check."""
    alert = db.query(AlertConfig).filter(AlertConfig.id == alert_id, AlertConfig.owner_id == current_user.id).first()
    if not alert or not alert.is_active:
        raise HTTPException(status_code=404, detail="Alert not found or inactive")
    if not alert.dataset_id or not alert.target_column:
        raise HTTPException(status_code=400, detail="Alert needs dataset and target column")

    dataset = db.query(Dataset).filter(Dataset.id == alert.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = load_dataset(dataset.file_path)
    import pandas as pd
    col_data = pd.to_numeric(df[alert.target_column], errors="coerce").dropna()
    current_value = float(col_data.iloc[-1]) if len(col_data) > 0 else 0

    triggered = False
    if alert.threshold_value is not None:
        ops = {"gt": current_value > alert.threshold_value, "lt": current_value < alert.threshold_value,
               "gte": current_value >= alert.threshold_value, "lte": current_value <= alert.threshold_value}
        triggered = ops.get(alert.threshold_operator, False)

    if triggered:
        log = AlertLog(
            alert_config_id=alert.id, owner_id=current_user.id,
            title=f"Alert: {alert.name}", alert_type=alert.alert_type,
            message=f"Value {current_value} {alert.threshold_operator} threshold {alert.threshold_value}",
            triggered_value=current_value,
        )
        db.add(log)
        db.commit()
        if alert.email_enabled and alert.email_address:
            from app.services.email_service import send_alert_email
            send_alert_email(alert.email_address, alert.name, log.message)

    return {"triggered": triggered, "current_value": current_value, "threshold": alert.threshold_value}


@router.get("/logs", response_model=List[AlertLogResponse])
def get_alert_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AlertLog).filter(AlertLog.owner_id == current_user.id).order_by(AlertLog.created_at.desc()).limit(50).all()


@router.patch("/logs/{log_id}/read")
def mark_log_read(log_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    log = db.query(AlertLog).filter(AlertLog.id == log_id, AlertLog.owner_id == current_user.id).first()
    if log:
        log.is_read = True
        db.commit()
    return {"message": "Marked as read"}
