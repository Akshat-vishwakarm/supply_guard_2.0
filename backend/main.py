import io
import os
import logging
import pandas as pd
from typing import Optional, List, Dict, Any, Union
from fastapi import FastAPI, HTTPException, Request, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.config import CORS_ALLOWED_ORIGINS, ENVIRONMENT, DEBUG
from backend.services.risk_engine import get_risk_engine
from backend.services.network_engine import get_network_engine
from backend.services.business_impact import get_business_impact_engine
from backend.services.scenario_engine import get_scenario_engine
from backend.services.recommendation_engine import get_recommendation_engine
from backend.services.gemini_explainer import get_gemini_explainer
from backend.services.weather_prediction import get_weather_predictor
from backend.services.port_registry import (
    get_all_registered_ports,
    find_baseline_transit_days,
    deduce_currency_pair,
    find_port
)

# Setup production logging
logging.basicConfig(
    level=logging.DEBUG if DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("supply_guard")

app = FastAPI(
    title="Supply Guard 2.0 API",
    description="Deterministic AI/ML Supply Chain Risk Intelligence & Prediction Control Tower API",
    version="2.0.0",
    docs_url="/docs" if DEBUG else None,
    redoc_url=None
)

# Configure Production CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured JSON error handling without exposing stack traces
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = f"HTTP_{exc.status_code}"
    message = exc.detail if isinstance(exc.detail, str) else str(exc.detail.get("error", exc.detail))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "detail": exc.detail if isinstance(exc.detail, dict) else None
            }
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing request: {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred during processing. Please try again or check parameters."
            }
        }
    )

class TransitEstimateRequest(BaseModel):
    origin_country: str = Field(..., description="Origin country name")
    origin_city: Optional[str] = Field("", description="Origin port or city name")
    destination_country: str = Field(..., description="Destination country name")
    destination_city: Optional[str] = Field("", description="Destination port or city name")
    shipping_method: Optional[str] = Field("Sea", description="Shipping method (e.g. Sea)")

class WeatherPredictRequest(BaseModel):
    country: str = Field(..., description="Country name, e.g. Japan")
    city: str = Field(..., description="City name, e.g. Tokyo")
    prediction_date: str = Field(..., description="Prediction date YYYY-MM-DD")
    include_timeline: Optional[bool] = Field(False, description="Include multi-date forecast timeline")
    horizons: Optional[List[int]] = Field([1, 3, 7, 10], description="Forecast horizons in days")

class PortEndpointSchema(BaseModel):
    port: str = Field(..., description="Port name")
    city: str = Field(..., description="City name")
    country: str = Field(..., description="Country name")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")

class ShipmentRiskRequest(BaseModel):
    # Section 1 — Business / Shipment
    supplier_company: Optional[str] = Field(None, description="My Company / Supplier Name")
    receiving_company: Optional[str] = Field(None, description="Receiving Company Name")
    customer_company: Optional[str] = Field(None, description="Customer / Receiving Company Name alias")
    product_name: Optional[str] = Field(None, description="Product / Item Name")
    quantity: Optional[float] = Field(None, description="Quantity")
    quantity_unit: Optional[str] = Field("Units", description="Quantity unit: Units, Tonnes, Kilograms, Containers")
    shipment_weight: Optional[float] = Field(None, description="Shipment Weight")
    weight_unit: Optional[str] = Field("kg", description="Weight unit: kg, tonnes")
    commercial_value: Optional[float] = Field(None, description="Commercial shipment value")
    shipment_value: Optional[float] = Field(None, description="Optional shipment monetary value alias")
    currency: Optional[str] = Field("USD", description="Display/transaction currency")

    # Section 2 — Route (Support nested objects per Section 3 & 17 or flat keys)
    origin: Optional[Union[PortEndpointSchema, Dict[str, Any]]] = Field(None, description="Structured origin port and coordinates")
    destination: Optional[Union[PortEndpointSchema, Dict[str, Any]]] = Field(None, description="Structured destination port and coordinates")
    origin_port: Optional[str] = Field(None, description="Leaving From / Origin Port (searchable port or city name)")
    destination_port: Optional[str] = Field(None, description="Receiving At / Destination Port (searchable port or city name)")
    origin_country: Optional[str] = Field(None, description="Origin country (auto-derived if omitted)")
    origin_city: Optional[str] = Field(None, description="Origin city (auto-derived if omitted)")
    destination_country: Optional[str] = Field(None, description="Destination country (auto-derived if omitted)")
    destination_city: Optional[str] = Field(None, description="Destination city (auto-derived if omitted)")

    # Section 3 — Schedule
    departure_date: Optional[str] = Field(None, description="Departure date YYYY-MM-DD")
    departure_time: Optional[str] = Field("10:00", description="Departure time HH:MM")

    # Section 4 — Current Shipment Status
    shipment_status: Optional[str] = Field("Normal", description="Current shipment status: Normal, Delayed, Disrupted")
    current_delay_days: Optional[float] = Field(0.0, description="Current delay in days if Delayed")
    disruption_reason: Optional[str] = Field(None, description="Disruption reason if Disrupted")

    # Section 5 — Advanced Risk Overrides (Optional - AUTO by default)
    overrides: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Advanced risk overrides: port_congestion, weather_risk, geopolitical_risk, container_availability, fuel_cost, commodity_price")

class PredictRequest(BaseModel):
    # Optional business shipment fields
    supplier_company: Optional[str] = Field(None, description="Supplier company name")
    customer_company: Optional[str] = Field(None, description="Customer company name")
    product_name: Optional[str] = Field(None, description="Product / Item name")
    quantity: Optional[float] = Field(None, description="Quantity")
    quantity_unit: Optional[str] = Field("Units", description="Quantity unit")
    shipment_weight: Optional[float] = Field(None, description="Shipment weight")
    weight_unit: Optional[str] = Field("kg", description="Weight unit")
    shipment_value: Optional[float] = Field(None, description="Shipment monetary value")
    currency: Optional[str] = Field(None, description="Currency")
    origin_port: Optional[str] = Field(None, description="Origin port name")
    destination_port: Optional[str] = Field(None, description="Destination port name")
    shipment_status: Optional[str] = Field(None, description="Shipment status")
    current_delay_days: Optional[float] = Field(0.0, description="Current delay days")
    disruption_reason: Optional[str] = Field(None, description="Disruption reason")
    overrides: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Risk overrides")

    # Legacy technical fields
    route_id: str = Field("CUSTOM-001", description="Route ID, e.g. USER-001 or R00012")
    trade_volume_tonnes: float = Field(10000.0, ge=0.0, description="Trade volume in metric tonnes")
    container_availability_index: float = Field(50.0, ge=0.0, le=100.0, description="Container availability (0-100)")
    port_congestion_index: float = Field(50.0, ge=0.0, le=100.0, description="Port congestion index (0-100)")
    fuel_cost_index: float = Field(60.0, description="Fuel cost index")
    commodity_price_index: float = Field(60.0, description="Commodity price index")
    weather_disruption_score: float = Field(30.0, ge=0.0, le=100.0, description="Weather disruption score (0-100)")
    geopolitical_risk_score: float = Field(30.0, ge=0.0, le=100.0, description="Geopolitical risk score (0-100)")
    route_status: str = Field("Normal", description="Route status: Normal, Delayed, Disrupted")
    base_currency: str = Field("USD", description="Base currency (e.g. USD)")
    quote_currency: str = Field("USD", description="Quote currency")
    # Route Endpoints & Civil Timing
    origin_country: Optional[str] = Field(None, description="Origin country, e.g. Japan")
    origin_city: Optional[str] = Field(None, description="Origin city or port, e.g. Yokohama")
    destination_country: Optional[str] = Field(None, description="Destination country, e.g. United States")
    destination_city: Optional[str] = Field(None, description="Destination city or port, e.g. Los Angeles")
    departure_date: Optional[str] = Field(None, description="Departure date YYYY-MM-DD")
    departure_time: Optional[str] = Field("10:00", description="Departure time HH:MM")
    baseline_transit_days: Optional[float] = Field(None, description="Legitimate baseline ocean transit time in days")
    prediction_mode: str = Field("quick", description="Mode: 'quick' (steady-state baseline) or 'historical' (empirical)")
    historical_records: Optional[List[Dict[str, Any]]] = Field(None, description="Historical observations for Mode B")

    # Real Weather Prediction Integration Layer
    prediction_type: Optional[str] = Field("CURRENT", description="CURRENT or FUTURE risk analysis")
    country: Optional[str] = Field(None, description="Country for weather prediction")
    city: Optional[str] = Field(None, description="City for weather prediction")
    prediction_date: Optional[str] = Field(None, description="Prediction date YYYY-MM-DD")
    weather_prediction: Optional[Dict[str, Any]] = Field(None, description="Optional pre-computed weather model output")
    include_timeline: Optional[bool] = Field(False, description="Whether to include multi-date forecast timeline")

class SimulationRequest(BaseModel):
    # Support for user input simulation
    baseline_input: Optional[Dict[str, Any]] = Field(None, description="User's original baseline condition inputs")
    scenario_inputs: Optional[Dict[str, Any]] = Field(None, description="User's modified condition inputs for scenario")
    
    # Weather mode
    weather_mode: Optional[str] = Field("MANUAL", description="'MANUAL' or 'WEATHER_MODEL'")
    country: Optional[str] = Field(None, description="Country for weather model scenario")
    city: Optional[str] = Field(None, description="City for weather model scenario")
    prediction_date: Optional[str] = Field(None, description="Prediction date for weather model scenario")

    # Backward compatibility with delta request
    route_id: Optional[str] = Field(None, description="Route ID, e.g. R00012 or CUSTOM-001")
    congestion_change: float = Field(0.0, description="Delta in port congestion index (-30 to +30)")
    weather_change: float = Field(0.0, description="Delta in weather disruption score (-30 to +30)")
    geopolitical_change: float = Field(0.0, description="Delta in geopolitical risk score (-30 to +30)")
    container_change: float = Field(0.0, description="Delta in container availability index (-30 to +30)")

class ShipmentSimulateRequest(BaseModel):
    baselineShipment: Optional[Dict[str, Any]] = Field(None, description="Original baseline shipment dictionary")
    baseline_shipment: Optional[Dict[str, Any]] = Field(None, description="Snake_case alias for baseline shipment")
    baseline_input: Optional[Dict[str, Any]] = Field(None, description="Baseline input dictionary")
    scenario: Optional[Dict[str, Any]] = Field(None, description="Scenario conditions dictionary (port_congestion, weather, etc.)")
    scenario_inputs: Optional[Dict[str, Any]] = Field(None, description="Scenario conditions dictionary")
    weather_mode: Optional[str] = Field("MANUAL", description="'MANUAL' or 'WEATHER_MODEL'")
    country: Optional[str] = None
    city: Optional[str] = None
    prediction_date: Optional[str] = None

# ----------------- Health -----------------
@app.get("/api/health")
def get_health():
    """
    Production health check endpoint conforming to Section 20.
    Returns status: ok, environment: production/development, models_loaded: true/false.
    """
    models_loaded = False
    try:
        from backend.services.model_loader import get_models
        models = get_models()
        models_loaded = (
            models.disruption_model is not None and
            models.delay_model is not None and
            models.freight_cost_model is not None
        )
    except Exception as e:
        logger.error(f"Health check model load error: {e}")
        models_loaded = False

    wp = get_weather_predictor()
    weather_loaded = bool(wp.model_available)

    risk_engine = get_risk_engine()

    if models_loaded:
        return {
            "status": "ok",
            "environment": ENVIRONMENT,
            "models_loaded": True,
            "weather_model_loaded": weather_loaded,
            "dataset_loaded": risk_engine.is_loaded,
            "system": "Supply Guard 2.0"
        }
    else:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "environment": ENVIRONMENT,
                "models_loaded": False,
                "weather_model_loaded": weather_loaded,
                "system": "Supply Guard 2.0"
            }
        )

# ----------------- Weather Intelligence Layer (Trained ML Model) -----------------
@app.post("/api/weather/predict")
def predict_weather(req: WeatherPredictRequest):
    """
    DEDICATED WEATHER PREDICTION LAYER:
    Wraps the user's pre-trained worldwide weather classification model (weather_final.pkl).
    Outputs actual model classification, confidence, probabilities, and transformed
    weather disruption score for Supply Guard models.
    """
    wp = get_weather_predictor()
    if not wp.model_available:
        raise HTTPException(
            status_code=503,
            detail={"model_available": False, "error": "Weather prediction model unavailable."}
        )

    res = wp.predict(country=req.country, city=req.city, prediction_date=req.prediction_date)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res)

    if req.include_timeline:
        timeline_res = wp.predict_timeline(
            country=req.country,
            city=req.city,
            start_date=req.prediction_date,
            horizons=req.horizons or [1, 3, 7, 10]
        )
        if "timeline" in timeline_res:
            res["timeline"] = timeline_res["timeline"]

    return res

@app.get("/api/weather/locations")
def get_weather_locations():
    """
    Returns list of global hub locations supported by the pre-trained weather model.
    """
    wp = get_weather_predictor()
    return {
        "model_available": wp.model_available,
        "total_locations": len(wp.get_supported_locations()),
        "locations": wp.get_supported_locations()
    }

# ----------------- Port & Maritime Route Intelligence -----------------
@app.get("/api/ports")
def get_ports():
    """
    Returns the comprehensive list of global ports with IANA timezones and currencies.
    """
    ports = get_all_registered_ports()
    return {
        "total_ports": len(ports),
        "ports": ports
    }

@app.post("/api/routes/transit-estimate")
def get_transit_estimate(req: TransitEstimateRequest):
    """
    Looks up legitimate baseline transit days and distance from trade_routes.csv or maritime physics.
    Also returns deduced currency pairs, route type (Known vs Custom), and timezone information.
    """
    from backend.services.intelligence_engine import get_intelligence_engine
    ie = get_intelligence_engine()
    route_meta = ie.identify_route(
        origin_country=req.origin_country,
        dest_country=req.destination_country,
        origin_city=req.origin_city or "",
        dest_city=req.destination_city or ""
    )
    base_curr, quote_curr, curr_pair = deduce_currency_pair(req.origin_country, req.destination_country)
    origin_port = find_port(req.origin_city or "", req.origin_country)
    dest_port = find_port(req.destination_city or "", req.destination_country)

    return {
        "route_id": route_meta["route_id"],
        "route_type": route_meta["route_type"],
        "is_known_route": route_meta["is_known_route"],
        "baseline_transit_days": route_meta["baseline_transit_days"],
        "distance_km": route_meta["distance_km"],
        "shipping_method": route_meta["shipping_method"],
        "trade_route_type": route_meta["trade_route_type"],
        "transit_source": route_meta["transit_source"],
        "source": route_meta["transit_source"],
        "base_currency": base_curr,
        "quote_currency": quote_curr,
        "currency_pair": curr_pair,
        "origin_port": origin_port,
        "destination_port": dest_port
    }

# ----------------- New Shipment Risk Analysis Flow (Section 17) -----------------
@app.post("/api/analyze-shipment")
@app.post("/api/shipment/analyze")
def analyze_shipment_endpoint(req: ShipmentRiskRequest):
    """
    PRIMARY USER WORKFLOW — NEW SHIPMENT RISK ANALYSIS (Section 17):
    Validates business shipment parameters, derives route metadata, baseline transit,
    origin weather, port congestion, container availability, and geopolitical risk.
    Executes LightGBM ML models, calculates route timeline across timezones,
    evaluates destination arrival weather, converts currency, and computes business exposure.
    """
    risk_engine = get_risk_engine()
    try:
        data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
        result = risk_engine.analyze_shipment(data)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shipment risk analysis error: {str(e)}")

# ----------------- Legacy Compatibility Flow: User Input -> ML Prediction -----------------
@app.post("/api/predict")
def predict_risk(req: PredictRequest):
    """
    PRIMARY USER WORKFLOW:
    Validates user route conditions, constructs features (Mode A steady-state or Mode B empirical history),
    runs LightGBM models, assesses network risk if in trade topology,
    calculates business exposure, and produces deterministic recommendations.
    Supports CURRENT conditions and FUTURE weather risk analysis.
    """
    risk_engine = get_risk_engine()
    try:
        data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
        result = risk_engine.predict_single_route(data)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction inference error: {str(e)}")

@app.post("/api/risk/predict")
def predict_risk_endpoint(req: PredictRequest):
    """
    EXTENDED RISK PREDICTION:
    Dedicated endpoint accepting route conditions, country, city, and prediction date.
    Integrates trained weather model predictions into the Supply Guard risk engine.
    """
    if req.prediction_type != "FUTURE":
        req.prediction_type = "FUTURE"
    return predict_risk(req)

# ----------------- Scenario Simulator -----------------
@app.post("/api/simulate")
def run_simulation(req: SimulationRequest):
    """
    STRESS TEST A ROUTE:
    Starts from the user's actual input conditions (or loaded route),
    applies modifications (manual or Weather Model Forecast),
    runs real LightGBM models, and returns BASELINE vs SCENARIO comparison.
    """
    risk_engine = get_risk_engine()

    # Case 1: Explicit baseline_input and scenario_inputs provided
    if req.baseline_input and req.scenario_inputs:
        scenario_in = dict(req.scenario_inputs)
        if req.weather_mode and "weather_mode" not in scenario_in:
            scenario_in["weather_mode"] = req.weather_mode
        if req.country and "country" not in scenario_in:
            scenario_in["country"] = req.country
        if req.city and "city" not in scenario_in:
            scenario_in["city"] = req.city
        if req.prediction_date and "prediction_date" not in scenario_in:
            scenario_in["prediction_date"] = req.prediction_date

        try:
            return risk_engine.simulate_custom_scenario(req.baseline_input, scenario_in)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

    # Case 2: User has a recent single prediction and passed route_id + changes
    if req.route_id and risk_engine.latest_single_prediction and risk_engine.latest_single_prediction["route_id"] == req.route_id:
        baseline_input = risk_engine.latest_single_prediction["raw_input"]
        scenario_inputs = {
            "port_congestion_index": baseline_input["port_congestion_index"] + req.congestion_change,
            "weather_disruption_score": baseline_input["weather_disruption_score"] + req.weather_change,
            "geopolitical_risk_score": baseline_input["geopolitical_risk_score"] + req.geopolitical_change,
            "container_availability_index": baseline_input["container_availability_index"] + req.container_change,
            "weather_mode": req.weather_mode or "MANUAL",
            "country": req.country,
            "city": req.city,
            "prediction_date": req.prediction_date
        }
        try:
            return risk_engine.simulate_custom_scenario(baseline_input, scenario_inputs)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

    # Case 3: Batch simulation from loaded dataset (e.g. R00012)
    if req.route_id and risk_engine.is_loaded:
        scenario_engine = get_scenario_engine()
        try:
            return scenario_engine.run_simulation(
                route_id=req.route_id.upper(),
                congestion_change=req.congestion_change,
                weather_change=req.weather_change,
                geopolitical_change=req.geopolitical_change,
                container_change=req.container_change
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    raise HTTPException(
        status_code=400,
        detail="To run a simulation, either perform a Risk Analysis first or provide baseline_input and scenario_inputs."
    )

@app.post("/api/shipment/simulate")
def simulate_shipment_endpoint(req: ShipmentSimulateRequest):
    """
    PRIMARY SHIPMENT SIMULATION FLOW (Section 20):
    Accepts { baselineShipment, scenario }, runs the exact LightGBM ML models again
    under modified scenario conditions, and returns:
    { baseline, scenario, changes, timeline, businessImpact, explanation }.
    """
    risk_engine = get_risk_engine()
    baseline = req.baselineShipment or req.baseline_shipment or req.baseline_input
    scenario = req.scenario or req.scenario_inputs

    if not baseline and risk_engine.latest_single_prediction:
        baseline = risk_engine.latest_single_prediction.get("raw_shipment") or risk_engine.latest_single_prediction.get("raw_input")

    if not baseline or not scenario:
        raise HTTPException(
            status_code=400,
            detail="Both baselineShipment and scenario modifications are required for shipment simulation."
        )

    scenario_in = dict(scenario)
    if req.weather_mode and "weather_mode" not in scenario_in:
        scenario_in["weather_mode"] = req.weather_mode
    if req.country and "country" not in scenario_in:
        scenario_in["country"] = req.country
    if req.city and "city" not in scenario_in:
        scenario_in["city"] = req.city
    if req.prediction_date and "prediction_date" not in scenario_in:
        scenario_in["prediction_date"] = req.prediction_date

    try:
        return risk_engine.simulate_custom_scenario(baseline, scenario_in)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shipment simulation error: {str(e)}")

# ----------------- Dataset Management & Upload (Optional Advanced) -----------------
@app.post("/api/data/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Optional Advanced Feature: Accepts CSV upload, validates schema and types,
    then executes batch feature engineering and predictions across all routes.
    """
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV files are supported.")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 50 MB.")

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    risk_engine = get_risk_engine()
    try:
        summary = risk_engine.validate_and_load_dataframe(
            df=df,
            dataset_name=file.filename,
            is_demo=False
        )
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error processing dataset: {str(e)}")

@app.post("/api/data/load-demo")
def load_demo():
    """Optional action: Explicitly loads the demonstration dataset."""
    risk_engine = get_risk_engine()
    try:
        summary = risk_engine.load_demo_dataset()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load demo dataset: {str(e)}")

@app.post("/api/data/clear")
def clear_data():
    """Resets the application session to the fresh startup state."""
    risk_engine = get_risk_engine()
    risk_engine.clear_dataset()
    return {
        "success": True,
        "message": "Dataset cleared. Application reset to fresh empty state."
    }

@app.get("/api/data/status")
def get_data_status():
    """Returns the current dataset session status."""
    risk_engine = get_risk_engine()
    return {
        "is_loaded": risk_engine.is_loaded,
        "is_demo": risk_engine.is_demo,
        "dataset_name": risk_engine.dataset_name,
        "records": risk_engine.records_count,
        "routes": risk_engine.routes_count,
        "date_min": risk_engine.date_min,
        "date_max": risk_engine.date_max,
        "columns": risk_engine.detected_columns,
        "insufficient_history_routes": list(risk_engine.routes_with_insufficient_data),
        "available_routes": sorted(list(risk_engine.route_predictions.keys())),
        "has_single_prediction": risk_engine.latest_single_prediction is not None
    }

# ----------------- Dashboard & Batch Views -----------------
@app.get("/api/dashboard")
def get_dashboard():
    risk_engine = get_risk_engine()
    return risk_engine.get_dashboard_kpis()

@app.get("/api/routes")
def get_routes(
    risk_level: Optional[str] = Query(None, description="Filter by risk level: LOW, MEDIUM, HIGH, CRITICAL"),
    search: Optional[str] = Query(None, description="Search by route ID, origin, or destination"),
    sort_by: Optional[str] = Query("score_desc", description="Sort criteria: score_desc, score_asc, delay_desc, volume_desc")
):
    risk_engine = get_risk_engine()
    if not risk_engine.is_loaded:
        return {"total": 0, "routes": []}

    routes = risk_engine.get_all_routes_summary()

    if search:
        s = search.lower().strip()
        routes = [
            r for r in routes
            if s in r["route_id"].lower()
            or s in r["origin"].lower()
            or s in r["destination"].lower()
        ]

    if risk_level and risk_level.upper() != "ALL":
        routes = [r for r in routes if r["risk_level"].upper() == risk_level.upper()]

    if sort_by == "score_desc":
        routes.sort(key=lambda x: x["supply_guard_score"], reverse=True)
    elif sort_by == "score_asc":
        routes.sort(key=lambda x: x["supply_guard_score"])
    elif sort_by == "delay_desc":
        routes.sort(key=lambda x: x["predicted_delay_days"], reverse=True)
    elif sort_by == "volume_desc":
        routes.sort(key=lambda x: x["trade_volume_tonnes"], reverse=True)

    return {
        "total": len(routes),
        "routes": routes
    }

@app.get("/api/routes/{route_id}")
def get_route_detail(route_id: str):
    risk_engine = get_risk_engine()
    r_id = route_id.upper()
    route = risk_engine.get_route_risk(r_id)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found.")
    return route

@app.post("/api/routes/{route_id}/analyze")
def analyze_single_route(route_id: str):
    risk_engine = get_risk_engine()
    r_id = route_id.upper()
    route = risk_engine.get_route_risk(r_id)
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found.")

    return {
        "route_id": r_id,
        "status": "success",
        "latest_record": {
            "trade_volume_tonnes": route.get("trade_volume_tonnes", 0),
            "port_congestion_index": route.get("port_congestion_index", 0),
            "weather_disruption_score": route.get("weather_disruption_score", 0),
            "geopolitical_risk_score": route.get("geopolitical_risk_score", 0),
            "container_availability_index": route.get("container_availability_index", 0),
            "fuel_cost_index": route.get("fuel_cost_index", 0),
            "commodity_price_index": route.get("commodity_price_index", 0),
        },
        "disruption_probability": route["disruption_probability"],
        "disruption_probability_percent": route["disruption_probability_percent"],
        "predicted_delay_days": route["predicted_delay_days"],
        "predicted_freight_cost_usd": route["predicted_freight_cost_usd"],
        "risk_level": route["risk_level"],
        "risk_score": route["supply_guard_score"],
        "supply_guard_score": route["supply_guard_score"],
        "ripple_risk_score": route.get("ripple_risk_score", 0.0)
    }

@app.get("/api/routes/{route_id}/network")
def get_route_network_endpoint(
    route_id: str,
    origin_country: Optional[str] = None,
    destination_country: Optional[str] = None
):
    """Returns network connectivity and ripple exposure for any route in topology."""
    network_engine = get_network_engine()
    r_id = route_id.upper()

    risk_engine = get_risk_engine()
    disruption_map = {}
    if risk_engine.is_loaded and risk_engine.route_predictions:
        disruption_map = {r: p["disruption_probability"] for r, p in risk_engine.route_predictions.items()}
    elif risk_engine.latest_single_prediction:
        disruption_map[risk_engine.latest_single_prediction.get("route_id", "")] = risk_engine.latest_single_prediction.get("disruption_probability", 0.1)

    exposure = network_engine.calculate_ripple_risk(
        r_id,
        disruption_map,
        origin_country=origin_country,
        destination_country=destination_country
    )
    exposure["available"] = True
    exposure["message"] = f"Connected corridor identified in trade network topology ({exposure['direct_routes_count']} direct links)."
    return exposure

@app.get("/api/routes/{route_id}/history")
def get_route_history_endpoint(route_id: str, limit: int = 52):
    """Returns historical route observations if present in active dataset."""
    risk_engine = get_risk_engine()
    r_id = route_id.upper()
    history = risk_engine.get_route_history(r_id, limit=limit)
    return {
        "route_id": r_id,
        "total_records": len(history),
        "history": history,
        "message": "Historical records from loaded dataset" if history else "No historical records available for this route ID. Use Mode B to supply historical observations."
    }

@app.get("/api/routes/{route_id}/impact")
def get_route_impact_endpoint(route_id: str):
    risk_engine = get_risk_engine()
    impact_engine = get_business_impact_engine()
    impact = impact_engine.get_route_impact(route_id.upper())
    if not impact:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found.")
    return impact

@app.get("/api/routes/{route_id}/recommendations")
def get_route_recommendations_endpoint(route_id: str):
    risk_engine = get_risk_engine()
    route = risk_engine.get_route_risk(route_id.upper())
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found.")
    rec_engine = get_recommendation_engine()
    recs = rec_engine.generate_route_recommendations(route)
    return {
        "route_id": route["route_id"],
        "total_recommendations": len(recs),
        "recommendations": recs
    }

@app.get("/api/routes/{route_id}/explain")
def get_route_explanation(route_id: str):
    risk_engine = get_risk_engine()
    route = risk_engine.get_route_risk(route_id.upper())
    if not route:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found.")
    rec_engine = get_recommendation_engine()
    recs = rec_engine.generate_route_recommendations(route)
    explainer = get_gemini_explainer()
    explanation = explainer.explain_route(route, recs)
    return {
        "route_id": route["route_id"],
        "explanation": explanation
    }

@app.get("/api/network")
def get_network():
    risk_engine = get_risk_engine()
    network_engine = get_network_engine()
    preds = risk_engine.route_predictions if (risk_engine.is_loaded and risk_engine.route_predictions) else {}
    return network_engine.get_network_graph(preds)

@app.get("/api/business-impact")
def get_business_impact():
    risk_engine = get_risk_engine()
    if not risk_engine.is_loaded:
        return {
            "total_trade_volume_tonnes": 0.0,
            "total_volume_at_risk_tonnes": 0.0,
            "total_delay_exposure_tonne_days": 0.0,
            "total_freight_exposure_usd": 0.0,
            "top_routes_by_volume_at_risk": [],
            "top_routes_by_freight_exposure": [],
            "risk_vs_volume_scatter": [],
            "disclaimer": "All metrics represent statistical Estimated Exposure based on disruption probability. No active dataset loaded."
        }
    impact_engine = get_business_impact_engine()
    return impact_engine.get_business_impact_overview()

@app.get("/api/recommendations")
def get_recommendations():
    risk_engine = get_risk_engine()
    if not risk_engine.is_loaded:
        return {"total": 0, "recommendations": []}
    rec_engine = get_recommendation_engine()
    recs = rec_engine.get_all_recommendations()
    return {
        "total": len(recs),
        "recommendations": recs
    }

@app.post("/api/report")
def generate_report():
    risk_engine = get_risk_engine()
    kpis = risk_engine.get_dashboard_kpis()
    top_routes = kpis.get("top_risk_routes", [])
    explainer = get_gemini_explainer()
    report_text = explainer.generate_executive_report(kpis, top_routes)
    return {
        "generated_at": pd.Timestamp.now().isoformat(),
        "report_title": f"Supply Guard 2.0 Risk Intelligence Report — {risk_engine.dataset_name or 'Interactive Session'}",
        "report_markdown": report_text,
        "kpis_snapshot": kpis
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
