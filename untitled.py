import pandas as pd
import numpy as np


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


def create_supply_guard_features(df):
    df = df.copy()

    df["date"] = pd.to_datetime(df["date"])

    df = (
        df.sort_values(["route_id", "date"])
        .reset_index(drop=True)
    )

    # Historical congestion
    df["congestion_lag_1"] = (
        df.groupby("route_id")["port_congestion_index"]
        .shift(1)
    )

    df["congestion_lag_2"] = (
        df.groupby("route_id")["port_congestion_index"]
        .shift(2)
    )

    df["congestion_rolling_4"] = (
        df.groupby("route_id")["port_congestion_index"]
        .transform(
            lambda x: x.shift(1).rolling(4).mean()
        )
    )

    # Historical weather
    df["weather_lag_1"] = (
        df.groupby("route_id")["weather_disruption_score"]
        .shift(1)
    )

    df["weather_rolling_4"] = (
        df.groupby("route_id")["weather_disruption_score"]
        .transform(
            lambda x: x.shift(1).rolling(4).mean()
        )
    )

    # Historical geopolitical risk
    df["geopolitical_lag_1"] = (
        df.groupby("route_id")["geopolitical_risk_score"]
        .shift(1)
    )

    df["geopolitical_rolling_4"] = (
        df.groupby("route_id")["geopolitical_risk_score"]
        .transform(
            lambda x: x.shift(1).rolling(4).mean()
        )
    )

    # Container availability
    df["container_lag_1"] = (
        df.groupby("route_id")["container_availability_index"]
        .shift(1)
    )

    # Previous route status
    df["previous_status"] = (
        df.groupby("route_id")["route_status"]
        .shift(1)
    )

    df["previous_was_disrupted"] = (
        df["previous_status"]
        .isin(["Disrupted", "Delayed"])
        .astype(int)
    )

    # Trend features
    df["congestion_change_1w"] = (
        df["port_congestion_index"]
        - df["congestion_lag_1"]
    )

    df["congestion_change_2w"] = (
        df["port_congestion_index"]
        - df["congestion_lag_2"]
    )

    df["weather_change_1w"] = (
        df["weather_disruption_score"]
        - df["weather_lag_1"]
    )

    df["geopolitical_change_1w"] = (
        df["geopolitical_risk_score"]
        - df["geopolitical_lag_1"]
    )

    df["container_change_1w"] = (
        df["container_availability_index"]
        - df["container_lag_1"]
    )

    return df


def prepare_model_input(df):
    df = create_supply_guard_features(df)

    df = df.dropna(
        subset=FEATURE_COLUMNS
    ).copy()

    return df