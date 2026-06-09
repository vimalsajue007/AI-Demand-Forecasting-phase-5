from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ForecastCreate(BaseModel):
    name: str
    dataset_id: int
    model_type: str
    periods: int
    target_column: str
    date_column: str
    feature_columns: Optional[List[str]] = []


class ForecastResponse(BaseModel):
    id: int
    name: str
    model_type: str
    periods: int
    target_column: str
    date_column: str
    dataset_id: int
    owner_id: int
    status: str
    accuracy_score: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    predictions: Optional[list] = None
    historical_data: Optional[list] = None
    error_message: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}
