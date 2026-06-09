from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.models.scenario import ForecastScenario
from app.core.security import get_current_user
from app.ml.forecasting import run_forecast
 
router = APIRouter(prefix="/api/scenarios", tags=["Scenario Planning"])
 
 
class ScenarioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    dataset_id: int
    date_column: str = "date"
    target_column: str = "sales"
    periods: int = 12
    model_type: str = "linear_regression"
    variables: dict = {}
    model_config = {"protected_namespaces": ()}
 
 
class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_saved: Optional[bool] = None
 
 
@router.post("/", status_code=201)
def create_scenario(
    data: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == data.dataset_id, Dataset.owner_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "processed":
        raise HTTPException(status_code=400, detail="Dataset not processed")
 
    scenario = ForecastScenario(
        name=data.name, description=data.description,
        owner_id=current_user.id, dataset_id=data.dataset_id,
        variables=data.variables, status="running",
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
 
    try:
        base_result = run_forecast(
            dataset.file_path, data.model_type, data.periods,
            data.target_column, data.date_column, []
        )
        sales_growth  = float(data.variables.get("sales_growth", 0)) / 100
        seasonality   = float(data.variables.get("seasonality", 1.0))
        demand_factor = float(data.variables.get("demand_factor", 1.0))
        price_change  = float(data.variables.get("price_change", 0)) / 100
        cost_reduction= float(data.variables.get("cost_reduction", 0)) / 100
 
        base_preds = base_result.get("predictions", [])
        adjusted_preds = []
        for p in base_preds:
            multiplier = (1 + sales_growth) * seasonality * demand_factor * (1 + price_change)
            adjusted_preds.append({
                "ds": p["ds"],
                "yhat": round(p["yhat"] * multiplier, 2),
                "yhat_base": p["yhat"],
            })
 
        base_total = sum(p["yhat"] for p in base_preds)
        adj_total  = sum(p["yhat"] for p in adjusted_preds)
        change_pct = round((adj_total - base_total) / max(base_total, 1) * 100, 2)
 
        scenario.results = {
            "base_predictions": base_preds,
            "adjusted_predictions": adjusted_preds,
            "base_total": round(base_total, 2),
            "adjusted_total": round(adj_total, 2),
            "change_pct": change_pct,
            "variables_applied": data.variables,
            "r2_score": base_result.get("r2_score"),
            "mae": base_result.get("mae"),
        }
        scenario.status = "completed"
        db.commit()
    except Exception as e:
        scenario.status = "error"
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))
 
    return _fmt(scenario)
 
 
@router.get("/")
def list_scenarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(ForecastScenario).filter(
        ForecastScenario.owner_id == current_user.id
    ).order_by(ForecastScenario.created_at.desc()).all()
    return [_fmt(s) for s in rows]
 
 
@router.get("/{scenario_id}")
def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(ForecastScenario).filter(
        ForecastScenario.id == scenario_id,
        ForecastScenario.owner_id == current_user.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return _fmt(s)
 
 
@router.post("/compare")
def compare_scenarios(
    scenario_ids: List[int] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare multiple scenarios side by side."""
    if len(scenario_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 scenario IDs")
 
    scenarios = db.query(ForecastScenario).filter(
        ForecastScenario.id.in_(scenario_ids),
        ForecastScenario.owner_id == current_user.id,
    ).all()
 
    completed = [s for s in scenarios if s.status == "completed" and s.results]
    if len(completed) < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 2 completed scenarios. Found {len(completed)}.",
        )
 
    result_scenarios = []
    for s in completed:
        preds = s.results.get("adjusted_predictions", [])
        result_scenarios.append({
            "id": s.id,
            "name": s.name,
            "variables": s.variables or {},
            "adjusted_total": s.results.get("adjusted_total", 0),
            "base_total": s.results.get("base_total", 0),
            "change_pct": s.results.get("change_pct", 0),
            "predictions": [{"ds": p["ds"], "yhat": p["yhat"]} for p in preds],
        })
 
    return {"scenarios": result_scenarios}
 
 
@router.patch("/{scenario_id}")
def update_scenario(
    scenario_id: int,
    data: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(ForecastScenario).filter(
        ForecastScenario.id == scenario_id,
        ForecastScenario.owner_id == current_user.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    return _fmt(s)
 
 
@router.delete("/{scenario_id}")
def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    s = db.query(ForecastScenario).filter(
        ForecastScenario.id == scenario_id,
        ForecastScenario.owner_id == current_user.id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"message": "Scenario deleted"}
 
 
def _fmt(s):
    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "dataset_id": s.dataset_id,
        "variables": s.variables,
        "results": s.results,
        "status": s.status,
        "is_saved": s.is_saved,
        "owner_id": s.owner_id,
        "created_at": str(s.created_at),
    }