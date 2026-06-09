from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
import numpy as np
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.forecast import Forecast
from app.core.security import get_current_user
from app.core.roles import require_permission
from app.services.data_processor import load_dataset
from app.core.cache import get_cache, set_cache

router = APIRouter(prefix="/api/analytics", tags=["Advanced Analytics"])


@router.get("/region-wise")
def region_wise(dataset_id: int, date_column: str = "date", value_column: str = "sales", region_column: str = "region",
                db: Session = Depends(get_db), current_user: User = Depends(require_permission("view_analytics"))):
    cache_key = f"analytics:region:{dataset_id}:{current_user.id}"
    cached = get_cache(db, cache_key)
    if cached: return cached
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset: raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataset(dataset.file_path)
    if region_column not in df.columns: raise HTTPException(status_code=400, detail=f"Column '{region_column}' not found")
    df[value_column] = pd.to_numeric(df[value_column], errors="coerce").fillna(0)
    region_stats = df.groupby(region_column)[value_column].agg(total="sum", mean="mean", count="count").round(2).reset_index()
    total = region_stats["total"].sum()
    region_stats["share_pct"] = (region_stats["total"] / total * 100).round(1)
    result = {"regions": region_stats.to_dict(orient="records"), "top_region": region_stats.loc[region_stats["total"].idxmax(), region_column] if len(region_stats) > 0 else None, "total_value": round(float(total), 2)}
    set_cache(db, cache_key, result, ttl_seconds=300)
    return result


@router.get("/category-wise")
def category_wise(dataset_id: int, value_column: str = "sales", category_column: str = "product",
                  db: Session = Depends(get_db), current_user: User = Depends(require_permission("view_analytics"))):
    cache_key = f"analytics:category:{dataset_id}:{current_user.id}"
    cached = get_cache(db, cache_key)
    if cached: return cached
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset: raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataset(dataset.file_path)
    if category_column not in df.columns: raise HTTPException(status_code=400, detail=f"Column '{category_column}' not found")
    df[value_column] = pd.to_numeric(df[value_column], errors="coerce").fillna(0)
    cat_stats = df.groupby(category_column)[value_column].agg(total="sum", mean="mean", count="count").round(2).reset_index().sort_values("total", ascending=False)
    total = cat_stats["total"].sum()
    cat_stats["share_pct"] = (cat_stats["total"] / total * 100).round(1)
    result = {"categories": cat_stats.head(20).to_dict(orient="records"), "top_category": cat_stats.iloc[0][category_column] if len(cat_stats) > 0 else None, "total_categories": len(cat_stats), "total_value": round(float(total), 2)}
    set_cache(db, cache_key, result, ttl_seconds=300)
    return result


@router.get("/revenue-prediction")
def revenue_prediction(dataset_id: int, date_column: str = "date", value_column: str = "sales",
                        forecast_months: int = Query(3, ge=1, le=12),
                        db: Session = Depends(get_db), current_user: User = Depends(require_permission("view_analytics"))):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset: raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataset(dataset.file_path)
    df[date_column] = pd.to_datetime(df[date_column], errors="coerce")
    df[value_column] = pd.to_numeric(df[value_column], errors="coerce").fillna(0)
    df = df.dropna(subset=[date_column]).sort_values(date_column)
    monthly = df.groupby(df[date_column].dt.to_period("M"))[value_column].sum()
    monthly.index = monthly.index.astype(str)
    if len(monthly) < 2: raise HTTPException(status_code=400, detail="Not enough monthly data")
    values = monthly.values
    growth_rate = float(np.mean(np.diff(values) / (values[:-1] + 1e-8)))
    last_value = float(values[-1])
    predictions = [{"month": f"Month+{i}", "predicted_revenue": round(max(0, last_value * (1 + growth_rate) ** i), 2), "growth_rate_pct": round(growth_rate * 100, 2)} for i in range(1, forecast_months + 1)]
    return {"historical_monthly": [{"month": k, "revenue": round(float(v), 2)} for k, v in monthly.items()], "predictions": predictions, "avg_monthly_revenue": round(float(np.mean(values)), 2), "growth_trend": "positive" if growth_rate > 0 else "negative", "avg_growth_rate_pct": round(growth_rate * 100, 2)}


@router.get("/inventory-risk")
def inventory_risk(dataset_id: int, value_column: str = "sales", date_column: str = "date",
                   db: Session = Depends(get_db), current_user: User = Depends(require_permission("view_analytics"))):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset: raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataset(dataset.file_path)
    df[value_column] = pd.to_numeric(df[value_column], errors="coerce").fillna(0)
    values = df[value_column].values
    mean_demand, std_demand = float(np.mean(values)), float(np.std(values))
    cv = std_demand / mean_demand if mean_demand > 0 else 0
    risk_level = "high" if cv > 0.5 else "medium" if cv > 0.25 else "low"
    safety_stock = 1.65 * std_demand
    return {"risk_level": risk_level, "risk_message": f"{'High' if risk_level == 'high' else 'Moderate' if risk_level == 'medium' else 'Stable'} demand variability", "coefficient_of_variation": round(cv, 4), "mean_demand": round(mean_demand, 2), "std_demand": round(std_demand, 2), "recommended_safety_stock": round(safety_stock, 2), "recommended_reorder_point": round(mean_demand + safety_stock, 2), "demand_spikes": int(np.sum(values > mean_demand + 2 * std_demand)), "insights": [f"Average demand: {round(mean_demand, 2)} units", f"Demand variability (CV): {round(cv * 100, 1)}%", f"Recommended safety stock: {round(safety_stock, 2)} units"]}


@router.get("/global-search")
def global_search(q: str = Query(..., min_length=2), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    datasets = db.query(Dataset).filter(Dataset.owner_id == current_user.id, Dataset.name.contains(q)).limit(5).all()
    forecasts = db.query(Forecast).filter(Forecast.owner_id == current_user.id, Forecast.name.contains(q)).limit(5).all()
    return {
        "datasets": [{"id": d.id, "name": d.name, "type": "dataset", "status": d.status} for d in datasets],
        "forecasts": [{"id": f.id, "name": f.name, "type": "forecast", "status": f.status, "model": f.model_type} for f in forecasts],
        "total": len(datasets) + len(forecasts),
    }
