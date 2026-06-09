from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog
from typing import Optional


def log_activity(
    db: Session, action: str, user_id: Optional[int] = None,
    resource: Optional[str] = None, resource_id: Optional[int] = None,
    method: Optional[str] = None, endpoint: Optional[str] = None,
    status_code: Optional[int] = None, ip_address: Optional[str] = None,
    details: Optional[dict] = None, response_time_ms: Optional[int] = None,
):
    try:
        log = ActivityLog(
            user_id=user_id, action=action, resource=resource,
            resource_id=resource_id, method=method, endpoint=endpoint,
            status_code=status_code, ip_address=ip_address,
            details=details, response_time_ms=response_time_ms,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
