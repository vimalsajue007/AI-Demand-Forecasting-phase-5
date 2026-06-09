from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.db.database import get_db
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.models.forecast import Forecast
from app.models.dataset import Dataset
from app.core.security import get_current_user
from app.core.roles import require_role

router = APIRouter(prefix="/api/monitoring", tags=["System Monitoring"])


@router.get("/activity-logs")
def get_activity_logs(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
                       user_id: Optional[int] = None, action: Optional[str] = None, days: int = Query(7, ge=1, le=90),
                       db: Session = Depends(get_db), current_user: User = Depends(require_role("super_admin"))):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    query = db.query(ActivityLog).filter(ActivityLog.created_at >= since)
    if user_id: query = query.filter(ActivityLog.user_id == user_id)
    if action: query = query.filter(ActivityLog.action.contains(action))
    total = query.count()
    logs = query.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "logs": [{"id": l.id, "user_id": l.user_id, "action": l.action, "resource": l.resource, "method": l.method, "endpoint": l.endpoint, "status_code": l.status_code, "ip_address": l.ip_address, "response_time_ms": l.response_time_ms, "created_at": str(l.created_at)} for l in logs]}


@router.get("/user-activity/{user_id}")
def get_user_activity(user_id: int, days: int = Query(30, ge=1, le=90), db: Session = Depends(get_db),
                       current_user: User = Depends(require_role("super_admin"))):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    logs = db.query(ActivityLog).filter(ActivityLog.user_id == user_id, ActivityLog.created_at >= since).order_by(ActivityLog.created_at.desc()).limit(100).all()
    action_counts = {}
    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1
    return {"user_id": user_id, "total_actions": len(logs), "action_breakdown": action_counts, "recent_logs": [{"action": l.action, "endpoint": l.endpoint, "created_at": str(l.created_at)} for l in logs[:20]]}


@router.get("/performance")
def get_performance(days: int = Query(7, ge=1, le=30), db: Session = Depends(get_db),
                     current_user: User = Depends(require_role("super_admin"))):
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)
    logs = db.query(ActivityLog).filter(ActivityLog.created_at >= since).all()
    response_times = [l.response_time_ms for l in logs if l.response_time_ms]
    status_codes = [l.status_code for l in logs if l.status_code]
    avg_response = sum(response_times) / len(response_times) if response_times else 0
    error_count = sum(1 for c in status_codes if c >= 400)
    success_count = sum(1 for c in status_codes if c < 400)
    endpoint_stats = {}
    for log in logs:
        if log.endpoint and log.response_time_ms:
            ep = log.endpoint.split("?")[0]
            if ep not in endpoint_stats: endpoint_stats[ep] = {"count": 0, "total_ms": 0}
            endpoint_stats[ep]["count"] += 1
            endpoint_stats[ep]["total_ms"] += log.response_time_ms
    slow_endpoints = sorted([{"endpoint": k, "avg_ms": round(v["total_ms"] / v["count"]), "calls": v["count"]} for k, v in endpoint_stats.items()], key=lambda x: x["avg_ms"], reverse=True)[:10]
    return {"period_days": days, "total_requests": len(logs), "avg_response_time_ms": round(avg_response, 1), "error_rate_pct": round(error_count / len(logs) * 100, 1) if logs else 0, "success_requests": success_count, "error_requests": error_count, "slow_endpoints": slow_endpoints, "forecasts_total": db.query(Forecast).count(), "datasets_total": db.query(Dataset).count()}


@router.get("/forecast-history")
def get_forecast_history(skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    forecasts = db.query(Forecast).filter(Forecast.owner_id == current_user.id).order_by(Forecast.created_at.desc()).offset(skip).limit(limit).all()
    total = db.query(Forecast).filter(Forecast.owner_id == current_user.id).count()
    return {"total": total, "history": [{"id": f.id, "name": f.name, "model_type": f.model_type, "periods": f.periods, "status": f.status, "accuracy_score": round(f.accuracy_score * 100, 2) if f.accuracy_score else None, "mae": round(f.mae, 4) if f.mae else None, "rmse": round(f.rmse, 4) if f.rmse else None, "target_column": f.target_column, "dataset_id": f.dataset_id, "created_at": str(f.created_at)} for f in forecasts]}
