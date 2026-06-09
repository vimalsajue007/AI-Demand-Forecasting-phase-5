from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.core.security import get_current_user
from app.core.roles import require_permission
from app.core.cache import get_cache, set_cache
from app.ml.ai_features import (
    demand_recommendations, buying_behavior_analysis,
    demand_spike_prediction, low_stock_prediction, inventory_optimization,
)

router = APIRouter(prefix="/api/ai", tags=["Advanced AI Features"])


def _get_dataset(dataset_id: int, user_id: int, db: Session):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == user_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "processed":
        raise HTTPException(status_code=400, detail="Dataset not processed")
    return dataset


@router.get("/recommendations")
def get_recommendations(
    dataset_id: int,
    date_column: str = "date",
    value_column: str = "sales",
    product_column: Optional[str] = "product",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_analytics")),
):
    cache_key = f"ai:reco:{dataset_id}:{current_user.id}"
    cached = get_cache(db, cache_key)
    if cached:
        return cached

    dataset = _get_dataset(dataset_id, current_user.id, db)
    try:
        result = demand_recommendations(dataset.file_path, date_column, value_column, product_column)
        set_cache(db, cache_key, result, ttl_seconds=600)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/buying-behavior")
def get_buying_behavior(
    dataset_id: int,
    date_column: str = "date",
    value_column: str = "sales",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_analytics")),
):
    cache_key = f"ai:behavior:{dataset_id}:{current_user.id}"
    cached = get_cache(db, cache_key)
    if cached:
        return cached

    dataset = _get_dataset(dataset_id, current_user.id, db)
    try:
        result = buying_behavior_analysis(dataset.file_path, date_column, value_column)
        set_cache(db, cache_key, result, ttl_seconds=600)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/demand-spikes")
def get_demand_spikes(
    dataset_id: int,
    date_column: str = "date",
    value_column: str = "sales",
    lookahead_periods: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_analytics")),
):
    dataset = _get_dataset(dataset_id, current_user.id, db)
    try:
        return demand_spike_prediction(dataset.file_path, date_column, value_column, lookahead_periods)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/low-stock")
def get_low_stock_prediction(
    dataset_id: int,
    date_column: str = "date",
    value_column: str = "sales",
    current_stock: Optional[float] = None,
    reorder_lead_days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_analytics")),
):
    dataset = _get_dataset(dataset_id, current_user.id, db)
    try:
        return low_stock_prediction(dataset.file_path, date_column, value_column, current_stock, reorder_lead_days)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/inventory-optimization")
def get_inventory_optimization(
    dataset_id: int,
    date_column: str = "date",
    value_column: str = "sales",
    holding_cost_pct: float = Query(0.2, ge=0.01, le=1.0),
    ordering_cost: float = Query(100.0, ge=1.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("view_analytics")),
):
    cache_key = f"ai:eoq:{dataset_id}:{current_user.id}"
    cached = get_cache(db, cache_key)
    if cached:
        return cached

    dataset = _get_dataset(dataset_id, current_user.id, db)
    try:
        result = inventory_optimization(dataset.file_path, date_column, value_column, holding_cost_pct, ordering_cost)
        set_cache(db, cache_key, result, ttl_seconds=600)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
