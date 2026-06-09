from fastapi import Depends, HTTPException, status
from app.models.user import User
from app.core.security import get_current_user

ROLES = {"super_admin": 3, "analyst": 2, "viewer": 1}

ROLE_PERMISSIONS = {
    "super_admin": [
        "manage_users", "manage_roles", "view_all_data",
        "create_forecasts", "delete_forecasts", "upload_datasets",
        "delete_datasets", "view_reports", "download_reports",
        "view_admin", "view_analytics", "manage_system",
        "detect_anomalies", "retrain_models",
    ],
    "analyst": [
        "create_forecasts", "delete_forecasts", "upload_datasets",
        "delete_datasets", "view_reports", "download_reports",
        "view_analytics", "detect_anomalies", "retrain_models",
    ],
    "viewer": ["view_reports", "view_analytics"],
}


def has_permission(user: User, permission: str) -> bool:
    role = "super_admin" if user.is_admin else (user.role or "viewer")
    return permission in ROLE_PERMISSIONS.get(role, [])


def require_permission(permission: str):
    def dependency(current_user: User = Depends(get_current_user)):
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required: {permission}. Your role: {current_user.role}",
            )
        return current_user
    return dependency


def require_role(min_role: str):
    def dependency(current_user: User = Depends(get_current_user)):
        user_role = "super_admin" if current_user.is_admin else (current_user.role or "viewer")
        if ROLES.get(user_role, 0) < ROLES.get(min_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient role. Required: {min_role}. Your role: {user_role}",
            )
        return current_user
    return dependency


def get_user_role(user: User) -> str:
    return "super_admin" if user.is_admin else (user.role or "viewer")
