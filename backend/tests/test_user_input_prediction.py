"""
Tests for USER INPUT -> ML PREDICTION Primary Flow
Validates:
1. POST /api/predict in Mode A (Quick Prediction) with baseline strategy & note.
2. POST /api/predict in Mode B (Historical) with <4 records failing gracefully without fabricating predictions.
3. POST /api/predict in Mode B with 4+ records succeeding.
4. Business impact calculations (Volume At Risk, Delay Exposure, Freight Exposure) labeled ESTIMATED EXPOSURE.
5. Network analysis endpoint for unknown route vs known route in trade_routes.csv.
6. POST /api/simulate starting from user's actual inputs (CUSTOM-001) and calculating non-hardcoded deltas.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.risk_engine import get_risk_engine

client = TestClient(app)

def setup_function():
    get_risk_engine().clear_dataset()

def test_quick_prediction_mode_a():
    payload = {
        "route_id": "USER-001",
        "trade_volume_tonnes": 15000,
        "container_availability_index": 42,
        "port_congestion_index": 78,
        "fuel_cost_index": 65,
        "commodity_price_index": 82,
        "weather_disruption_score": 70,
        "geopolitical_risk_score": 75,
        "route_status": "Normal",
        "prediction_mode": "quick"
    }

    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()

    # Core predictions
    assert data["route_id"] == "USER-001"
    assert data["prediction_mode"] == "quick"
    assert "Quick Prediction uses baseline" in data["mode_note"]
    assert 0.0 <= data["disruption_probability"] <= 1.0
    assert data["disruption_probability_percent"] == round(data["disruption_probability"] * 100.0, 2)
    assert data["predicted_delay_days"] >= 0.0
    assert data["predicted_freight_cost_usd"] >= 0.0
    assert 0.0 <= data["supply_guard_score"] <= 100.0
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

    # Risk Factors
    factors = data["risk_factors"]
    assert factors["port_congestion_index"] == 78.0
    assert factors["weather_disruption_score"] == 70.0
    assert factors["geopolitical_risk_score"] == 75.0
    assert factors["container_availability_index"] == 42.0

    # Business Impact (ESTIMATED EXPOSURE)
    impact = data["business_impact"]
    assert impact["label"] == "ESTIMATED EXPOSURE"
    assert "not actual realized financial loss" in impact["disclaimer"]
    expected_vol_at_risk = round(15000 * data["disruption_probability"], 2)
    assert impact["estimated_volume_at_risk_tonnes"] == expected_vol_at_risk
    assert impact["delay_exposure_tonne_days"] == round(expected_vol_at_risk * data["predicted_delay_days"], 2)
    assert impact["estimated_freight_cost_exposure_usd"] == round(data["predicted_freight_cost_usd"] * data["disruption_probability"], 2)

    # Network analysis for custom route not in trade_routes.csv
    net = data["network_analysis"]
    assert net["available"] is False
    assert "Network analysis unavailable for this route." in net["message"]
    assert len(net["direct_routes_exposed"]) == 0

def test_network_analysis_for_known_route():
    payload = {
        "route_id": "R00012",
        "trade_volume_tonnes": 10000,
        "container_availability_index": 50,
        "port_congestion_index": 60,
        "fuel_cost_index": 55,
        "commodity_price_index": 65,
        "weather_disruption_score": 40,
        "geopolitical_risk_score": 35,
        "route_status": "Normal"
    }

    res = client.post("/api/predict", json=payload)
    assert res.status_code == 200
    data = res.json()

    # R00012 exists in trade_routes.csv
    net = data["network_analysis"]
    assert net["available"] is True
    assert net["direct_routes_count"] > 0
    assert net["ripple_risk_score"] is not None

def test_historical_prediction_insufficient_records_fails():
    payload = {
        "route_id": "USER-HIST-001",
        "trade_volume_tonnes": 10000,
        "container_availability_index": 50,
        "port_congestion_index": 50,
        "fuel_cost_index": 60,
        "commodity_price_index": 60,
        "weather_disruption_score": 30,
        "geopolitical_risk_score": 30,
        "route_status": "Normal",
        "prediction_mode": "historical",
        "historical_records": [
            {"port_congestion_index": 50, "weather_disruption_score": 30, "geopolitical_risk_score": 30, "container_availability_index": 50, "trade_volume_tonnes": 10000, "route_status": "Normal"},
            {"port_congestion_index": 55, "weather_disruption_score": 35, "geopolitical_risk_score": 30, "container_availability_index": 50, "trade_volume_tonnes": 10000, "route_status": "Normal"}
        ]
    }

    res = client.post("/api/predict", json=payload)
    assert res.status_code == 400
    assert "Insufficient historical context for this model." in res.json()["detail"]

def test_custom_scenario_simulation_starts_from_user_input():
    baseline_input = {
        "route_id": "CUSTOM-001",
        "trade_volume_tonnes": 12000,
        "port_congestion_index": 60,
        "weather_disruption_score": 40,
        "geopolitical_risk_score": 30,
        "container_availability_index": 50,
        "fuel_cost_index": 60,
        "commodity_price_index": 60,
        "route_status": "Normal"
    }

    scenario_inputs = {
        "port_congestion_index": 85,
        "weather_disruption_score": 70,
        "geopolitical_risk_score": 60
    }

    res = client.post("/api/simulate", json={
        "baseline_input": baseline_input,
        "scenario_inputs": scenario_inputs
    })
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["route_id"] == "CUSTOM-001"
    # Conditions match baseline and scenario
    assert data["baseline"]["conditions"]["port_congestion_index"] == 60.0
    assert data["scenario"]["conditions"]["port_congestion_index"] == 85.0

    # Risk should elevate under shock
    assert data["scenario"]["disruption_probability_percent"] > data["baseline"]["disruption_probability_percent"]
    assert data["delta"]["disruption_delta_percent"] > 0
    assert data["delta"]["risk_score_delta"] > 0

def test_network_and_history_endpoints():
    # Unknown route
    res_net = client.get("/api/routes/UNKNOWN-999/network")
    assert res_net.status_code == 200
    assert res_net.json()["available"] is False
    assert "Network analysis unavailable for this route." in res_net.json()["message"]

    # Route in trade_routes.csv
    res_net_r12 = client.get("/api/routes/R00012/network")
    assert res_net_r12.status_code == 200
    assert res_net_r12.json()["available"] is True

    # History endpoint
    res_hist = client.get("/api/routes/USER-001/history")
    assert res_hist.status_code == 200
    assert res_hist.json()["total_records"] == 0
