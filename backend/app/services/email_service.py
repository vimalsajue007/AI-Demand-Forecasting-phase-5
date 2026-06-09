"""
Email notification service using SMTP.
Configure SMTP settings in .env file.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body: str, html_body: str = None) -> bool:
    """Send email notification. Returns True if successful."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning("SMTP not configured, skipping email")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = to_email

        msg.attach(MIMEText(body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Email failed to {to_email}: {e}")
        return False


def send_forecast_complete_email(to_email: str, forecast_name: str, accuracy: float = None):
    acc_text = f" with {round(accuracy * 100, 1)}% accuracy" if accuracy else ""
    subject = f"✅ Forecast '{forecast_name}' Completed"
    body = f"Your forecast '{forecast_name}' has been completed{acc_text}.\n\nLog in to view results."
    html = f"""
    <h2 style="color:#166534">Forecast Completed ✅</h2>
    <p>Your forecast <strong>{forecast_name}</strong> has been completed{acc_text}.</p>
    <p><a href="http://localhost:3000/forecast" style="background:#22c55e;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">View Forecast</a></p>
    """
    send_email(to_email, subject, body, html)


def send_alert_email(to_email: str, alert_name: str, message: str):
    subject = f"🔔 Alert Triggered: {alert_name}"
    body = f"Alert '{alert_name}' was triggered.\n\n{message}"
    html = f"""
    <h2 style="color:#b91c1c">Alert Triggered 🔔</h2>
    <p><strong>{alert_name}</strong></p>
    <p>{message}</p>
    <p><a href="http://localhost:3000/dashboard" style="background:#22c55e;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">View Dashboard</a></p>
    """
    send_email(to_email, subject, body, html)


def send_report_ready_email(to_email: str, forecast_name: str, report_type: str):
    subject = f"📄 Report Ready: {forecast_name}"
    body = f"Your {report_type.upper()} report for '{forecast_name}' is ready to download."
    send_email(to_email, subject, body)
