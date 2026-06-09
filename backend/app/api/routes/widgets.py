from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.db.database import get_db
from app.models.user import User
from app.models.widget import DashboardWidget
from app.core.security import get_current_user

router = APIRouter(prefix="/api/widgets", tags=["Dashboard Widgets"])

WIDGET_TYPES = ["kpi_total_sales", "kpi_accuracy", "kpi_forecasts", "kpi_datasets",
                "chart_monthly", "chart_model", "chart_region", "table_recent",
                "forecast_latest", "alert_summary"]

DEFAULT_WIDGETS = [
    {"widget_type": "kpi_total_sales", "title": "Total Sales", "position_x": 0, "position_y": 0, "width": 3, "height": 1},
    {"widget_type": "kpi_accuracy", "title": "Avg Accuracy", "position_x": 3, "position_y": 0, "width": 3, "height": 1},
    {"widget_type": "kpi_forecasts", "title": "Total Forecasts", "position_x": 6, "position_y": 0, "width": 3, "height": 1},
    {"widget_type": "kpi_datasets", "title": "Datasets", "position_x": 9, "position_y": 0, "width": 3, "height": 1},
    {"widget_type": "chart_monthly", "title": "Monthly Trends", "position_x": 0, "position_y": 1, "width": 8, "height": 2},
    {"widget_type": "chart_model", "title": "Model Performance", "position_x": 8, "position_y": 1, "width": 4, "height": 2},
]


class WidgetCreate(BaseModel):
    widget_type: str
    title: str
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 2
    config: Optional[dict] = None


class WidgetUpdate(BaseModel):
    title: Optional[str] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_visible: Optional[bool] = None
    config: Optional[dict] = None


class WidgetResponse(BaseModel):
    id: int
    widget_type: str
    title: str
    position_x: int
    position_y: int
    width: int
    height: int
    is_visible: bool
    config: Optional[dict]
    created_at: datetime
    model_config = {"from_attributes": True}


@router.get("/", response_model=List[WidgetResponse])
def get_widgets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    widgets = db.query(DashboardWidget).filter(
        DashboardWidget.owner_id == current_user.id
    ).order_by(DashboardWidget.position_y, DashboardWidget.position_x).all()

    # Create default widgets if none exist
    if not widgets:
        for w in DEFAULT_WIDGETS:
            widget = DashboardWidget(**w, owner_id=current_user.id)
            db.add(widget)
        db.commit()
        widgets = db.query(DashboardWidget).filter(
            DashboardWidget.owner_id == current_user.id
        ).order_by(DashboardWidget.position_y, DashboardWidget.position_x).all()

    return widgets


@router.post("/", response_model=WidgetResponse, status_code=201)
def create_widget(
    data: WidgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.widget_type not in WIDGET_TYPES:
        raise HTTPException(status_code=400, detail=f"Widget type must be one of: {', '.join(WIDGET_TYPES)}")
    widget = DashboardWidget(**data.model_dump(), owner_id=current_user.id)
    db.add(widget)
    db.commit()
    db.refresh(widget)
    return widget


@router.patch("/{widget_id}", response_model=WidgetResponse)
def update_widget(
    widget_id: int,
    data: WidgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    widget = db.query(DashboardWidget).filter(
        DashboardWidget.id == widget_id,
        DashboardWidget.owner_id == current_user.id
    ).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(widget, field, value)
    db.commit()
    db.refresh(widget)
    return widget


@router.delete("/{widget_id}")
def delete_widget(
    widget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    widget = db.query(DashboardWidget).filter(
        DashboardWidget.id == widget_id,
        DashboardWidget.owner_id == current_user.id
    ).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    db.delete(widget)
    db.commit()
    return {"message": "Widget deleted"}


@router.post("/reset")
def reset_widgets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(DashboardWidget).filter(DashboardWidget.owner_id == current_user.id).delete()
    for w in DEFAULT_WIDGETS:
        widget = DashboardWidget(**w, owner_id=current_user.id)
        db.add(widget)
    db.commit()
    return {"message": "Widgets reset to default"}


@router.get("/types")
def get_widget_types():
    return {"types": WIDGET_TYPES}
