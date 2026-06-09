import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
from app.db.database import create_tables
from app.api.routes import (
    auth, datasets, forecasts, dashboard, reports,
    notifications, admin, analytics, monitoring, anomaly,
    schedule, alerts, integrations, ai_features, widgets,
)
from app.api.routes import projects, scenarios, collaboration, intelligence
from app.core.config import settings
from app.core.middleware import ActivityLogMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    create_tables()
    yield


app = FastAPI(
    title="AI Demand Forecasting API",
    description="Enterprise-grade AI-powered demand forecasting — Phase 5",
    version="5.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title="AI Demand Forecasting API", version="5.0.0", routes=app.routes)
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
    }
    for path in schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
app.add_middleware(ActivityLogMiddleware)

# Phase 1–4 routes
app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(forecasts.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(monitoring.router)
app.include_router(anomaly.router)
app.include_router(schedule.router)
app.include_router(alerts.router)
app.include_router(integrations.router)
app.include_router(ai_features.router)
app.include_router(widgets.router)

# Phase 5 routes
app.include_router(projects.router)
app.include_router(scenarios.router)
app.include_router(collaboration.router)
app.include_router(intelligence.router)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "AI Demand Forecasting API v5.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy", "version": "5.0.0"}
