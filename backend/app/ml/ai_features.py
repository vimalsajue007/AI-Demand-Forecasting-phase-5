"""
Advanced AI Features:
- Product demand recommendations
- Customer buying behavior analysis
- Demand spike prediction
- Low-stock prediction
- Inventory optimization suggestions
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans


def demand_recommendations(
    file_path: str,
    date_column: str,
    value_column: str,
    product_column: str = None,
) -> Dict[str, Any]:
    """Generate product demand recommendations based on historical patterns."""
    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    df[date_column] = pd.to_datetime(df[date_column], errors="coerce")
    df[value_column] = pd.to_numeric(df[value_column], errors="coerce").fillna(0)
    df = df.dropna(subset=[date_column]).sort_values(date_column)

    recommendations = []
    overall_mean = df[value_column].mean()
    overall_std = df[value_column].std()

    if product_column and product_column in df.columns:
        for product in df[product_column].unique():
            pdata = df[df[product_column] == product][value_column]
            mean_val = pdata.mean()
            trend = "growing" if pdata.iloc[-1] > pdata.iloc[0] else "declining"
            cv = pdata.std() / mean_val if mean_val > 0 else 0

            action = "Increase stock" if trend == "growing" and cv < 0.3 else \
                     "Monitor closely" if cv > 0.5 else \
                     "Reduce stock" if trend == "declining" else "Maintain current levels"

            recommendations.append({
                "product": str(product),
                "avg_demand": round(float(mean_val), 2),
                "trend": trend,
                "volatility": round(float(cv), 3),
                "recommendation": action,
                "priority": "high" if trend == "growing" and cv < 0.3 else
                            "medium" if cv > 0.5 else "low",
            })

        recommendations.sort(key=lambda x: x["avg_demand"], reverse=True)

    # Overall insights
    recent = df[value_column].tail(int(len(df) * 0.2))
    historical = df[value_column].head(int(len(df) * 0.8))
    growth = (recent.mean() - historical.mean()) / (historical.mean() + 1e-8) * 100

    return {
        "recommendations": recommendations[:20],
        "overall_trend": "growing" if growth > 5 else "declining" if growth < -5 else "stable",
        "growth_rate_pct": round(float(growth), 2),
        "total_products": len(recommendations),
        "high_priority_count": sum(1 for r in recommendations if r["priority"] == "high"),
    }


def buying_behavior_analysis(
    file_path: str,
    date_column: str,
    value_column: str,
) -> Dict[str, Any]:
    """Analyze customer buying behavior patterns."""
    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    df[date_column] = pd.to_datetime(df[date_column], errors="coerce")
    df[value_column] = pd.to_numeric(df[value_column], errors="coerce").fillna(0)
    df = df.dropna(subset=[date_column]).sort_values(date_column)

    df["_dow"] = df[date_column].dt.day_name()
    df["_hour"] = df[date_column].dt.hour if df[date_column].dt.hour.nunique() > 1 else 0
    df["_month"] = df[date_column].dt.month
    df["_quarter"] = df[date_column].dt.quarter

    dow_pattern = df.groupby("_dow")[value_column].mean().round(2).to_dict()
    monthly_pattern = df.groupby("_month")[value_column].mean().round(2).to_dict()
    quarter_pattern = df.groupby("_quarter")[value_column].mean().round(2).to_dict()

    peak_day = max(dow_pattern, key=dow_pattern.get) if dow_pattern else None
    peak_month_num = max(monthly_pattern, key=monthly_pattern.get) if monthly_pattern else None
    month_names = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}

    return {
        "day_of_week_pattern": dow_pattern,
        "monthly_pattern": {month_names.get(k, k): v for k, v in monthly_pattern.items()},
        "quarterly_pattern": {f"Q{k}": v for k, v in quarter_pattern.items()},
        "peak_day": peak_day,
        "peak_month": month_names.get(peak_month_num),
        "peak_quarter": f"Q{max(quarter_pattern, key=quarter_pattern.get)}" if quarter_pattern else None,
        "insights": [
            f"Peak buying day: {peak_day}",
            f"Peak buying month: {month_names.get(peak_month_num)}",
            f"Q{max(quarter_pattern, key=quarter_pattern.get)} is the strongest quarter" if quarter_pattern else "",
        ],
    }


def demand_spike_prediction(
    file_path: str,
    date_column: str,
    value_column: str,
    lookahead_periods: int = 7,
) -> Dict[str, Any]:
    """Predict potential demand spikes in upcoming periods."""
    from app.ml.forecasting import run_forecast

    result = run_forecast(file_path, "gradient_boosting", lookahead_periods,
                          value_column, date_column, [])

    predictions = result.get("predictions", [])
    historical = result.get("historical", [])

    if not historical:
        return {"spikes": [], "spike_count": 0}

    hist_values = [h["y"] for h in historical]
    mean_val = np.mean(hist_values)
    std_val = np.std(hist_values)
    spike_threshold = mean_val + 1.5 * std_val

    spikes = []
    for pred in predictions:
        yhat = pred.get("yhat", 0)
        if yhat > spike_threshold:
            severity = "high" if yhat > mean_val + 2.5 * std_val else "medium"
            spikes.append({
                "date": pred["ds"],
                "predicted_value": round(yhat, 2),
                "expected_normal": round(mean_val, 2),
                "spike_factor": round(yhat / mean_val, 2),
                "severity": severity,
            })

    return {
        "spikes": spikes,
        "spike_count": len(spikes),
        "spike_threshold": round(spike_threshold, 2),
        "normal_range": {"min": round(mean_val - std_val, 2), "max": round(mean_val + std_val, 2)},
        "predictions": predictions,
        "recommendation": f"Prepare for {len(spikes)} demand spike(s) in the next {lookahead_periods} periods." if spikes else "No significant spikes predicted.",
    }


def low_stock_prediction(
    file_path: str,
    date_column: str,
    value_column: str,
    current_stock: float = None,
    reorder_lead_days: int = 7,
) -> Dict[str, Any]:
    """Predict when stock will run low based on demand forecast."""
    from app.ml.forecasting import run_forecast

    result = run_forecast(file_path, "linear_regression", 30, value_column, date_column, [])
    predictions = result.get("predictions", [])
    historical = result.get("historical", [])

    if not historical:
        return {"risk_level": "unknown", "days_until_stockout": None}

    avg_daily_demand = np.mean([h["y"] for h in historical])

    if current_stock is None:
        current_stock = avg_daily_demand * 30  # assume 30 days stock

    cumulative_demand = 0
    days_until_stockout = None
    reorder_date = None

    for i, pred in enumerate(predictions):
        cumulative_demand += pred.get("yhat", avg_daily_demand)
        if cumulative_demand >= current_stock and days_until_stockout is None:
            days_until_stockout = i + 1

        if days_until_stockout and i == max(0, days_until_stockout - reorder_lead_days - 1):
            reorder_date = pred["ds"]
            break

    risk_level = "critical" if days_until_stockout and days_until_stockout < 7 else \
                 "high" if days_until_stockout and days_until_stockout < 14 else \
                 "medium" if days_until_stockout and days_until_stockout < 30 else "low"

    return {
        "current_stock": round(current_stock, 2),
        "avg_daily_demand": round(avg_daily_demand, 2),
        "days_until_stockout": days_until_stockout,
        "reorder_date": reorder_date,
        "risk_level": risk_level,
        "recommended_reorder_quantity": round(avg_daily_demand * 45, 2),
        "recommendation": f"Restock by {reorder_date} to avoid stockout." if reorder_date else "Stock levels appear adequate.",
    }


def inventory_optimization(
    file_path: str,
    date_column: str,
    value_column: str,
    holding_cost_pct: float = 0.2,
    ordering_cost: float = 100.0,
) -> Dict[str, Any]:
    """Calculate optimal inventory levels using EOQ model."""
    df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
    df[value_column] = pd.to_numeric(df[value_column], errors="coerce").fillna(0)

    annual_demand = df[value_column].sum() * (365 / max(len(df), 1))
    avg_unit_cost = df[value_column].mean()
    holding_cost = avg_unit_cost * holding_cost_pct

    # Economic Order Quantity
    eoq = np.sqrt((2 * annual_demand * ordering_cost) / (holding_cost + 1e-8))
    orders_per_year = annual_demand / (eoq + 1e-8)
    reorder_interval_days = 365 / (orders_per_year + 1e-8)

    # Safety stock (1.65 sigma for 95% service level)
    std_demand = df[value_column].std()
    safety_stock = 1.65 * std_demand * np.sqrt(7)  # 7-day lead time

    total_cost = (annual_demand / eoq * ordering_cost) + (eoq / 2 * holding_cost)

    return {
        "annual_demand": round(float(annual_demand), 2),
        "economic_order_quantity": round(float(eoq), 2),
        "orders_per_year": round(float(orders_per_year), 1),
        "reorder_interval_days": round(float(reorder_interval_days), 1),
        "safety_stock": round(float(safety_stock), 2),
        "reorder_point": round(float(safety_stock + avg_unit_cost * 7), 2),
        "estimated_annual_cost": round(float(total_cost), 2),
        "suggestions": [
            f"Order {round(eoq, 0)} units every {round(reorder_interval_days, 0)} days",
            f"Maintain safety stock of {round(safety_stock, 0)} units",
            f"Estimated annual inventory cost: ${round(total_cost, 0)}",
        ],
    }
