"""
Business Intelligence Module — Executive Dashboard, KPIs, AI Insights Engine,
Forecast Accuracy Center, Executive Reports.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timezone, timedelta
import numpy as np

from app.db.database import get_db
from app.models.user import User
from app.models.forecast import Forecast
from app.models.dataset import Dataset
from app.models.dataset_version import ExecutiveReport
from app.core.security import get_current_user
from app.core.cache import get_cache, set_cache
from app.services.data_processor import load_dataset

router = APIRouter(prefix="/api/intelligence", tags=["Business Intelligence"])


# ── Executive Dashboard ───────────────────────────────────────────────────────
@router.get("/executive-dashboard")
def executive_dashboard(
    period: str = Query("monthly", enum=["weekly", "monthly", "quarterly", "annual"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cache_key = f"exec_dash:{current_user.id}:{period}"
    cached = get_cache(db, cache_key)
    if cached:
        return cached

    forecasts = db.query(Forecast).filter(
        Forecast.owner_id == current_user.id, Forecast.status == "completed"
    ).order_by(Forecast.created_at.desc()).all()

    total_revenue = 0.0
    total_units = 0
    monthly_revenue: dict = {}
    product_revenue: dict = {}
    region_revenue: dict = {}

    for f in forecasts:
        if not f.historical_data:
            continue
        for row in f.historical_data:
            if "y" in row:
                val = float(row.get("y", 0))
                total_revenue += val
                month = str(row.get("ds", ""))[:7]
                if month:
                    monthly_revenue[month] = monthly_revenue.get(month, 0) + val
            if "product" in row and "y" in row:
                product_revenue[row["product"]] = product_revenue.get(row["product"], 0) + float(row["y"])
            if "region" in row and "y" in row:
                region_revenue[row["region"]] = region_revenue.get(row["region"], 0) + float(row["y"])

    # Revenue forecast from predictions
    predicted_revenue = 0.0
    for f in forecasts[:3]:
        if f.predictions:
            predicted_revenue += sum(p.get("yhat", 0) for p in f.predictions)

    # Accuracies
    accuracies = [f.accuracy_score * 100 for f in forecasts if f.accuracy_score]
    avg_accuracy = round(sum(accuracies) / len(accuracies), 1) if accuracies else 0

    # Model breakdown
    model_stats = {}
    for f in forecasts:
        m = f.model_type
        if m not in model_stats:
            model_stats[m] = {"count": 0, "accuracy_sum": 0, "mae_sum": 0}
        model_stats[m]["count"] += 1
        if f.accuracy_score:
            model_stats[m]["accuracy_sum"] += f.accuracy_score
        if f.mae:
            model_stats[m]["mae_sum"] += f.mae

    result = {
        "kpis": {
            "total_revenue": round(total_revenue, 2),
            "predicted_revenue": round(predicted_revenue, 2),
            "revenue_growth_pct": round((predicted_revenue - total_revenue) / max(total_revenue, 1) * 100, 2),
            "total_forecasts": len(forecasts),
            "avg_accuracy": avg_accuracy,
            "total_datasets": db.query(Dataset).filter(Dataset.owner_id == current_user.id).count(),
            "total_units": total_units,
        },
        "revenue_trend": [{"month": k, "revenue": round(v, 2)} for k, v in sorted(monthly_revenue.items())[-12:]],
        "top_products": sorted([{"product": k, "revenue": round(v, 2)} for k, v in product_revenue.items()], key=lambda x: x["revenue"], reverse=True)[:8],
        "region_performance": sorted([{"region": k, "revenue": round(v, 2)} for k, v in region_revenue.items()], key=lambda x: x["revenue"], reverse=True),
        "model_performance": [
            {"model": k, "count": v["count"],
             "avg_accuracy": round(v["accuracy_sum"] / v["count"] * 100, 1) if v["count"] else 0,
             "avg_mae": round(v["mae_sum"] / v["count"], 2) if v["count"] else 0}
            for k, v in model_stats.items()
        ],
        "recent_forecasts": [
            {"id": f.id, "name": f.name, "model": f.model_type,
             "accuracy": round(f.accuracy_score * 100, 1) if f.accuracy_score else None,
             "status": f.status, "created_at": str(f.created_at)[:10]}
            for f in forecasts[:5]
        ],
    }
    set_cache(db, cache_key, result, ttl_seconds=300)
    return result


# ── AI Insights Engine ────────────────────────────────────────────────────────
@router.get("/ai-insights")
def get_ai_insights(
    dataset_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    forecasts = db.query(Forecast).filter(
        Forecast.owner_id == current_user.id, Forecast.status == "completed"
    ).order_by(Forecast.created_at.desc()).limit(20).all()

    insights = []
    opportunities = []
    declining = []
    growing = []

    # Accuracy insights
    if forecasts:
        best = max(forecasts, key=lambda f: f.accuracy_score or 0)
        worst = min(forecasts, key=lambda f: f.accuracy_score or 1)
        avg_acc = np.mean([f.accuracy_score for f in forecasts if f.accuracy_score]) * 100

        if avg_acc > 80:
            insights.append({"type": "success", "title": "Excellent Forecast Accuracy",
                              "message": f"Your models average {avg_acc:.1f}% accuracy — well above industry standard.", "priority": "low"})
        elif avg_acc < 60:
            insights.append({"type": "warning", "title": "Low Forecast Accuracy",
                              "message": f"Average accuracy is {avg_acc:.1f}%. Consider using the Ensemble model for better results.", "priority": "high"})

        if best.accuracy_score:
            insights.append({"type": "info", "title": f"Best Model: {best.model_type.replace('_', ' ').title()}",
                              "message": f"'{best.name}' achieved {round(best.accuracy_score * 100, 1)}% accuracy.", "priority": "medium"})

    # Product trends from historical data
    product_trends: dict = {}
    for f in forecasts:
        if f.historical_data and len(f.historical_data) > 10:
            vals = [r.get("y", 0) for r in f.historical_data]
            mid = len(vals) // 2
            first_half = np.mean(vals[:mid]) if vals[:mid] else 0
            second_half = np.mean(vals[mid:]) if vals[mid:] else 0
            if first_half > 0:
                trend = (second_half - first_half) / first_half * 100
                if trend > 20:
                    growing.append({"name": f.name, "growth": round(trend, 1)})
                    opportunities.append(f"'{f.name}' shows {round(trend, 1)}% demand growth — consider increasing inventory.")
                elif trend < -20:
                    declining.append({"name": f.name, "decline": round(abs(trend), 1)})

    # Prediction direction analysis
    for f in forecasts[:3]:
        if f.predictions and len(f.predictions) > 0:
            preds = [p.get("yhat", 0) for p in f.predictions]
            if preds[-1] > preds[0] * 1.1:
                insights.append({"type": "info", "title": f"Rising Demand: {f.name}",
                                  "message": f"Forecast shows {round((preds[-1]/preds[0]-1)*100, 1)}% demand increase over {f.periods} periods.", "priority": "medium"})
            elif preds[-1] < preds[0] * 0.9:
                insights.append({"type": "warning", "title": f"Declining Demand: {f.name}",
                                  "message": f"Forecast shows {round((1-preds[-1]/preds[0])*100, 1)}% demand decline — review inventory planning.", "priority": "high"})

    # Recommendation summary
    summary = f"Analyzed {len(forecasts)} forecasts. " \
              f"Found {len(growing)} high-growth opportunities and {len(declining)} declining trends. " \
              f"Average model accuracy: {round(avg_acc, 1) if forecasts else 0}%."

    return {
        "insights": insights[:10],
        "opportunities": opportunities[:5],
        "growing_products": growing[:5],
        "declining_products": declining[:5],
        "summary": summary,
        "total_analyzed": len(forecasts),
    }


# ── Forecast Accuracy Center ──────────────────────────────────────────────────
@router.get("/accuracy-center")
def accuracy_center(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    forecasts = db.query(Forecast).filter(
        Forecast.owner_id == current_user.id, Forecast.status == "completed"
    ).order_by(Forecast.created_at.asc()).all()

    if not forecasts:
        return {"accuracy_trend": [], "model_comparison": [], "best_model": None, "avg_accuracy": 0}

    # Accuracy over time
    accuracy_trend = [
        {"date": str(f.created_at)[:10], "accuracy": round(f.accuracy_score * 100, 2) if f.accuracy_score else 0,
         "mae": round(f.mae, 4) if f.mae else 0, "model": f.model_type, "name": f.name}
        for f in forecasts
    ]

    # Per-model comparison
    model_stats: dict = {}
    for f in forecasts:
        m = f.model_type
        if m not in model_stats:
            model_stats[m] = {"count": 0, "r2_sum": 0, "mae_sum": 0, "rmse_sum": 0}
        model_stats[m]["count"] += 1
        if f.accuracy_score: model_stats[m]["r2_sum"] += f.accuracy_score
        if f.mae: model_stats[m]["mae_sum"] += f.mae
        if f.rmse: model_stats[m]["rmse_sum"] += f.rmse

    model_comparison = [
        {"model": k, "count": v["count"],
         "avg_r2": round(v["r2_sum"] / v["count"] * 100, 2) if v["count"] else 0,
         "avg_mae": round(v["mae_sum"] / v["count"], 4) if v["count"] else 0,
         "avg_rmse": round(v["rmse_sum"] / v["count"], 4) if v["count"] else 0}
        for k, v in model_stats.items()
    ]
    model_comparison.sort(key=lambda x: x["avg_r2"], reverse=True)

    best_model = model_comparison[0]["model"] if model_comparison else None
    avg_accuracy = round(
        sum(f.accuracy_score for f in forecasts if f.accuracy_score) / len(forecasts) * 100, 2
    )

    return {
        "accuracy_trend": accuracy_trend,
        "model_comparison": model_comparison,
        "best_model": best_model,
        "avg_accuracy": avg_accuracy,
        "total_forecasts": len(forecasts),
        "improving": accuracy_trend[-1]["accuracy"] > accuracy_trend[0]["accuracy"] if len(accuracy_trend) > 1 else False,
    }


# ── Dataset Versioning ────────────────────────────────────────────────────────
@router.get("/datasets/{dataset_id}/versions")
def get_dataset_versions(dataset_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    from app.models.dataset_version import DatasetVersion
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    versions = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id
    ).order_by(DatasetVersion.version.desc()).all()
    return [{"id": v.id, "version": v.version, "filename": v.filename,
             "rows_count": v.rows_count, "changes_summary": v.changes_summary,
             "is_archived": v.is_archived, "created_at": str(v.created_at)} for v in versions]


# ── Executive Reports ─────────────────────────────────────────────────────────
@router.post("/executive-reports", status_code=201)
def generate_executive_report(
    report_type: str = Query("monthly", enum=["monthly", "quarterly", "annual", "custom"]),
    period_from: Optional[str] = None,
    period_to: Optional[str] = None,
    title: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    forecasts = db.query(Forecast).filter(
        Forecast.owner_id == current_user.id, Forecast.status == "completed"
    ).all()

    datasets = db.query(Dataset).filter(Dataset.owner_id == current_user.id).all()
    accuracies = [f.accuracy_score * 100 for f in forecasts if f.accuracy_score]
    avg_acc = round(sum(accuracies) / len(accuracies), 1) if accuracies else 0

    total_revenue = 0
    for f in forecasts:
        if f.historical_data:
            total_revenue += sum(float(r.get("y", 0)) for r in f.historical_data)

    predicted = sum(
        sum(p.get("yhat", 0) for p in f.predictions)
        for f in forecasts[:5] if f.predictions
    )

    model_usage: dict = {}
    for f in forecasts:
        model_usage[f.model_type] = model_usage.get(f.model_type, 0) + 1

    content = {
        "summary": {
            "total_forecasts": len(forecasts),
            "total_datasets": len(datasets),
            "avg_accuracy": avg_acc,
            "total_revenue_analyzed": round(total_revenue, 2),
            "predicted_revenue": round(predicted, 2),
        },
        "model_usage": model_usage,
        "top_forecasts": [
            {"name": f.name, "model": f.model_type,
             "accuracy": round(f.accuracy_score * 100, 1) if f.accuracy_score else None}
            for f in sorted(forecasts, key=lambda x: x.accuracy_score or 0, reverse=True)[:5]
        ],
        "recommendations": [
            "Continue using Ensemble model for highest accuracy",
            f"Average forecast accuracy of {avg_acc}% is {'excellent' if avg_acc > 80 else 'good' if avg_acc > 60 else 'needs improvement'}",
            f"Total of {len(forecasts)} forecasts generated — {"strong" if len(forecasts) > 10 else "growing"} forecasting activity",
        ],
        "period_from": period_from,
        "period_to": period_to,
        "generated_at": str(datetime.now(timezone.utc))[:19],
    }

    report = ExecutiveReport(
        owner_id=current_user.id,
        title=title or f"{report_type.title()} Executive Report — {datetime.now().strftime('%B %Y')}",
        report_type=report_type,
        period_from=period_from,
        period_to=period_to,
        content=content,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "title": report.title, "report_type": report.report_type,
            "content": report.content, "created_at": str(report.created_at)}


@router.get("/executive-reports")
def list_executive_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(ExecutiveReport).filter(
        ExecutiveReport.owner_id == current_user.id
    ).order_by(ExecutiveReport.created_at.desc()).all()
    return [{"id": r.id, "title": r.title, "report_type": r.report_type,
             "period_from": r.period_from, "period_to": r.period_to,
             "created_at": str(r.created_at)} for r in reports]


@router.get("/executive-reports/{report_id}")
def get_executive_report(report_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    report = db.query(ExecutiveReport).filter(
        ExecutiveReport.id == report_id, ExecutiveReport.owner_id == current_user.id
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"id": report.id, "title": report.title, "report_type": report.report_type,
            "content": report.content, "created_at": str(report.created_at)}
