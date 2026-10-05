import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional

FEATURE_COLUMNS = [
    "trade_volume_tonnes",
    "container_availability_index",
    "port_congestion_index",
    "fuel_cost_index",
    "commodity_price_index",
    "weather_disruption_score",
    "geopolitical_risk_score",
    "congestion_lag_1",
    "congestion_lag_2",
    "congestion_rolling_4",
    "weather_lag_1",
    "weather_rolling_4",
    "geopolitical_lag_1",
    "geopolitical_rolling_4",
    "container_lag_1",
    "previous_was_disrupted",
    "congestion_change_1w",
    "congestion_change_2w",
    "weather_change_1w",
    "geopolitical_change_1w",
    "container_change_1w"
]

def create_supply_guard_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes all historical rolling, lag, status, and trend features
    for the Supply Guard operational dataset.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["route_id", "date"]).reset_index(drop=True)

    # Historical congestion features
    df["congestion_lag_1"] = df.groupby("route_id")["port_congestion_index"].shift(1)
    df["congestion_lag_2"] = df.groupby("route_id")["port_congestion_index"].shift(2)
    df["congestion_rolling_4"] = df.groupby("route_id")["port_congestion_index"].transform(
        lambda x: x.shift(1).rolling(4).mean()
    )

    # Weather history
    df["weather_lag_1"] = df.groupby("route_id")["weather_disruption_score"].shift(1)
    df["weather_rolling_4"] = df.groupby("route_id")["weather_disruption_score"].transform(
        lambda x: x.shift(1).rolling(4).mean()
    )

    # Geopolitical history
    df["geopolitical_lag_1"] = df.groupby("route_id")["geopolitical_risk_score"].shift(1)
    df["geopolitical_rolling_4"] = df.groupby("route_id")["geopolitical_risk_score"].transform(
        lambda x: x.shift(1).rolling(4).mean()
    )

    # Container availability history
    df["container_lag_1"] = df.groupby("route_id")["container_availability_index"].shift(1)

    # Previous route status
    df["previous_status"] = df.groupby("route_id")["route_status"].shift(1)
    df["previous_was_disrupted"] = df["previous_status"].isin(["Disrupted", "Delayed"]).astype(int)

    # Trend features
    df["congestion_change_1w"] = df["port_congestion_index"] - df["congestion_lag_1"]
    df["congestion_change_2w"] = df["port_congestion_index"] - df["congestion_lag_2"]
    df["weather_change_1w"] = df["weather_disruption_score"] - df["weather_lag_1"]
    df["geopolitical_change_1w"] = df["geopolitical_risk_score"] - df["geopolitical_lag_1"]
    df["container_change_1w"] = df["container_availability_index"] - df["container_lag_1"]

    return df

def prepare_model_input(df: pd.DataFrame) -> pd.DataFrame:
    """
    Creates features and drops rows with incomplete historical windows.
    """
    df_feat = create_supply_guard_features(df)
    return df_feat.dropna(subset=FEATURE_COLUMNS).copy()

def build_quick_prediction_features(user_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    MODE A — QUICK PREDICTION:
    When no historical time-series observations are supplied, constructs features
    using a deterministic Steady-State Baseline strategy:
      - Historical lags (lag_1, lag_2) and 4-week rolling means are set equal to the current observation.
      - Week-over-week trend acceleration (change_1w, change_2w) is set to 0.0.
      - Previous disrupted status is derived from current route status.
    
    This preserves the exact 21-feature input schema expected by LightGBM models
    without fabricating stochastic or arbitrary numbers.
    """
    vol = float(user_input.get("trade_volume_tonnes", 10000.0))
    cont = float(np.clip(user_input.get("container_availability_index", 50.0), 0.0, 100.0))
    cong = float(np.clip(user_input.get("port_congestion_index", 50.0), 0.0, 100.0))
    fuel = float(user_input.get("fuel_cost_index", 60.0))
    comm = float(user_input.get("commodity_price_index", 60.0))
    weat = float(np.clip(user_input.get("weather_disruption_score", 30.0), 0.0, 100.0))
    geop = float(np.clip(user_input.get("geopolitical_risk_score", 30.0), 0.0, 100.0))
    
    status = str(user_input.get("route_status", "Normal")).strip()
    prev_disrupted = 1 if status.lower() in ["delayed", "disrupted"] else 0

    feature_dict = {
        "trade_volume_tonnes": vol,
        "container_availability_index": cont,
        "port_congestion_index": cong,
        "fuel_cost_index": fuel,
        "commodity_price_index": comm,
        "weather_disruption_score": weat,
        "geopolitical_risk_score": geop,
        
        # Steady-state baseline: prior observations match current operating state
        "congestion_lag_1": cong,
        "congestion_lag_2": cong,
        "congestion_rolling_4": cong,
        "weather_lag_1": weat,
        "weather_rolling_4": weat,
        "geopolitical_lag_1": geop,
        "geopolitical_rolling_4": geop,
        "container_lag_1": cont,
        "previous_was_disrupted": prev_disrupted,
        
        # Zero trend deviation in steady-state
        "congestion_change_1w": 0.0,
        "congestion_change_2w": 0.0,
        "weather_change_1w": 0.0,
        "geopolitical_change_1w": 0.0,
        "container_change_1w": 0.0
    }
    
    df_features = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
    return {
        "features_df": df_features,
        "feature_dict": feature_dict,
        "baseline_strategy": "Steady-state deterministic baseline (lags equal current observation, trend deltas zero)"
    }

def build_historical_prediction_features(route_id: str, historical_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    MODE B — HISTORICAL PREDICTION:
    Requires at least 4 chronological observations for the route.
    Calculates empirical lags (lag_1, lag_2), 4-week rolling means, and week-over-week deltas.
    """
    if len(historical_records) < 4:
        raise ValueError(
            "Insufficient historical context for this model. "
            f"Mode B requires at least 4 historical periods (provided: {len(historical_records)}). "
            "Please provide at least 4 records or switch to Quick Prediction mode."
        )

    df = pd.DataFrame(historical_records).copy()
    if "route_id" not in df.columns:
        df["route_id"] = route_id
    if "date" not in df.columns:
        df["date"] = pd.date_range(end=pd.Timestamp.now(), periods=len(df), freq="W-SUN")

    # Feature engineering over empirical records
    df_feat = create_supply_guard_features(df)
    latest_row = df_feat.sort_values("date").iloc[-1]

    # Validate that required features are present
    missing = [c for c in FEATURE_COLUMNS if pd.isna(latest_row.get(c))]
    if missing:
        raise ValueError(f"Insufficient historical context for this model. Missing computed features: {', '.join(missing)}")

    feature_dict = {col: float(latest_row[col]) for col in FEATURE_COLUMNS}
    df_features = pd.DataFrame([feature_dict])[FEATURE_COLUMNS]

    return {
        "features_df": df_features,
        "feature_dict": feature_dict,
        "baseline_strategy": f"Empirical historical calculation from {len(historical_records)} time-series records"
    }

def compute_simulated_features_from_base(
    base_feature_dict: Dict[str, Any],
    modifications: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Applies user-specified modifications to a baseline feature set.
    Clamps index values to [0, 100], preserves historical lags, and recomputes trend deltas.
    """
    sim_row = dict(base_feature_dict)

    # Update operational variables if specified
    if "port_congestion_index" in modifications:
        sim_row["port_congestion_index"] = float(np.clip(modifications["port_congestion_index"], 0.0, 100.0))
    if "weather_disruption_score" in modifications:
        sim_row["weather_disruption_score"] = float(np.clip(modifications["weather_disruption_score"], 0.0, 100.0))
    if "geopolitical_risk_score" in modifications:
        sim_row["geopolitical_risk_score"] = float(np.clip(modifications["geopolitical_risk_score"], 0.0, 100.0))
    if "container_availability_index" in modifications:
        sim_row["container_availability_index"] = float(np.clip(modifications["container_availability_index"], 0.0, 100.0))
    if "fuel_cost_index" in modifications:
        sim_row["fuel_cost_index"] = float(modifications["fuel_cost_index"])
    if "commodity_price_index" in modifications:
        sim_row["commodity_price_index"] = float(modifications["commodity_price_index"])
    if "trade_volume_tonnes" in modifications:
        sim_row["trade_volume_tonnes"] = float(modifications["trade_volume_tonnes"])

    # Recompute trend features relative to preserved historical lags
    sim_row["congestion_change_1w"] = sim_row["port_congestion_index"] - sim_row["congestion_lag_1"]
    sim_row["congestion_change_2w"] = sim_row["port_congestion_index"] - sim_row["congestion_lag_2"]
    sim_row["weather_change_1w"] = sim_row["weather_disruption_score"] - sim_row["weather_lag_1"]
    sim_row["geopolitical_change_1w"] = sim_row["geopolitical_risk_score"] - sim_row["geopolitical_lag_1"]
    sim_row["container_change_1w"] = sim_row["container_availability_index"] - sim_row["container_lag_1"]

    df_sim = pd.DataFrame([sim_row])[FEATURE_COLUMNS]
    return {
        "features_df": df_sim,
        "feature_dict": sim_row
    }

def compute_simulated_features(baseline_row: pd.Series,
                               congestion_change: float = 0.0,
                               weather_change: float = 0.0,
                               geopolitical_change: float = 0.0,
                               container_change: float = 0.0) -> pd.DataFrame:
    """
    Legacy wrapper for batch simulation.
    """
    sim_row = baseline_row.copy()
    sim_row["port_congestion_index"] = float(np.clip(sim_row["port_congestion_index"] + congestion_change, 0.0, 100.0))
    sim_row["weather_disruption_score"] = float(np.clip(sim_row["weather_disruption_score"] + weather_change, 0.0, 100.0))
    sim_row["geopolitical_risk_score"] = float(np.clip(sim_row["geopolitical_risk_score"] + geopolitical_change, 0.0, 100.0))
    sim_row["container_availability_index"] = float(np.clip(sim_row["container_availability_index"] + container_change, 0.0, 100.0))

    sim_row["congestion_change_1w"] = sim_row["port_congestion_index"] - sim_row["congestion_lag_1"]
    sim_row["congestion_change_2w"] = sim_row["port_congestion_index"] - sim_row["congestion_lag_2"]
    sim_row["weather_change_1w"] = sim_row["weather_disruption_score"] - sim_row["weather_lag_1"]
    sim_row["geopolitical_change_1w"] = sim_row["geopolitical_risk_score"] - sim_row["geopolitical_lag_1"]
    sim_row["container_change_1w"] = sim_row["container_availability_index"] - sim_row["container_lag_1"]

    return pd.DataFrame([sim_row])[FEATURE_COLUMNS]
