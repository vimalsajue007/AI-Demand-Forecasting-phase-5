from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta, timezone
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.forecast import Forecast
from app.core.security import get_current_user
from app.core.cache import get_cache, set_cache

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(date_from: Optional[str] = None, date_to: Optional[str] = None,
                         category: Optional[str] = None, region: Optional[str] = None,
                         db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cache_key = f"dashboard:{current_user.id}:{date_from}:{date_to}:{category}:{region}"
    cached = get_cache(db, cache_key)
    if cached:
        cached["from_cache"] = True
        return cached

    total_datasets = db.query(Dataset).filter(Dataset.owner_id == current_user.id).count()
    total_forecasts = db.query(Forecast).filter(Forecast.owner_id == current_user.id).count()
    forecasts = db.query(Forecast).filter(Forecast.owner_id == current_user.id, Forecast.status == "completed").all()

    accuracies = [f.accuracy_score for f in forecasts if f.accuracy_score is not None]
    avg_accuracy = round(sum(accuracies) / len(accuracies) * 100, 2) if accuracies else 0

    total_sales = 0.0
    monthly_data, product_data, region_data = {}, {}, {}

    for forecast in forecasts:
        if not forecast.historical_data:
            continue
        for row in forecast.historical_data:
            if date_from and "ds" in row and str(row["ds"]) < date_from: continue
            if date_to and "ds" in row and str(row["ds"]) > date_to: continue
            if "ds" in row and "y" in row:
                month_key = str(row["ds"])[:7]
                val = float(row["y"])
                monthly_data[month_key] = monthly_data.get(month_key, 0) + val
                total_sales += val
            if "product" in row and "y" in row and (not category or row.get("product") == category):
                product_data[row["product"]] = product_data.get(row["product"], 0) + float(row["y"])
            if "region" in row and "y" in row and (not region or row.get("region") == region):
                region_data[row["region"]] = region_data.get(row["region"], 0) + float(row["y"])

    monthly_trends = [{"month": k, "sales": round(v, 2)} for k, v in sorted(monthly_data.items())[-12:]]
    top_products = sorted([{"product": k, "sales": round(v, 2)} for k, v in product_data.items()], key=lambda x: x["sales"], reverse=True)[:10]
    region_breakdown = sorted([{"region": k, "sales": round(v, 2)} for k, v in region_data.items()], key=lambda x: x["sales"], reverse=True)

    recent_forecasts = [
        {"id": f.id, "name": f.name, "model": f.model_type,
         "accuracy": round(f.accuracy_score * 100, 2) if f.accuracy_score else None,
         "mae": round(f.mae, 4) if f.mae else None, "rmse": round(f.rmse, 4) if f.rmse else None,
         "status": f.status, "created_at": str(f.created_at)}
        for f in sorted(forecasts, key=lambda x: x.created_at, reverse=True)[:5]
    ]

    model_performance = {}
    for f in forecasts:
        m = f.model_type
        if m not in model_performance:
            model_performance[m] = {"count": 0, "accuracy_sum": 0}
        model_performance[m]["count"] += 1
        if f.accuracy_score:
            model_performance[m]["accuracy_sum"] += f.accuracy_score

    model_breakdown = [
        {"model": k, "count": v["count"], "avg_accuracy": round(v["accuracy_sum"] / v["count"] * 100, 1) if v["count"] else 0}
        for k, v in model_performance.items()
    ]

    result = {
        "total_datasets": total_datasets, "total_forecasts": total_forecasts,
        "total_sales": round(total_sales, 2), "avg_accuracy": avg_accuracy,
        "monthly_trends": monthly_trends, "top_products": top_products,
        "region_breakdown": region_breakdown, "recent_forecasts": recent_forecasts,
        "model_breakdown": model_breakdown,
        "filters_applied": {"date_from": date_from, "date_to": date_to, "category": category, "region": region},
        "from_cache": False,
    }
    set_cache(db, cache_key, result, ttl_seconds=180)
    return result


@router.get("/activity")
def get_recent_activity(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    recent = db.query(Forecast).filter(Forecast.owner_id == current_user.id).order_by(Forecast.created_at.desc()).limit(limit).all()
    return [{"id": f.id, "type": "forecast", "name": f.name, "model": f.model_type, "status": f.status,
             "accuracy": round(f.accuracy_score * 100, 1) if f.accuracy_score else None, "created_at": str(f.created_at)} for f in recent]


@router.get("/realtime")
def get_realtime_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    return {
        "forecasts_last_24h": db.query(Forecast).filter(Forecast.owner_id == current_user.id, Forecast.created_at >= last_24h).count(),
        "forecasts_running": db.query(Forecast).filter(Forecast.owner_id == current_user.id, Forecast.status == "running").count(),
        "forecasts_last_7d": db.query(Forecast).filter(Forecast.owner_id == current_user.id, Forecast.created_at >= last_7d).count(),
        "completed_today": db.query(Forecast).filter(Forecast.owner_id == current_user.id, Forecast.status == "completed", Forecast.created_at >= last_24h).count(),
        "server_time": str(now),
    }
