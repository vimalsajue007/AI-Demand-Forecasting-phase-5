"""
Notification service — creates in-app notifications and optionally sends emails.
"""
from sqlalchemy.orm import Session
from app.models.notification import Notification
from typing import Optional


def _create_notification(db: Session, user_id: int, title: str, message: str, type: str = "info"):
    try:
        notif = Notification(user_id=user_id, title=title, message=message, type=type)
        db.add(notif)
        db.commit()
    except Exception:
        db.rollback()


def create_notification(db: Session, user_id: int, title: str, message: str, type: str = "info"):
    _create_notification(db, user_id, title, message, type)


def notify_forecast_complete(db: Session, user_id: int, forecast_name: str, accuracy: Optional[float] = None):
    acc = f" — {round(accuracy * 100, 1)}% R² accuracy" if accuracy else ""
    _create_notification(db, user_id, "Forecast Completed ✅",
                         f"'{forecast_name}' completed{acc}.", "success")


def notify_forecast_error(db: Session, user_id: int, forecast_name: str, error: str):
    _create_notification(db, user_id, "Forecast Failed ❌",
                         f"'{forecast_name}' failed: {error[:100]}", "error")


def notify_report_generated(db: Session, user_id: int, forecast_name: str, report_type: str):
    _create_notification(db, user_id, "Report Ready 📄",
                         f"{report_type.upper()} report for '{forecast_name}' is ready.", "info")


def notify_alert_triggered(db: Session, user_id: int, alert_name: str, message: str):
    _create_notification(db, user_id, f"Alert: {alert_name} 🔔", message, "warning")


def notify_schedule_complete(db: Session, user_id: int, schedule_name: str):
    _create_notification(db, user_id, "Scheduled Forecast Done ⏰",
                         f"Auto forecast for '{schedule_name}' completed.", "success")
