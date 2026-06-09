from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.forecast import Forecast
from app.schemas.forecast import ForecastCreate, ForecastResponse
from app.core.security import get_current_user
from app.core.roles import require_permission
from app.ml.forecasting import run_forecast
from app.services.notification_service import notify_forecast_complete, notify_forecast_error
from app.services.activity_service import log_activity
from app.core.cache import invalidate_pattern

router = APIRouter(prefix="/api/forecasts", tags=["Forecasts"])

SUPPORTED_MODELS = ["linear_regression","prophet","ridge_regression","random_forest","gradient_boosting","ensemble"]


def _run_forecast_task(forecast_id: int, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    db = sessionmaker(bind=engine)()
    try:
        forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
        if not forecast:
            return
        dataset = db.query(Dataset).filter(Dataset.id == forecast.dataset_id).first()
        result = run_forecast(dataset.file_path, forecast.model_type, forecast.periods,
                              forecast.target_column, forecast.date_column, forecast.feature_columns or [])
        forecast.predictions = result["predictions"]
        forecast.historical_data = result["historical"]
        forecast.accuracy_score = result.get("r2_score")
        forecast.mae = result.get("mae")
        forecast.rmse = result.get("rmse")
        forecast.status = "completed"
        db.commit()
        notify_forecast_complete(db, forecast.owner_id, forecast.name, forecast.accuracy_score)
        invalidate_pattern(db, f"dashboard:{forecast.owner_id}")
        log_activity(db, "forecast_completed", user_id=forecast.owner_id, resource="forecast", resource_id=forecast_id)
    except Exception as e:
        forecast = db.query(Forecast).filter(Forecast.id == forecast_id).first()
        if forecast:
            forecast.status = "error"
            forecast.error_message = str(e)
            db.commit()
            notify_forecast_error(db, forecast.owner_id, forecast.name, str(e))
    finally:
        db.close()


@router.post("/", response_model=ForecastResponse, status_code=201)
def create_forecast(data: ForecastCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db),
                    current_user: User = Depends(require_permission("create_forecasts"))):
    if data.model_type not in SUPPORTED_MODELS:
        raise HTTPException(status_code=400, detail=f"Model must be one of: {', '.join(SUPPORTED_MODELS)}")
    dataset = db.query(Dataset).filter(Dataset.id == data.dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "processed":
        raise HTTPException(status_code=400, detail="Dataset not processed yet")
    forecast = Forecast(**data.model_dump(), owner_id=current_user.id, status="running")
    db.add(forecast)
    db.commit()
    db.refresh(forecast)
    log_activity(db, "forecast_created", user_id=current_user.id, resource="forecast", resource_id=forecast.id)
    from app.core.config import settings
    background_tasks.add_task(_run_forecast_task, forecast.id, settings.DATABASE_URL)
    return forecast


@router.get("/", response_model=List[ForecastResponse])
def list_forecasts(skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                   status: Optional[str] = None, model_type: Optional[str] = None, search: Optional[str] = None,
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Forecast).filter(Forecast.owner_id == current_user.id)
    if status: query = query.filter(Forecast.status == status)
    if model_type: query = query.filter(Forecast.model_type == model_type)
    if search: query = query.filter(Forecast.name.contains(search))
    return query.order_by(Forecast.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/models")
def get_supported_models(current_user: User = Depends(get_current_user)):
    return {"models": [
        {"value": "linear_regression", "label": "Linear Regression", "description": "Fast, interpretable baseline"},
        {"value": "ridge_regression", "label": "Ridge Regression", "description": "Linear with L2 regularization"},
        {"value": "random_forest", "label": "Random Forest", "description": "Ensemble tree-based model"},
        {"value": "gradient_boosting", "label": "Gradient Boosting", "description": "High accuracy boosting"},
        {"value": "prophet", "label": "Prophet (Meta)", "description": "Time-series with seasonality"},
        {"value": "ensemble", "label": "Ensemble (All Models)", "description": "Weighted combination for best accuracy"},
    ]}


@router.get("/{forecast_id}", response_model=ForecastResponse)
def get_forecast(forecast_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    f = db.query(Forecast).filter(Forecast.id == forecast_id, Forecast.owner_id == current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Forecast not found")
    return f


@router.delete("/{forecast_id}")
def delete_forecast(forecast_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(require_permission("delete_forecasts"))):
    f = db.query(Forecast).filter(Forecast.id == forecast_id, Forecast.owner_id == current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Forecast not found")
    db.delete(f)
    db.commit()
    log_activity(db, "forecast_deleted", user_id=current_user.id, resource="forecast", resource_id=forecast_id)
    return {"message": "Forecast deleted"}


@router.post("/compare")
def compare_models(dataset_id: int, target_column: str, date_column: str, periods: int = 12,
                   db: Session = Depends(get_db), current_user: User = Depends(require_permission("create_forecasts"))):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    results = []
    for model in ["linear_regression", "ridge_regression", "random_forest", "gradient_boosting"]:
        try:
            result = run_forecast(dataset.file_path, model, periods, target_column, date_column, [])
            results.append({"model": model, "r2_score": round(result.get("r2_score", 0) * 100, 2),
                             "mae": round(result.get("mae", 0), 4), "rmse": round(result.get("rmse", 0), 4),
                             "predictions": result.get("predictions", [])[:5]})
        except Exception as e:
            results.append({"model": model, "error": str(e)})
    best = max([r for r in results if "r2_score" in r], key=lambda x: x["r2_score"], default=None)
    return {"dataset_id": dataset_id, "target_column": target_column, "date_column": date_column,
            "periods": periods, "results": results, "best_model": best["model"] if best else None,
            "best_accuracy": best["r2_score"] if best else None}


@router.post("/{forecast_id}/retrain")
def retrain_forecast(forecast_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db),
                     current_user: User = Depends(require_permission("retrain_models"))):
    f = db.query(Forecast).filter(Forecast.id == forecast_id, Forecast.owner_id == current_user.id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Forecast not found")
    f.status = "running"
    f.error_message = None
    db.commit()
    log_activity(db, "forecast_retrained", user_id=current_user.id, resource="forecast", resource_id=forecast_id)
    from app.core.config import settings
    background_tasks.add_task(_run_forecast_task, f.id, settings.DATABASE_URL)
    return {"message": "Retraining started", "forecast_id": forecast_id}
