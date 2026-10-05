# Supply Guard 2.0 — Production Deployment Guide

This guide details the exact steps to deploy **Supply Guard 2.0 Control Tower** to production using the decoupled architecture:
- **Frontend**: Deployed to **Vercel** (React 19 + TypeScript + Vite SPA).
- **Backend / ML Inference Engine**: Deployed to a production container/service (Docker / Render / Railway / Fly.io / AWS ECS) running FastAPI with real trained LightGBM models and the pre-trained worldwide weather classification model.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────┐
│       Frontend (Vercel)              │
│   React 19 + Vite SPA                │
│   Zero-Scroll Cinematic Video        │
│   Real-time Telemetry Canvas         │
└──────────────────┬───────────────────┘
                   │ HTTPS API Calls (VITE_API_URL)
                   ▼
┌──────────────────────────────────────┐
│   Production ML Backend Service      │
│   FastAPI + Uvicorn                  │
│   - Port Registry (120+ ports)       │
│   - Feature Engineering Engine       │
│   - LightGBM Models (Disruption,     │
│     Delay, Freight Cost)             │
│   - Weather Predictor                │
│     (weather_final.pkl - 124 MB)     │
│   - Risk Engine & Impact Matrix      │
│   - Scenario Simulator               │
└──────────────────────────────────────┘
```

> **Why Clean Architecture Separation?**
> The production ML stack includes `weather_final.pkl` (124 MB), `scikit-learn`, `lightgbm`, `scipy`, `pandas`, and `numpy`. Together, these exceed 410 MB uncompressed, which surpasses Vercel Serverless Function limits (250 MB uncompressed limit). Separating the frontend (on Vercel's global edge network) from the Python ML service provides:
> 1. Instant frontend loading without serverless cold start delays.
> 2. Zero risk of model size truncation or timeouts.
> 3. 100% preservation of all real LightGBM models, weather classifiers, and deterministic physics engines.

---

## 2. Environment Variables Specification

### Frontend (Configured in Vercel Dashboard)
| Variable | Description | Example Value |
|---|---|---|
| `VITE_API_URL` | Full URL to the production backend API | `https://supply-guard-api.onrender.com/api` |

### Backend (Configured in Container / Cloud Service)
| Variable | Description | Example Value |
|---|---|---|
| `ENVIRONMENT` | Deployment environment mode | `production` |
| `DEBUG` | Enable/disable FastAPI debug documentation | `false` |
| `PORT` | Listening port for web server | `8000` |
| `HOST` | Listening host interface | `0.0.0.0` |
| `CORS_ORIGINS` | Comma-separated list of allowed origins | `https://your-app.vercel.app,http://localhost:5173` |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key for natural language summaries | `AIzaSy...` |

---

## 3. Local Production Testing

Before deploying, test the build locally in production mode:

### Step 1: Install Dependencies
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Step 2: Run Backend Locally
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Verify health:
```bash
curl http://127.0.0.1:8000/api/health
# Returns: {"status":"ok","environment":"production","models_loaded":true,"weather_model_loaded":true,...}
```

### Step 3: Build & Preview Frontend
```bash
cd frontend
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```
Open `http://127.0.0.1:4173` in your browser.

---

## 4. Backend Deployment (Render / Railway / Docker / AWS)

### Option A: 1-Click Deploy on Render
1. Create a **New Web Service** connected to your Git repository.
2. Select **Docker** as the Runtime (uses the root `Dockerfile`).
3. Set Instance Type to **Standard (1 GB - 2 GB RAM)** to ensure sufficient memory for LightGBM and the 124 MB weather model.
4. Add Environment Variables:
   - `ENVIRONMENT=production`
   - `CORS_ORIGINS=https://your-supply-guard.vercel.app`
5. Click **Deploy Web Service**.
6. Copy your public service URL (e.g. `https://supply-guard-backend.onrender.com`).

### Option B: Deploy via Docker
```bash
docker build -t supply-guard-backend:latest .
docker run -d -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e CORS_ORIGINS=https://your-app.vercel.app \
  supply-guard-backend:latest
```

---

## 5. Frontend Deployment on Vercel

### Step 1: Deploy via Vercel CLI or Web Dashboard

#### Method 1: Using Vercel Web Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... -> Project**.
2. Import your Git repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-api.onrender.com/api` (URL from Step 4)
5. Click **Deploy**.

#### Method 2: Using Vercel CLI
```bash
# From within the frontend directory
cd frontend
vercel --prod
```
When prompted:
- Set `VITE_API_URL` to your production backend URL.

---

## 6. Post-Deployment Verification Checklist

Verify the deployed application end-to-end:

### 1. Verify Health Endpoint
```bash
curl https://your-backend-api.com/api/health
```
Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "models_loaded": true,
  "weather_model_loaded": true,
  "system": "Supply Guard 2.0"
}
```

### 2. Verify Fresh State on Startup
- Open `https://your-app.vercel.app/`.
- Ensure no demo data is pre-populated.
- Verify message: **"No shipment analyzed yet."**

### 3. Verify Real User Shipment Pipeline
Enter the standard test shipment:
- **Origin**: Port of Yokohama (Yokohama, Japan)
- **Destination**: Port of Los Angeles (Los Angeles, United States)
- **Shipment Weight**: `15,000` kg
- **Quantity**: `50,000` units
- **Departure Date & Time**: `2026-10-05 10:00`
- **Shipment Status**: `Normal`
- Click **[ ANALYZE SHIPMENT RISK ]**.
- Verify:
  - Route calculation resolves geodesic distance (~8,840 km) and ~17 days baseline transit.
  - Destination arrival date calculated across international date line.
  - Real Weather model predicts conditions for arrival.
  - Feature engineering creates all 21 LightGBM features.
  - Models output Disruption Probability, Predicted Delay Days, and Freight Cost.
  - Business impact and timeline render accurately.

### 4. Verify SPA Routing
Refresh the page while on:
- `https://your-app.vercel.app/risk-analysis`
- `https://your-app.vercel.app/routes`
- `https://your-app.vercel.app/network`
- `https://your-app.vercel.app/simulator`
- `https://your-app.vercel.app/business-impact`
- `https://your-app.vercel.app/recommendations`
- `https://your-app.vercel.app/reports`

Verify that:
1. No `404 Not Found` occurs.
2. The page loads the correct view.
3. `/api/*` is never redirected to the HTML page.

### 5. Verify What-If Simulator
- Open What-If Simulator.
- Increase Port Congestion (+25%) or switch Weather to Weather Model Forecast.
- Click **Run Simulation**.
- Verify Delta changes (+delay, +disruption) update deterministically.
