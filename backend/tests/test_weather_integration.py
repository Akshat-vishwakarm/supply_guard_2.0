import pytest
from fastapi.testclient import TestClient
try:
    from main import app
    from services.risk_engine import get_risk_engine
except ImportError:
    from backend.main import app
    from backend.services.risk_engine import get_risk_engine

client = TestClient(app)

def setup_function():
    get_risk_engine().clear_dataset()

def test_weather_predict_endpoint_tokyo():
    """Validates real weather model output for Tokyo on 2026-10-05."""
    payload = {
        "country": "Japan",
        "city": "Tokyo",
        "prediction_date": "2026-10-05",
        "include_timeline": True,
        "horizons": [1, 3, 7, 10]
    }
    res = client.post("/api/weather/predict", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["model_available"] is True
    assert data["country"] == "Japan"
    assert data["city"] == "Tokyo"
    assert data["prediction_date"] == "2026-10-05"
    assert data["prediction"] in ["Cloudy", "Rainy", "Snowy", "Sunny"]
    assert "probabilities" in data
    assert sum(data["probabilities"].values()) > 0.99
    assert 0.0 <= data["weather_disruption_score"] <= 100.0
    assert "timeline" in data
    assert len(data["timeline"]) == 4

def test_weather_locations():
    """Validates supported locations endpoint returns 22 hub cities."""
    res = client.get("/api/weather/locations")
    assert res.status_code == 200
    data = res.json()
    assert data["model_available"] is True
    assert data["total_locations"] >= 22
    cities = [loc["city"].lower() for loc in data["locations"]]
    assert "tokyo" in cities
    assert "mumbai" in cities

def test_weather_predict_unsupported_city():
    """Validates error message when location is outside model's supported range."""
    payload = {
        "country": "Atlantis",
        "city": "Underwater City",
        "prediction_date": "2026-10-05"
    }
    res = client.post("/api/weather/predict", json=payload)
    assert res.status_code == 400
    data = res.json()
    assert "error" in data["detail"]
    assert "outside the weather model's supported cities" in data["detail"]["error"]

def test_future_risk_analysis_with_weather():
    """
    Validates end-to-end integration:
    User Input (Tokyo, 2026-10-05) -> Weather Model -> Weather Disruption Score -> Supply Guard ML -> Risk Prediction.
    """
    payload = {
        "route_id": "CUSTOM-001",
        "trade_volume_tonnes": 15000,
        "port_congestion_index": 70,
        "container_availability_index": 40,
        "geopolitical_risk_score": 55,
        "fuel_cost_index": 60,
        "commodity_price_index": 60,
        "prediction_type": "FUTURE",
        "country": "Japan",
        "city": "Tokyo",
        "prediction_date": "2026-10-05",
        "include_timeline": True
    }
    res = client.post("/api/risk/predict", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["prediction_type"] == "FUTURE"
    assert "weather_forecast" in data and data["weather_forecast"] is not None
    assert data["weather_forecast"]["city"] == "Tokyo"
    assert data["weather_forecast"]["country"] == "Japan"
    
    # Weather score is fed into risk factors
    weather_score = data["weather_forecast"]["weather_disruption_score"]
    assert data["risk_factors"]["weather_disruption_score"] == weather_score

    # Supply Guard models ran on this score
    assert 0.0 <= data["disruption_probability"] <= 1.0
    assert data["predicted_delay_days"] >= 0.0
    assert data["predicted_freight_cost_usd"] >= 0.0
    assert 0.0 <= data["supply_guard_score"] <= 100.0

    # Weather impact is computed
    impact = data["weather_impact"]
    assert impact is not None
    assert "disruption_prob_delta_percent" in impact
    assert "delay_delta_days" in impact

    # Forecast timeline is included
    assert "forecast_timeline" in data and len(data["forecast_timeline"]) == 4

def test_scenario_simulator_with_weather_model():
    """
    Validates Scenario Simulator using WEATHER_MODEL forecast.
    """
    baseline_input = {
        "route_id": "CUSTOM-001",
        "trade_volume_tonnes": 15000,
        "port_congestion_index": 70,
        "container_availability_index": 40,
        "geopolitical_risk_score": 55,
        "weather_disruption_score": 30
    }
    scenario_inputs = {
        "weather_mode": "WEATHER_MODEL",
        "country": "Japan",
        "city": "Tokyo",
        "prediction_date": "2026-10-05",
        "port_congestion_index": 75
    }
    payload = {
        "baseline_input": baseline_input,
        "scenario_inputs": scenario_inputs
    }
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["weather_mode"] == "WEATHER_MODEL"
    assert data["weather_forecast"] is not None
    assert data["weather_forecast"]["city"] == "Tokyo"
    
    # Check baseline vs scenario comparison
    base = data["baseline"]
    scen = data["scenario"]
    delta = data["delta"]

    assert base["conditions"]["weather_disruption_score"] == 30.0
    assert scen["conditions"]["weather_disruption_score"] == data["weather_forecast"]["weather_disruption_score"]
    assert "weather_risk_delta" in delta
    assert delta["weather_risk_delta"] == round(scen["conditions"]["weather_disruption_score"] - 30.0, 1)
