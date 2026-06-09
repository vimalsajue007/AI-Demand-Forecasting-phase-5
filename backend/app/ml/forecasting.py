import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


def run_forecast(file_path, model_type, periods, target_column, date_column, feature_columns):
    if model_type == "ensemble":
        from app.ml.ensemble import run_ensemble_forecast
        return run_ensemble_forecast(file_path, periods, target_column, date_column, feature_columns)

    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    df[date_column] = pd.to_datetime(df[date_column], errors="coerce")
    df = df.dropna(subset=[date_column, target_column]).sort_values(date_column)

    if model_type == "prophet":
        return _run_prophet(df, date_column, target_column, periods)
    return _run_sklearn_model(df, date_column, target_column, feature_columns, periods, model_type)


def _run_prophet(df, date_column, target_column, periods):
    prophet_df = df[[date_column, target_column]].rename(columns={date_column: "ds", target_column: "y"})
    prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])
    prophet_df["y"] = pd.to_numeric(prophet_df["y"], errors="coerce")
    prophet_df = prophet_df.dropna()
    try:
        from prophet import Prophet
        train_size = max(int(len(prophet_df) * 0.8), len(prophet_df) - 20)
        train_df = prophet_df.iloc[:train_size]
        test_df = prophet_df.iloc[train_size:]
        model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
        model.fit(train_df)
        metrics = {}
        if len(test_df) > 0:
            test_forecast = model.predict(test_df[["ds"]])
            metrics = _compute_metrics(test_df["y"].values, test_forecast["yhat"].values)
        full_model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
        full_model.fit(prophet_df)
        future = full_model.make_future_dataframe(periods=periods)
        forecast = full_model.predict(future)
        predictions = forecast.tail(periods)[["ds", "yhat", "yhat_lower", "yhat_upper"]].copy()
        predictions["ds"] = predictions["ds"].dt.strftime("%Y-%m-%d")
        for col in ["yhat", "yhat_lower", "yhat_upper"]:
            predictions[col] = predictions[col].round(2)
        historical = prophet_df.copy()
        historical["ds"] = historical["ds"].dt.strftime("%Y-%m-%d")
        historical["y"] = historical["y"].round(2)
        return {"predictions": predictions.to_dict(orient="records"), "historical": historical.to_dict(orient="records"), **metrics}
    except ImportError:
        return _run_sklearn_model(df, date_column, target_column, [], periods, "gradient_boosting")


def _run_sklearn_model(df, date_column, target_column, feature_columns, periods, model_type):
    df = df.copy()
    df["_date_ordinal"] = pd.to_datetime(df[date_column]).map(pd.Timestamp.toordinal)
    df["_month"] = pd.to_datetime(df[date_column]).dt.month
    df["_quarter"] = pd.to_datetime(df[date_column]).dt.quarter
    df["_dayofweek"] = pd.to_datetime(df[date_column]).dt.dayofweek

    feature_cols = ["_date_ordinal", "_month", "_quarter", "_dayofweek"]
    for col in (feature_columns or []):
        if col in df.columns and col != target_column and col != date_column:
            try:
                df[col] = pd.to_numeric(df[col], errors="coerce")
                feature_cols.append(col)
            except Exception:
                pass

    df_clean = df[feature_cols + [target_column]].dropna()
    X = df_clean[feature_cols].values
    y = pd.to_numeric(df_clean[target_column], errors="coerce").fillna(0).values

    if len(X) < 4:
        raise ValueError("Not enough data rows (need at least 4).")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)
    model = _get_model(model_type)
    model.fit(X_train_s, y_train)
    y_pred = model.predict(X_test_s)
    metrics = _compute_metrics(y_test, y_pred)

    last_date = pd.to_datetime(df[date_column]).max()
    freq = _detect_frequency(df[date_column])
    future_dates = pd.date_range(start=last_date, periods=periods + 1, freq=freq)[1:]

    future_rows = []
    for d in future_dates:
        row = [d.toordinal(), d.month, d.quarter, d.dayofweek]
        for col in feature_cols[4:]:
            row.append(df[col].median())
        future_rows.append(row)

    future_X = np.array(future_rows)
    future_X_s = scaler.transform(future_X)
    future_preds = model.predict(future_X_s)

    predictions = [{"ds": d.strftime("%Y-%m-%d"), "yhat": round(float(v), 2)} for d, v in zip(future_dates, future_preds)]
    historical = []
    for _, row in df[[date_column, target_column]].dropna().iterrows():
        ds = row[date_column]
        historical.append({
            "ds": ds.strftime("%Y-%m-%d") if hasattr(ds, "strftime") else str(ds)[:10],
            "y": round(float(row[target_column]), 2),
        })

    return {"predictions": predictions, "historical": historical, **metrics}


def _get_model(model_type):
    models = {
        "linear_regression": LinearRegression(),
        "ridge_regression": Ridge(alpha=1.0),
        "random_forest": RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
        "gradient_boosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
    }
    return models.get(model_type, LinearRegression())


def _compute_metrics(y_true, y_pred) -> Dict[str, float]:
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2_score": float(max(0, r2_score(y_true, y_pred))),
    }


def _detect_frequency(date_series):
    dates = pd.to_datetime(date_series).sort_values().dropna()
    if len(dates) < 2:
        return "D"
    diff = (dates.iloc[-1] - dates.iloc[0]) / (len(dates) - 1)
    days = diff.days
    if days <= 1: return "D"
    elif days <= 8: return "W"
    elif days <= 32: return "MS"
    elif days <= 93: return "QS"
    else: return "YS"
