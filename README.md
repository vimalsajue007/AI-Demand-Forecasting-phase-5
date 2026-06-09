#  ForecastIQ — AI Demand Forecasting Platform

Enterprise-grade AI-powered demand forecasting platform built with FastAPI, React, and MySQL.

---

##  Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features by Phase](#features-by-phase)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Common Errors](#common-errors)

---

## Overview

ForecastIQ is a full-stack AI demand forecasting platform that allows businesses to:
- Upload sales datasets and run ML-based demand forecasts
- Compare multiple models and pick the most accurate
- Detect anomalies in sales patterns
- Automate forecasting with scheduled jobs
- Get AI-driven inventory optimization recommendations
- Integrate with external systems via webhooks and APIs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12) |
| Database | MySQL 8.0 + SQLAlchemy ORM |
| Auth | JWT (python-jose) + bcrypt |
| ML Models | Scikit-learn, Prophet (optional) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS (dark mode) |
| Charts | Recharts |
| HTTP Client | Axios |

---


## Installation

### Prerequisites
- Python 3.12
- Node.js 18+
- MySQL 8.0
- Git

### Step 1 — Clone the Repository
```bash
git clone https://github.com/vimalsajue007/Advance-AI-Demand-Forecasting.git
cd Advance-AI-Demand-Forecasting
```

### Step 2 — Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate


pip install -r requirements.txt
```

### Step 3 — Frontend Setup
```bash
cd frontend
npm install
```

---




## Running the App

### Backend
```bash
cd backend
venv\Scripts\activate        # Windows
mkdir uploads                # Create uploads folder if not exists
uvicorn main:app --reload
```
Backend runs at: **http://127.0.0.1:8000**
Swagger docs: **http://127.0.0.1:8000/docs**

### Frontend
```bash
cd frontend
npm run dev
```
Frontend runs at: **http://localhost:5173**

---

## API Documentation

Full Swagger UI available at `http://127.0.0.1:8000/docs`

### Authentication
All protected endpoints require Bearer token in the `Authorization` header.

To get a token:
1. `POST /api/auth/login` — returns `access_token`
2. Click **Authorize** in Swagger → paste token in **BearerAuth**

### API Groups

| Group | Base Path | Description |
|---|---|---|
| Authentication | `/api/auth/` | Register, login, profile |
| Datasets | `/api/datasets/` | Upload, list, preview, delete |
| Forecasts | `/api/forecasts/` | Create, compare, retrain |
| Dashboard | `/api/dashboard/` | Stats, activity, realtime |
| Reports | `/api/reports/` | Excel, PDF, AI insights |
| Notifications | `/api/notifications/` | List, mark read, delete |
| Admin | `/api/admin/` | Users, roles, system stats |
| Analytics | `/api/analytics/` | Region, category, revenue, inventory |
| Monitoring | `/api/monitoring/` | Logs, performance, history |
| Anomaly | `/api/anomalies/` | Detect, list |
| Schedules | `/api/schedules/` | Automated forecasting |
| Alerts | `/api/alerts/` | Threshold alerts |
| Integrations | `/api/integrations/` | Webhooks, ERP |
| AI Features | `/api/ai/` | Recommendations, spikes, EOQ |
| Widgets | `/api/widgets/` | Dashboard customization |

---



## License

MIT License — © 2025 ForecastIQ. Built for enterprise demand forecasting.
