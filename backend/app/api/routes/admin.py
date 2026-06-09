from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.forecast import Forecast
from app.core.security import get_current_user
from app.core.roles import require_role, ROLE_PERMISSIONS, get_user_role
from app.services.activity_service import log_activity

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin and get_user_role(current_user) != "super_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_datasets = db.query(Dataset).count()
    total_forecasts = db.query(Forecast).count()
    completed = db.query(Forecast).filter(Forecast.status == "completed").count()
    error = db.query(Forecast).filter(Forecast.status == "error").count()
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    recent_forecasts = db.query(Forecast).order_by(Forecast.created_at.desc()).limit(5).all()
    model_stats = db.query(Forecast.model_type, func.count(Forecast.id).label("count"), func.avg(Forecast.accuracy_score).label("avg_accuracy")).group_by(Forecast.model_type).all()
    role_breakdown = db.query(User.role, func.count(User.id).label("count")).group_by(User.role).all()
    return {
        "total_users": total_users, "active_users": active_users,
        "total_datasets": total_datasets, "total_forecasts": total_forecasts,
        "completed_forecasts": completed, "error_forecasts": error,
        "success_rate": round(completed / total_forecasts * 100, 1) if total_forecasts else 0,
        "model_stats": [{"model": m.model_type, "count": m.count, "avg_accuracy": round(m.avg_accuracy * 100, 1) if m.avg_accuracy else 0} for m in model_stats],
        "recent_users": [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "created_at": str(u.created_at)[:10]} for u in recent_users],
        "recent_forecasts": [{"id": f.id, "name": f.name, "model": f.model_type, "status": f.status, "created_at": str(f.created_at)[:10], "owner_id": f.owner_id} for f in recent_forecasts],
        "role_breakdown": [{"role": r.role or "analyst", "count": r.count} for r in role_breakdown],
    }


@router.get("/users")
def list_users(skip: int = 0, limit: int = 20, search: str = "", role: Optional[str] = None,
               db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    query = db.query(User)
    if search: query = query.filter(User.username.contains(search) | User.email.contains(search))
    if role: query = query.filter(User.role == role)
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    result = []
    for u in users:
        result.append({
            "id": u.id, "username": u.username, "email": u.email, "full_name": u.full_name,
            "is_active": u.is_active, "is_admin": u.is_admin, "role": u.role or "analyst",
            "created_at": str(u.created_at)[:10],
            "dataset_count": db.query(Dataset).filter(Dataset.owner_id == u.id).count(),
            "forecast_count": db.query(Forecast).filter(Forecast.owner_id == u.id).count(),
        })
    return {"total": total, "users": result}


@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, role: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    if role not in ["super_admin", "analyst", "viewer"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id: raise HTTPException(status_code=400, detail="Cannot change your own role")
    user.role = role
    user.is_admin = (role == "super_admin")
    db.commit()
    log_activity(db, f"role_changed:{role}", user_id=admin.id, resource="user", resource_id=user_id)
    return {"message": f"Role updated to {role}", "role": role}


@router.get("/roles")
def get_roles(admin: User = Depends(require_admin)):
    return {"roles": [
        {"value": "super_admin", "label": "Super Admin", "description": "Full system access", "permissions": ROLE_PERMISSIONS["super_admin"]},
        {"value": "analyst", "label": "Analyst", "description": "Create and manage forecasts", "permissions": ROLE_PERMISSIONS["analyst"]},
        {"value": "viewer", "label": "Viewer", "description": "View reports only", "permissions": ROLE_PERMISSIONS["viewer"]},
    ]}


@router.patch("/users/{user_id}/toggle-active")
def toggle_active(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id: raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    user.is_active = not user.is_active
    db.commit()
    log_activity(db, f"user_{'activated' if user.is_active else 'deactivated'}", user_id=admin.id, resource="user", resource_id=user_id)
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}", "is_active": user.is_active}


@router.patch("/users/{user_id}/toggle-admin")
def toggle_admin(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id: raise HTTPException(status_code=400, detail="Cannot change your own admin status")
    user.is_admin = not user.is_admin
    user.role = "super_admin" if user.is_admin else "analyst"
    db.commit()
    return {"message": f"Admin {'granted' if user.is_admin else 'revoked'}", "is_admin": user.is_admin}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id: raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db.delete(user)
    db.commit()
    log_activity(db, "user_deleted", user_id=admin.id, resource="user", resource_id=user_id)
    return {"message": "User deleted"}


@router.get("/datasets")
def list_all_datasets(skip: int = 0, limit: int = 20, search: str = "", db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    query = db.query(Dataset)
    if search: query = query.filter(Dataset.name.contains(search))
    total = query.count()
    datasets = query.order_by(Dataset.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "datasets": [{"id": d.id, "name": d.name, "filename": d.filename, "rows_count": d.rows_count, "status": d.status, "owner_id": d.owner_id, "created_at": str(d.created_at)[:10]} for d in datasets]}


@router.get("/forecasts")
def list_all_forecasts(skip: int = 0, limit: int = 20, status: str = "", db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    query = db.query(Forecast)
    if status: query = query.filter(Forecast.status == status)
    total = query.count()
    forecasts = query.order_by(Forecast.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "forecasts": [{"id": f.id, "name": f.name, "model_type": f.model_type, "status": f.status, "periods": f.periods, "accuracy_score": round(f.accuracy_score * 100, 1) if f.accuracy_score else None, "owner_id": f.owner_id, "dataset_id": f.dataset_id, "created_at": str(f.created_at)[:10]} for f in forecasts]}
