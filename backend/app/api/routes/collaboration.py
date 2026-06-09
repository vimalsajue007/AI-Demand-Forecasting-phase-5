import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from app.db.database import get_db
from app.models.user import User
from app.models.forecast import Forecast
from app.models.collaboration import ForecastComment, ForecastRevision, SharedReport
from app.core.security import get_current_user

router = APIRouter(prefix="/api/collaboration", tags=["Collaboration"])


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None


class CommentUpdate(BaseModel):
    content: str


# ── Comments ──────────────────────────────────────────────────────────────────
@router.post("/forecasts/{forecast_id}/comments", status_code=201)
def add_comment(forecast_id: int, data: CommentCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    comment = ForecastComment(
        forecast_id=forecast_id, user_id=current_user.id,
        content=data.content, parent_id=data.parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _format_comment(comment, current_user)


@router.get("/forecasts/{forecast_id}/comments")
def get_comments(forecast_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    comments = db.query(ForecastComment).filter(
        ForecastComment.forecast_id == forecast_id,
        ForecastComment.parent_id == None,
    ).order_by(ForecastComment.created_at.asc()).all()
    result = []
    for c in comments:
        fc = _format_comment(c, current_user)
        replies = db.query(ForecastComment).filter(ForecastComment.parent_id == c.id).all()
        fc["replies"] = [_format_comment(r, current_user) for r in replies]
        result.append(fc)
    return result


@router.patch("/comments/{comment_id}")
def update_comment(comment_id: int, data: CommentUpdate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    comment = db.query(ForecastComment).filter(
        ForecastComment.id == comment_id, ForecastComment.user_id == current_user.id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.content = data.content
    comment.is_edited = True
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _format_comment(comment, current_user)


@router.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    comment = db.query(ForecastComment).filter(
        ForecastComment.id == comment_id, ForecastComment.user_id == current_user.id
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}


# ── Revisions ─────────────────────────────────────────────────────────────────
@router.get("/forecasts/{forecast_id}/revisions")
def get_revisions(forecast_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    revisions = db.query(ForecastRevision).filter(
        ForecastRevision.forecast_id == forecast_id
    ).order_by(ForecastRevision.version.desc()).all()
    return [{"id": r.id, "version": r.version, "model_type": r.model_type,
             "accuracy_score": r.accuracy_score, "changes": r.changes,
             "user_id": r.user_id, "created_at": str(r.created_at)} for r in revisions]


# ── Shared Reports ─────────────────────────────────────────────────────────────
@router.post("/forecasts/{forecast_id}/share")
def create_share_link(forecast_id: int, expires_days: int = 7, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    forecast = db.query(Forecast).filter(
        Forecast.id == forecast_id, Forecast.owner_id == current_user.id
    ).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=expires_days)
    shared = SharedReport(
        forecast_id=forecast_id, owner_id=current_user.id,
        share_token=token, expires_at=expires,
    )
    db.add(shared)
    db.commit()
    return {"share_token": token, "share_url": f"/shared/{token}", "expires_at": str(expires)}


@router.get("/shared/{token}")
def get_shared_report(token: str, db: Session = Depends(get_db)):
    shared = db.query(SharedReport).filter(
        SharedReport.share_token == token, SharedReport.is_active == True
    ).first()
    if not shared:
        raise HTTPException(status_code=404, detail="Shared report not found or expired")
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if shared.expires_at and shared.expires_at < now:
        raise HTTPException(status_code=410, detail="Share link has expired")
    shared.view_count += 1
    db.commit()
    forecast = db.query(Forecast).filter(Forecast.id == shared.forecast_id).first()
    return {
        "forecast_id": forecast.id, "name": forecast.name,
        "model_type": forecast.model_type, "periods": forecast.periods,
        "accuracy_score": forecast.accuracy_score, "mae": forecast.mae,
        "predictions": forecast.predictions, "status": forecast.status,
        "view_count": shared.view_count,
    }


@router.get("/forecasts/{forecast_id}/shares")
def get_share_links(forecast_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    shares = db.query(SharedReport).filter(
        SharedReport.forecast_id == forecast_id,
        SharedReport.owner_id == current_user.id,
    ).all()
    return [{"id": s.id, "share_token": s.share_token[:8] + "...",
             "view_count": s.view_count, "expires_at": str(s.expires_at),
             "is_active": s.is_active, "created_at": str(s.created_at)} for s in shares]


def _format_comment(comment, current_user):
    return {
        "id": comment.id, "forecast_id": comment.forecast_id,
        "content": comment.content, "parent_id": comment.parent_id,
        "is_edited": comment.is_edited, "user_id": comment.user_id,
        "is_mine": comment.user_id == current_user.id,
        "created_at": str(comment.created_at),
        "updated_at": str(comment.updated_at),
    }
