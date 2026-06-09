# 🤖 ForecastIQ — AI Demand Forecasting Platform

Enterprise-grade AI-powered demand forecasting platform built with FastAPI, React, and MySQL.

---

## 📋 Table of Contents
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

## Features by Phase

### Phase 1 — Core Platform
- User registration and login with JWT
- Dataset upload (CSV/Excel), auto-processing
- ML forecasting: Linear, Ridge, Random Forest, Gradient Boosting, Prophet
- Dashboard with sales trends and model breakdown
- Excel and PDF report export

### Phase 2 — Admin & RBAC
- Role-based access: Super Admin, Analyst, Viewer
- Admin panel: user management, system stats
- Notification system with real-time bell
- Activity logging middleware
- Model comparison endpoint

### Phase 3 — Enterprise Analytics
- Anomaly detection (IQR + Z-Score + seasonal analysis)
- Ensemble model (weighted by R² score)
- Advanced analytics: region-wise, category-wise, revenue, inventory risk
- System monitoring: API logs, performance metrics, forecast history
- DB-backed caching for dashboard APIs
- Global search across datasets and forecasts
- Dark/Light mode with persistent preference

### Phase 4 — Intelligent Automation
- Automated forecast scheduling (hourly/daily/weekly/monthly)
- Configurable threshold-based alerts with email support
- Enterprise integrations: webhooks, ERP, inventory, external APIs
- AI Features: demand recommendations, buying behavior, demand spikes, low-stock prediction, EOQ inventory optimization
- Customizable dashboard widgets
- API rate limiting
- Secure file validation
- SMTP email notifications

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

## Environment Setup

### Backend — Create `.env` file in `backend/`
```env
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/demand_forecasting
SECRET_KEY=your-super-secret-key-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
UPLOAD_DIR=uploads

# Optional: Email/SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your-app-password
SMTP_TLS=true
SMTP_FROM=your@email.com

# Rate Limiting
RATE_LIMIT_ENABLED=true
```

> **Note:** If your MySQL password contains `@`, encode it as `%40` in `DATABASE_URL`.

---

## Database Setup

### Step 1 — Create Database
```sql
CREATE DATABASE demand_forecasting;
```

### Step 2 — Run Migrations (in order)
Open MySQL Workbench and run these files one by one:
```
backend/migrate_phase3.sql   -- Adds role, activity_logs, anomaly_detections, cache_entries
backend/migrate_phase4.sql   -- Adds schedules, alerts, integrations, widgets, rate_limits
```

### Step 3 — Make yourself Super Admin
```sql
USE demand_forecasting;
SET SQL_SAFE_UPDATES = 0;
UPDATE users SET is_admin = 1, role = 'super_admin' WHERE username = 'yourusername';
SET SQL_SAFE_UPDATES = 1;
```

---

## Running the App

### Backend
```bash
cd backend
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
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

## Project Structure

```
ai-demand-forecasting/
├── backend/
│   ├── main.py                         # FastAPI app entry point
│   ├── requirements.txt                # Python dependencies
│   ├── migrate_phase3.sql              # DB migration Phase 3
│   ├── migrate_phase4.sql              # DB migration Phase 4
│   ├── uploads/                        # Uploaded dataset files
│   └── app/
│       ├── api/routes/                 # All API route handlers
│       │   ├── auth.py
│       │   ├── datasets.py
│       │   ├── forecasts.py
│       │   ├── dashboard.py
│       │   ├── reports.py
│       │   ├── notifications.py
│       │   ├── admin.py
│       │   ├── analytics.py
│       │   ├── monitoring.py
│       │   ├── anomaly.py
│       │   ├── schedule.py
│       │   ├── alerts.py
│       │   ├── integrations.py
│       │   ├── ai_features.py
│       │   └── widgets.py
│       ├── models/                     # SQLAlchemy DB models
│       │   ├── user.py
│       │   ├── dataset.py
│       │   ├── forecast.py
│       │   ├── notification.py
│       │   ├── activity_log.py
│       │   ├── anomaly.py
│       │   ├── cache.py
│       │   ├── schedule.py
│       │   ├── alert.py
│       │   ├── integration.py
│       │   ├── widget.py
│       │   └── rate_limit.py
│       ├── ml/                         # ML engine
│       │   ├── forecasting.py          # Core forecasting models
│       │   ├── ensemble.py             # Weighted ensemble
│       │   ├── anomaly.py              # IQR + Z-Score detection
│       │   └── ai_features.py          # AI recommendations
│       ├── services/                   # Business logic services
│       │   ├── data_processor.py       # File validation + cleaning
│       │   ├── notification_service.py
│       │   ├── activity_service.py
│       │   └── email_service.py
│       ├── core/                       # App config & utilities
│       │   ├── config.py               # Settings & env vars
│       │   ├── security.py             # JWT + password hashing
│       │   ├── roles.py                # RBAC permissions
│       │   ├── cache.py                # DB-backed caching
│       │   ├── middleware.py           # Activity logging
│       │   └── rate_limiter.py         # API rate limiting
│       ├── schemas/                    # Pydantic schemas
│       │   └── auth.py
│       └── db/
│           └── database.py             # DB engine + session
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                     # Router + route guards
│       ├── main.jsx                    # React entry + ThemeProvider
│       ├── index.css                   # Global styles + dark mode CSS vars
│       ├── services/
│       │   └── api.js                  # All API calls (Axios)
│       ├── hooks/
│       │   ├── useAuth.jsx             # Auth context + permissions
│       │   ├── useTheme.jsx            # Dark/light mode
│       │   ├── useRealtime.jsx         # Polling hook
│       │   └── useSearch.jsx           # Global search
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Layout.jsx          # App shell with header
│       │   │   └── Sidebar.jsx         # Navigation sidebar
│       │   ├── ui/
│       │   │   ├── Skeleton.jsx        # Loading skeletons
│       │   │   ├── ThemeToggle.jsx     # Dark/light toggle button
│       │   │   ├── GlobalSearch.jsx    # Header search bar
│       │   │   └── RoleBadge.jsx       # Role display badge
│       │   └── notifications/
│       │       └── NotificationBell.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── RegisterPage.jsx
│           ├── DashboardPage.jsx
│           ├── DatasetPage.jsx
│           ├── ForecastPage.jsx
│           ├── AnalyticsPage.jsx
│           ├── AnomalyPage.jsx
│           ├── ReportsPage.jsx
│           ├── MonitoringPage.jsx
│           ├── ProfilePage.jsx
│           ├── AdminPage.jsx
│           ├── SchedulePage.jsx        # Phase 4
│           ├── AlertsPage.jsx          # Phase 4
│           ├── IntegrationsPage.jsx    # Phase 4
│           └── AIFeaturesPage.jsx      # Phase 4
│
├── sample_data.csv                     # Sample dataset for testing
└── README.md
```

---

## Common Errors & Fixes

| Error | Fix |
|---|---|
| `uploads directory does not exist` | `mkdir backend/uploads` |
| `Access denied for user root@localhost` | Update `DATABASE_URL` in `.env`, encode `@` as `%40` |
| `Unknown column users.role` | Run `migrate_phase3.sql` in MySQL Workbench |
| `bcrypt error reading version` | `pip install bcrypt==4.0.1` |
| `email-validator not installed` | `pip install email-validator` |
| `pydantic-core PyO3 error` | Python 3.14 unsupported — use Python 3.12 |
| `Module type not specified` | Add `"type": "module"` to `frontend/package.json` |
| `Rate limit exceeded` | Wait 60 seconds or set `RATE_LIMIT_ENABLED=false` in `.env` |

---

## GitHub Repositories

| Phase | Repository |
|---|---|
| Phase 1-2 | https://github.com/vimalsajue007/AI-Demand-Forecasting |
| Phase 3 | https://github.com/vimalsajue007/Forecasting-phase3 |
| Phase 4 (latest) | https://github.com/vimalsajue007/Advance-AI-Demand-Forecasting |

---

## License

MIT License — © 2025 ForecastIQ. Built for enterprise demand forecasting.
