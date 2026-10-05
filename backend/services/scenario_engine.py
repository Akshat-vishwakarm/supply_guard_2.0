from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
from backend.config import (
    WEIGHT_DISRUPTION,
    WEIGHT_DELAY,
    WEIGHT_RIPPLE,
    DELAY_NORM_MAX_DAYS,
    get_risk_level
)
from backend.services.model_loader import get_models
from backend.services.feature_engineering import compute_simulated_features
from backend.services.risk_engine import get_risk_engine
from backend.services.network_engine import get_network_engine

class ScenarioEngine:
    def __init__(self):
        pass

    def run_simulation(
        self,
        route_id: str,
        congestion_change: float = 0.0,
        weather_change: float = 0.0,
        geopolitical_change: float = 0.0,
        container_change: float = 0.0
    ) -> Dict[str, Any]:
        risk_engine = get_risk_engine()
        if not risk_engine.is_loaded:
            raise ValueError("No active dataset loaded in session. Please upload or load a dataset first.")

        models = get_models()
        network_engine = get_network_engine()

        if route_id not in risk_engine.latest_rows:
            raise ValueError(f"Route '{route_id}' not found in active dataset.")

        baseline_row = risk_engine.latest_rows[route_id]
        baseline_pred = risk_engine.get_route_risk(route_id)
        if not baseline_pred:
            raise ValueError(f"Route '{route_id}' analysis not available.")

        # 1. Recompute features under shock conditions
        sim_X = compute_simulated_features(
            baseline_row=baseline_row,
            congestion_change=congestion_change,
            weather_change=weather_change,
            geopolitical_change=geopolitical_change,
            container_change=container_change
        )

        # 2. Pass through REAL trained LightGBM models
        sim_disrupt_prob = float(models.disruption_model.predict_proba(sim_X)[0, 1])
        sim_pred_delay = max(0.0, float(models.delay_model.predict(sim_X)[0]))
        sim_pred_cost = max(0.0, float(models.freight_cost_model.predict(sim_X)[0]))

        # 3. Simulate network ripple risk effect
        disrupt_map = {
            r: info["disruption_probability"]
            for r, info in risk_engine.route_predictions.items()
        }
        disrupt_map[route_id] = sim_disrupt_prob

        sim_net_exposure = network_engine.calculate_ripple_risk(route_id, disrupt_map)
        sim_ripple_score = sim_net_exposure["ripple_risk_score"]

        # 4. Calculate simulated Supply Guard Score
        sim_delay_score = float(np.clip(sim_pred_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
        sim_score = (
            WEIGHT_DISRUPTION * sim_disrupt_prob
            + WEIGHT_DELAY * sim_delay_score
            + WEIGHT_RIPPLE * (sim_ripple_score / 100.0)
        ) * 100.0
        sim_score = round(float(np.clip(sim_score, 0.0, 100.0)), 2)
        sim_risk_lvl = get_risk_level(sim_score)

        # Baseline values
        base_disrupt_pct = baseline_pred["disruption_probability_percent"]
        base_delay = baseline_pred["predicted_delay_days"]
        base_cost = baseline_pred["predicted_freight_cost_usd"]
        base_score = baseline_pred["supply_guard_score"]
        base_risk_lvl = baseline_pred["risk_level"]
        base_ripple = baseline_pred["ripple_risk_score"]

        # Simulated values
        sim_disrupt_pct = round(sim_disrupt_prob * 100.0, 2)
        sim_delay_rounded = round(sim_pred_delay, 2)
        sim_cost_rounded = round(sim_pred_cost, 2)

        # Changes (deltas)
        diff_disrupt_pp = round(sim_disrupt_pct - base_disrupt_pct, 2)
        diff_delay_days = round(sim_delay_rounded - base_delay, 2)
        diff_cost_usd = round(sim_cost_rounded - base_cost, 2)
        diff_score = round(sim_score - base_score, 2)
        diff_ripple = round(sim_ripple_score - base_ripple, 2)

        return {
            "route_id": route_id,
            "corridor": f"{baseline_pred['origin']} → {baseline_pred['destination']}",
            "applied_shocks": {
                "port_congestion_change": congestion_change,
                "weather_disruption_change": weather_change,
                "geopolitical_risk_change": geopolitical_change,
                "container_availability_change": container_change
            },
            "baseline": {
                "disruption_probability": round(base_disrupt_pct / 100.0, 4),
                "disruption_probability_percent": base_disrupt_pct,
                "predicted_delay_days": base_delay,
                "predicted_freight_cost_usd": base_cost,
                "risk_score": base_score,
                "supply_guard_score": base_score,
                "ripple_risk_score": base_ripple,
                "risk_level": base_risk_lvl,
                "port_congestion_index": baseline_pred["port_congestion_index"],
                "weather_disruption_score": baseline_pred["weather_disruption_score"],
                "geopolitical_risk_score": baseline_pred["geopolitical_risk_score"],
                "container_availability_index": baseline_pred["container_availability_index"]
            },
            "scenario": {
                "disruption_probability": round(sim_disrupt_pct / 100.0, 4),
                "disruption_probability_percent": sim_disrupt_pct,
                "predicted_delay_days": sim_delay_rounded,
                "predicted_freight_cost_usd": sim_cost_rounded,
                "risk_score": sim_score,
                "supply_guard_score": sim_score,
                "ripple_risk_score": sim_ripple_score,
                "risk_level": sim_risk_lvl,
                "port_congestion_index": round(float(sim_X["port_congestion_index"].iloc[0]), 2),
                "weather_disruption_score": round(float(sim_X["weather_disruption_score"].iloc[0]), 2),
                "geopolitical_risk_score": round(float(sim_X["geopolitical_risk_score"].iloc[0]), 2),
                "container_availability_index": round(float(sim_X["container_availability_index"].iloc[0]), 2)
            },
            "changes": {
                "disruption_probability_change_pp": diff_disrupt_pp,
                "predicted_delay_change_days": diff_delay_days,
                "predicted_freight_cost_change_usd": diff_cost_usd,
                "supply_guard_score_change": diff_score,
                "ripple_risk_change": diff_ripple,
                "risk_level_changed": base_risk_lvl != sim_risk_lvl
            },
            "delta": {
                "disruption_delta": diff_disrupt_pp,
                "delay_delta": diff_delay_days,
                "freight_delta": diff_cost_usd,
                "risk_score_delta": diff_score,
                "ripple_delta": diff_ripple
            }
        }

_scenario_engine = None

def get_scenario_engine() -> ScenarioEngine:
    global _scenario_engine
    if _scenario_engine is None:
        _scenario_engine = ScenarioEngine()
    return _scenario_engine
