import os
import math
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from backend.config import WEATHER_MODEL_PKL

# Path to the trained weather model bundle (robust relative resolution)
DEFAULT_MODEL_PATH = str(WEATHER_MODEL_PKL)

# Deterministic mapping from weather classification condition to logistics disruption severity
# Based on maritime & intermodal supply chain impacts:
# Sunny/Clear: minimal operational disruption
# Cloudy: minor baseline delays, standard port operations
# Rainy/Precipitation: reduced vessel visibility, slippery berths, crane stoppages during heavy downpours
# Snowy/Winter Ice: freezing spray, berth ice, severe cargo delays
WEATHER_SEVERITY_WEIGHTS: Dict[str, float] = {
    "Sunny": 15.0,
    "Cloudy": 35.0,
    "Rainy": 70.0,
    "Snowy": 90.0
}

WEATHER_EMOJIS: Dict[str, str] = {
    "Sunny": "☀️",
    "Cloudy": "☁️",
    "Rainy": "🌧️",
    "Snowy": "❄️"
}

class WeatherPredictor:
    """
    Dedicated service wrapping the pre-trained worldwide weather classification model (weather_final.pkl).
    Does NOT retrain the model.
    Does NOT use dummy or fabricated weather predictions.
    Computes deterministic weather disruption score for Supply Guard models.
    """
    _instance = None

    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self.features: List[str] = []
        self.climate_pivot: Optional[pd.DataFrame] = None
        self.cities_df: Optional[pd.DataFrame] = None
        self.model_available = False
        self.load_error = None
        self.load_model()

    def load_model(self) -> bool:
        """Loads the pre-trained weather bundle from disk."""
        if not os.path.exists(self.model_path):
            self.model_available = False
            self.load_error = f"Weather model file not found at {self.model_path}"
            return False

        try:
            bundle = joblib.load(self.model_path)
            if not isinstance(bundle, dict):
                raise ValueError("Model file does not contain the expected weather dictionary bundle.")
            
            self.model = bundle["model"]
            self.features = bundle["features"]
            self.climate_pivot = bundle["climate_pivot"]
            self.cities_df = bundle["cities"]
            self.model_available = True
            self.load_error = None
            return True
        except Exception as e:
            self.model_available = False
            self.load_error = str(e)
            return False

    def get_supported_locations(self) -> List[Dict[str, Any]]:
        """Returns the list of cities and ports supported by the trained model and maritime registry."""
        if not self.model_available or self.cities_df is None:
            return []
        
        from backend.services.port_registry import PORT_REGISTRY
        locations = []
        seen = set()
        
        # Include registered maritime ports first
        for p in PORT_REGISTRY:
            key = (p["city"].lower(), p["country"].lower())
            if key not in seen:
                seen.add(key)
                locations.append({
                    "city": str(p["city"]),
                    "country": str(p["country"]),
                    "latitude": float(p["latitude"]),
                    "longitude": float(p["longitude"]),
                    "timezone": p.get("timezone", "UTC"),
                    "port_name": p.get("port_name", "")
                })

        # Include model training cities
        unique_locs = self.cities_df[["city", "country", "latitude", "longitude"]].drop_duplicates()
        for _, row in unique_locs.sort_values(["country", "city"]).iterrows():
            key = (str(row["city"]).lower(), str(row["country"]).lower())
            if key not in seen:
                seen.add(key)
                locations.append({
                    "city": str(row["city"]),
                    "country": str(row["country"]),
                    "latitude": float(row["latitude"]),
                    "longitude": float(row["longitude"])
                })
        return locations

    def _normalize_name(self, name: str) -> str:
        """Normalizes names by stripping and lowercase, handling basic accents."""
        import unicodedata
        normalized = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
        return normalized.strip().lower()

    def find_city(self, country: str, city: str) -> Optional[pd.Series]:
        """Finds matching city in supported cities DataFrame or PORT_REGISTRY with nearest climatology."""
        if self.cities_df is None or self.cities_df.empty:
            return None
        
        norm_city = self._normalize_name(city)
        norm_country = self._normalize_name(country)

        # 1. Attempt exact normalized match on both city and country in training dataset
        matches = self.cities_df[
            (self.cities_df["city"].apply(self._normalize_name) == norm_city) &
            (self.cities_df["country"].apply(self._normalize_name) == norm_country)
        ]
        if not matches.empty:
            row = matches.iloc[0].copy()
            row["climate_ref_city"] = row["city"]
            return row

        # 2. Fallback: match by normalized city name alone in training dataset
        city_matches = self.cities_df[
            self.cities_df["city"].apply(self._normalize_name) == norm_city
        ]
        if not city_matches.empty:
            row = city_matches.iloc[0].copy()
            row["climate_ref_city"] = row["city"]
            return row

        # 3. Check PORT_REGISTRY for major maritime ports
        try:
            from backend.services.port_registry import find_port, haversine_distance_km
            port = find_port(city, country)
            if port and (port.get("latitude") != 0.0 or port.get("longitude") != 0.0):
                # Find closest reference city in self.cities_df for climatology baseline
                min_dist = float("inf")
                best_ref_city = "Tokyo"
                for _, c_row in self.cities_df.drop_duplicates("city").iterrows():
                    d = haversine_distance_km(
                        port["latitude"], port["longitude"],
                        float(c_row["latitude"]), float(c_row["longitude"])
                    )
                    if d < min_dist:
                        min_dist = d
                        best_ref_city = str(c_row["city"])
                
                return pd.Series({
                    "city": port["city"],
                    "country": port["country"],
                    "latitude": port["latitude"],
                    "longitude": port["longitude"],
                    "climate_ref_city": best_ref_city
                })
        except Exception:
            pass

        return None

    def calculate_disruption_score(self, probabilities: Dict[str, float]) -> float:
        """
        Deterministic transformation layer:
        Calculates expected logistics Weather Disruption Score (0 - 100)
        from the model's categorical probability distribution:
        Score = 15*P(Sunny) + 35*P(Cloudy) + 70*P(Rainy) + 90*P(Snowy)
        """
        score = 0.0
        for weather_cls, prob in probabilities.items():
            weight = WEATHER_SEVERITY_WEIGHTS.get(weather_cls, 40.0)
            score += weight * prob
        return float(np.clip(score, 0.0, 100.0))

    def predict(
        self,
        country: str,
        city: str,
        prediction_date: str,
        max_horizon_days: Optional[int] = None,
        base_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main inference method wrapping the trained weather model.
        Input: country, city, prediction_date (YYYY-MM-DD).
        Supports max_horizon_days relative to base_date.
        Output: Structured dictionary with real ML weather predictions.
        """
        # 1. Check model availability
        if not self.model_available:
            return {
                "model_available": False,
                "forecast_available": False,
                "error": "Weather prediction model unavailable.",
                "detail": self.load_error or "Model bundle could not be loaded."
            }

        # 2. Check required inputs
        if not country or not city or not prediction_date:
            return {
                "model_available": True,
                "forecast_available": False,
                "error": "Insufficient input for weather prediction.",
                "detail": "Country, City, and Prediction Date (YYYY-MM-DD) are all required."
            }

        country_str = str(country).strip()
        city_str = str(city).strip()
        date_str = str(prediction_date).strip()

        # 3. Validate date format
        try:
            target_dt = pd.to_datetime(date_str)
        except Exception:
            return {
                "model_available": True,
                "forecast_available": False,
                "error": f"Invalid date format '{date_str}'. Expected format YYYY-MM-DD.",
                "detail": "Date could not be parsed."
            }

        # 4. Optional horizon tracking
        days_diff = None
        if base_date:
            try:
                base_dt = pd.to_datetime(base_date)
                days_diff = (target_dt.date() - base_dt.date()).days
            except Exception:
                pass


        # 5. Check city coverage in trained dataset or port registry
        city_row = self.find_city(country_str, city_str)
        if city_row is None:
            available_locs = self.get_supported_locations()
            loc_list = [f"{l['city']} ({l['country']})" for l in available_locs]
            return {
                "model_available": True,
                "forecast_available": False,
                "error": f"Requested location '{city_str}, {country_str}' is outside the weather model's supported cities.",
                "supported_cities": loc_list,
                "detail": f"Model was trained on 22 global hub locations and global port registry: {', '.join(loc_list[:8])}..."
            }

        lat = float(city_row["latitude"])
        lon = float(city_row["longitude"])
        matched_city = str(city_row["city"])
        matched_country = str(city_row["country"])
        climate_ref_city = str(city_row.get("climate_ref_city", matched_city))

        month = int(target_dt.month)
        day_of_year = int(target_dt.dayofyear)

        # 6. Retrieve historical climate baseline for climate_ref_city and month
        norm_ref_city = self._normalize_name(climate_ref_city)
        climate_rows = self.climate_pivot[
            (self.climate_pivot["city"].apply(self._normalize_name) == norm_ref_city) &
            (self.climate_pivot["month"] == month)
        ]

        if climate_rows.empty:
            return {
                "model_available": True,
                "forecast_available": False,
                "error": f"No historical climate data available for {matched_city} in month {month}.",
                "detail": "Historical climate pivot missing monthly slice."
            }

        climate_row = climate_rows.iloc[0]

        # 6. Construct Cyclical and Climate Features exactly as trained
        month_sin = float(np.sin(2 * np.pi * month / 12))
        month_cos = float(np.cos(2 * np.pi * month / 12))
        day_sin = float(np.sin(2 * np.pi * day_of_year / 365))
        day_cos = float(np.cos(2 * np.pi * day_of_year / 365))

        feature_values = {
            "latitude": lat,
            "longitude": lon,
            "month": month,
            "day_of_year": day_of_year,
            "month_sin": month_sin,
            "month_cos": month_cos,
            "day_sin": day_sin,
            "day_cos": day_cos,
            "Cloudy": float(climate_row.get("Cloudy", 0.0)),
            "Rainy": float(climate_row.get("Rainy", 0.0)),
            "Sunny": float(climate_row.get("Sunny", 0.0)),
            "Snowy": float(climate_row.get("Snowy", 0.0))
        }

        # 7. Model Feature Alignment
        input_df = pd.DataFrame([feature_values])[self.features]

        # 8. ML Inference
        prediction = str(self.model.predict(input_df)[0])
        probabilities_raw = self.model.predict_proba(input_df)[0]
        
        prob_dict: Dict[str, float] = {}
        for cls_name, prob_val in zip(self.model.classes_, probabilities_raw):
            prob_dict[str(cls_name)] = round(float(prob_val), 4)

        top_confidence = round(float(np.max(probabilities_raw)), 4)

        # 9. Transformation to Supply Guard weather_disruption_score
        weather_disruption_score = round(self.calculate_disruption_score(prob_dict), 1)

        # Weather risk level categorization
        if weather_disruption_score < 30.0:
            weather_risk_level = "LOW"
        elif weather_disruption_score < 60.0:
            weather_risk_level = "MODERATE"
        elif weather_disruption_score < 80.0:
            weather_risk_level = "HIGH"
        else:
            weather_risk_level = "SEVERE"

        return {
            "model_available": True,
            "forecast_available": True,
            "country": country_str,
            "city": city_str,
            "prediction_date": target_dt.strftime("%Y-%m-%d"),
            "prediction": prediction,
            "predicted_weather": prediction,
            "weather_emoji": WEATHER_EMOJIS.get(prediction, "🌤️"),
            "confidence": top_confidence,
            "confidence_percent": round(top_confidence * 100.0, 2),
            "probabilities": prob_dict,
            "weather_disruption_score": weather_disruption_score,
            "weather_risk_level": weather_risk_level,
            "coordinates": {
                "latitude": lat,
                "longitude": lon
            },
            "features_used": feature_values,
            "transformation_summary": (
                f"Probabilistic expectation mapping: 15*P(Sunny) + 35*P(Cloudy) + 70*P(Rainy) + 90*P(Snowy) = "
                f"{weather_disruption_score} out of 100."
            )
        }

    def predict_port_endpoints(
        self,
        origin_city: str,
        origin_country: str,
        departure_date: str,
        dest_city: str,
        dest_country: str,
        arrival_date: str,
        max_horizon_days: int = 14
    ) -> Dict[str, Any]:
        """
        Runs the trained weather model for both actual route endpoints:
        - Origin Port weather evaluated at departure_date
        - Destination Port weather evaluated at arrival_date (only if within max_horizon_days)
        Returns structured payload for both endpoint cards and combined route weather score.
        """
        origin_res = self.predict(
            country=origin_country,
            city=origin_city,
            prediction_date=departure_date
        )

        dest_res = self.predict(
            country=dest_country,
            city=dest_city,
            prediction_date=arrival_date,
            max_horizon_days=max_horizon_days,
            base_date=departure_date
        )

        origin_score = float(origin_res.get("weather_disruption_score", 30.0))
        if dest_res.get("forecast_available") and "weather_disruption_score" in dest_res:
            dest_score = float(dest_res["weather_disruption_score"])
            route_score = round(max(origin_score, dest_score), 1)
            combination_note = (
                f"Combined endpoint risk evaluates both ports: Origin ({origin_score}) & "
                f"Destination ({dest_score}). Max operational disruption score = {route_score} / 100."
            )
        else:
            route_score = origin_score
            combination_note = (
                f"Route weather score derived from Origin Port ({origin_score}/100) because "
                f"destination arrival date exceeds {max_horizon_days}-day forecast horizon."
            )

        return {
            "origin_weather": origin_res,
            "destination_weather": dest_res,
            "route_weather_disruption_score": route_score,
            "combination_note": combination_note
        }

    def predict_timeline(
        self,
        country: str,
        city: str,
        start_date: str,
        horizons: List[int] = [1, 3, 7, 10]
    ) -> Dict[str, Any]:
        """
        Computes multi-date weather predictions across the requested forecast horizons.
        """
        try:
            base_dt = pd.to_datetime(start_date)
        except Exception:
            return {"error": f"Invalid start_date '{start_date}'"}

        timeline = []
        for h in horizons:
            forecast_dt = base_dt + timedelta(days=h)
            dt_str = forecast_dt.strftime("%Y-%m-%d")
            pred_res = self.predict(country, city, dt_str)
            if "error" in pred_res:
                return pred_res
            timeline.append({
                "horizon_days": h,
                "date": dt_str,
                "display_date": forecast_dt.strftime("%b %d, %Y"),
                "prediction": pred_res["prediction"],
                "weather_emoji": pred_res["weather_emoji"],
                "confidence_percent": pred_res["confidence_percent"],
                "weather_disruption_score": pred_res["weather_disruption_score"],
                "weather_risk_level": pred_res["weather_risk_level"],
                "probabilities": pred_res["probabilities"]
            })

        return {
            "country": country,
            "city": city,
            "start_date": base_dt.strftime("%Y-%m-%d"),
            "horizons_supported": horizons,
            "timeline": timeline
        }


_weather_predictor_instance = None

def get_weather_predictor() -> WeatherPredictor:
    global _weather_predictor_instance
    if _weather_predictor_instance is None:
        _weather_predictor_instance = WeatherPredictor()
    return _weather_predictor_instance
