from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import httpx

from app.db.database import get_db
from app.models.user import User
from app.models.integration import Integration, WebhookLog
from app.core.security import get_current_user

router = APIRouter(prefix="/api/integrations", tags=["Enterprise Integrations"])


class IntegrationCreate(BaseModel):
    name: str
    integration_type: str
    endpoint_url: Optional[str] = None
    api_key: Optional[str] = None
    headers: Optional[dict] = None
    payload_template: Optional[str] = None
    config: Optional[dict] = None


class IntegrationResponse(BaseModel):
    id: int
    name: str
    integration_type: str
    endpoint_url: Optional[str]
    is_active: bool
    last_triggered: Optional[datetime]
    trigger_count: int
    created_at: datetime
    model_config = {"from_attributes": True}


async def _trigger_webhook(integration_id: int, event_type: str, payload: dict, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        integration = db.query(Integration).filter(Integration.id == integration_id).first()
        if not integration or not integration.endpoint_url:
            return

        headers = integration.headers or {"Content-Type": "application/json"}
        if integration.api_key:
            headers["Authorization"] = f"Bearer {integration.api_key}"

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(integration.endpoint_url, json=payload, headers=headers)

        log = WebhookLog(
            integration_id=integration.id, event_type=event_type,
            payload=payload, response_status=response.status_code,
            response_body=response.text[:500], success=response.status_code < 400,
        )
        db.add(log)
        integration.last_triggered = datetime.now()
        integration.trigger_count += 1
        db.commit()
    except Exception as e:
        log = WebhookLog(integration_id=integration_id, event_type=event_type,
                         payload=payload, success=False, response_body=str(e))
        db.add(log)
        db.commit()
    finally:
        db.close()


@router.post("/", response_model=IntegrationResponse, status_code=201)
def create_integration(
    data: IntegrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_types = ["webhook", "erp", "inventory", "external_api"]
    if data.integration_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Type must be one of: {', '.join(valid_types)}")
    integration = Integration(**data.model_dump(), owner_id=current_user.id)
    db.add(integration)
    db.commit()
    db.refresh(integration)
    return integration


@router.get("/", response_model=List[IntegrationResponse])
def list_integrations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Integration).filter(Integration.owner_id == current_user.id).all()


@router.get("/{integration_id}", response_model=IntegrationResponse)
def get_integration(integration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Integration).filter(Integration.id == integration_id, Integration.owner_id == current_user.id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Integration not found")
    return i


@router.patch("/{integration_id}/toggle")
def toggle_integration(integration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Integration).filter(Integration.id == integration_id, Integration.owner_id == current_user.id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    i.is_active = not i.is_active
    db.commit()
    return {"message": f"Integration {'enabled' if i.is_active else 'disabled'}", "is_active": i.is_active}


@router.post("/{integration_id}/test")
async def test_integration(
    integration_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    i = db.query(Integration).filter(Integration.id == integration_id, Integration.owner_id == current_user.id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    from app.core.config import settings
    test_payload = {"event": "test", "timestamp": str(datetime.now()), "source": "ForecastIQ"}
    background_tasks.add_task(_trigger_webhook, i.id, "test", test_payload, settings.DATABASE_URL)
    return {"message": "Test webhook triggered"}


@router.get("/{integration_id}/logs")
def get_webhook_logs(integration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Integration).filter(Integration.id == integration_id, Integration.owner_id == current_user.id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    logs = db.query(WebhookLog).filter(WebhookLog.integration_id == integration_id).order_by(WebhookLog.created_at.desc()).limit(20).all()
    return [{"id": l.id, "event_type": l.event_type, "response_status": l.response_status, "success": l.success, "created_at": str(l.created_at)} for l in logs]


@router.delete("/{integration_id}")
def delete_integration(integration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    i = db.query(Integration).filter(Integration.id == integration_id, Integration.owner_id == current_user.id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(i)
    db.commit()
    return {"message": "Integration deleted"}
