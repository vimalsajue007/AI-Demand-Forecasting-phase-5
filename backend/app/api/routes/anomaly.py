from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.anomaly import AnomalyDetection
from app.core.security import get_current_user
from app.core.roles import require_permission
from app.ml.anomaly import detect_anomalies

router = APIRouter(prefix="/api/anomalies", tags=["Anomaly Detection"])


class AnomalyRequest(BaseModel):
    dataset_id: int
    date_column: str
    target_column: str
    sensitivity: float = 1.5


@router.post("/detect")
def detect(request: AnomalyRequest, db: Session = Depends(get_db),
           current_user: User = Depends(require_permission("detect_anomalies"))):
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset: raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "processed": raise HTTPException(status_code=400, detail="Dataset not processed")
    try:
        result = detect_anomalies(dataset.file_path, request.date_column, request.target_column, request.sensitivity)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    record = AnomalyDetection(dataset_id=dataset.id, owner_id=current_user.id, target_column=request.target_column,
                               date_column=request.date_column, anomalies=result["anomalies"],
                               anomaly_count=result["anomaly_count"], severity=result["severity"], summary=result["summary"])
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "dataset_id": record.dataset_id, "target_column": record.target_column,
            "anomaly_count": record.anomaly_count, "severity": record.severity, "summary": record.summary,
            "anomalies": result["anomalies"], "statistics": result["statistics"],
            "seasonal_insights": result["seasonal_insights"], "created_at": str(record.created_at)}


@router.get("/")
def list_anomalies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = db.query(AnomalyDetection).filter(AnomalyDetection.owner_id == current_user.id).order_by(AnomalyDetection.created_at.desc()).all()
    return [{"id": r.id, "dataset_id": r.dataset_id, "target_column": r.target_column, "anomaly_count": r.anomaly_count, "severity": r.severity, "summary": r.summary, "created_at": str(r.created_at)} for r in records]


@router.get("/{anomaly_id}")
def get_anomaly(anomaly_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(AnomalyDetection).filter(AnomalyDetection.id == anomaly_id, AnomalyDetection.owner_id == current_user.id).first()
    if not record: raise HTTPException(status_code=404, detail="Not found")
    return {"id": record.id, "dataset_id": record.dataset_id, "target_column": record.target_column, "anomaly_count": record.anomaly_count, "severity": record.severity, "summary": record.summary, "anomalies": record.anomalies, "created_at": str(record.created_at)}
