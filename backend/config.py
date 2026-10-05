import os
import sys
from pathlib import Path

# Bootstrap sys.path so backend and services are always discoverable
_CURRENT_DIR = Path(__file__).resolve().parent
_SERVICES_DIR = _CURRENT_DIR / "services"
_REPO_ROOT = _CURRENT_DIR.parent

for _p in (str(_CURRENT_DIR), str(_SERVICES_DIR), str(_REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Project root: parent of backend directory
BASE_DIR = _REPO_ROOT

# Environment mode
ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

# Data directory (environment override or relative to project root / backend)
DATA_DIR_ENV = os.getenv("DATA_DIR")
if DATA_DIR_ENV:
    DATA_DIR = Path(DATA_DIR_ENV).resolve()
else:
    _data_candidates = [
        BASE_DIR / "supply datra",
        _CURRENT_DIR / "supply datra",
        Path("supply datra").resolve(),
        Path("../supply datra").resolve()
    ]
    DATA_DIR = next((p for p in _data_candidates if p.exists()), BASE_DIR / "supply datra")

# Models directory (environment override or relative to project root / backend)
MODEL_DIR_ENV = os.getenv("MODEL_DIR")
if MODEL_DIR_ENV:
    MODEL_DIR = Path(MODEL_DIR_ENV).resolve()
else:
    _model_candidates = [
        BASE_DIR / "supply_guard_models",
        _CURRENT_DIR / "supply_guard_models",
        Path("supply_guard_models").resolve(),
        Path("../supply_guard_models").resolve()
    ]
    MODEL_DIR = next((p for p in _model_candidates if p.exists()), BASE_DIR / "supply_guard_models")

# Weather model path (environment override or relative to project root / backend)
WEATHER_MODEL_PATH_ENV = os.getenv("WEATHER_MODEL_PATH")
if WEATHER_MODEL_PATH_ENV:
    WEATHER_MODEL_PKL = Path(WEATHER_MODEL_PATH_ENV).resolve()
else:
    _weather_candidates = [
        BASE_DIR / "weather" / "weather_final.pkl",
        _CURRENT_DIR / "weather" / "weather_final.pkl",
        Path("weather/weather_final.pkl").resolve(),
        Path("../weather/weather_final.pkl").resolve()
    ]
    WEATHER_MODEL_PKL = next((p for p in _weather_candidates if p.exists()), BASE_DIR / "weather" / "weather_final.pkl")

# CSV file paths
WEEKLY_OPERATIONS_CSV = DATA_DIR / "weekly_route_operations.csv"
TRADE_ROUTES_CSV = DATA_DIR / "trade_routes.csv"
GEOPOLITICAL_EVENTS_CSV = DATA_DIR / "geopolitical_events.csv"
COMMODITY_MARKET_CSV = DATA_DIR / "commodity_market.csv"
COUNTRY_METADATA_CSV = DATA_DIR / "country_metadata.csv"
WEEKLY_TIMELINE_CSV = DATA_DIR / "weekly_timeline.csv"

# Model file paths
DISRUPTION_MODEL_PKL = MODEL_DIR / "disruption_model_v1.pkl"
DISRUPTION_CONFIG_JSON = MODEL_DIR / "disruption_model_config.json"

DELAY_MODEL_PKL = MODEL_DIR / "delay_model_v1.pkl"
DELAY_CONFIG_JSON = MODEL_DIR / "delay_model_config.json"

FREIGHT_COST_MODEL_PKL = MODEL_DIR / "freight_cost_model_v1.pkl"
FREIGHT_COST_CONFIG_JSON = MODEL_DIR / "freight_cost_model_config.json"

# CORS configuration
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://supply-guard-2-0.vercel.app",
    "https://supply-guard-2-0-2.onrender.com",
]
CORS_ORIGINS_ENV = os.getenv("CORS_ORIGINS", "")
if CORS_ORIGINS_ENV.strip():
    CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ORIGINS_ENV.split(",") if o.strip()]
else:
    CORS_ALLOWED_ORIGINS = DEFAULT_CORS_ORIGINS

# Scoring weights (Prototype engineering weights)
WEIGHT_DISRUPTION = 0.50
WEIGHT_DELAY = 0.30
WEIGHT_RIPPLE = 0.20
DELAY_NORM_MAX_DAYS = 21.0

# Risk Level Thresholds
THRESHOLD_CRITICAL = 70.0
THRESHOLD_HIGH = 50.0
THRESHOLD_MEDIUM = 30.0

def get_risk_level(score: float) -> str:
    if score >= THRESHOLD_CRITICAL:
        return "CRITICAL"
    elif score >= THRESHOLD_HIGH:
        return "HIGH"
    elif score >= THRESHOLD_MEDIUM:
        return "MEDIUM"
    return "LOW"
