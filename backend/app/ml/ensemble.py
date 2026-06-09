import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.ml.forecasting import _run_sklearn_model, _detect_frequency


def run_ensemble_forecast(file_path, periods, target_column, date_column, feature_columns):
    models = ["linear_regression", "ridge_regression", "random_forest", "gradient_boosting"]
    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    df[date_column] = pd.to_datetime(df[date_column], errors="coerce")
    df = df.dropna(subset=[date_column, target_column]).sort_values(date_column)

    results = []
    weights = []
    for model in models:
        try:
            result = _run_sklearn_model(df, date_column, target_column, feature_columns, periods, model)
            r2 = result.get("r2_score", 0)
            results.append(result)
            weights.append(max(r2, 0.01))
        except Exception:
            pass

    if not results:
        raise ValueError("All models failed")

    total_weight = sum(weights)
    norm_weights = [w / total_weight for w in weights]

    num_preds = len(results[0]["predictions"])
    ensemble_preds = []
    for i in range(num_preds):
        weighted_yhat = sum(
            results[j]["predictions"][i]["yhat"] * norm_weights[j]
            for j in range(len(results))
            if i < len(results[j]["predictions"])
        )
        ensemble_preds.append({"ds": results[0]["predictions"][i]["ds"], "yhat": round(weighted_yhat, 2)})

    ensemble_r2 = sum(results[j].get("r2_score", 0) * norm_weights[j] for j in range(len(results)))
    ensemble_mae = sum(results[j].get("mae", 0) * norm_weights[j] for j in range(len(results)))
    ensemble_rmse = sum(results[j].get("rmse", 0) * norm_weights[j] for j in range(len(results)))

    return {
        "predictions": ensemble_preds,
        "historical": results[0]["historical"],
        "r2_score": round(ensemble_r2, 4),
        "mae": round(ensemble_mae, 4),
        "rmse": round(ensemble_rmse, 4),
        "model_contributions": [
            {"model": models[j], "weight": round(norm_weights[j] * 100, 1), "r2_score": round(results[j].get("r2_score", 0), 4)}
            for j in range(len(results))
        ],
    }
