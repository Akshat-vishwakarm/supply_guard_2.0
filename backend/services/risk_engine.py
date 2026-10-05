import io
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Set
try:
    from config import (
        WEEKLY_OPERATIONS_CSV,
        WEIGHT_DISRUPTION,
        WEIGHT_DELAY,
        WEIGHT_RIPPLE,
        DELAY_NORM_MAX_DAYS,
        get_risk_level
    )
except ImportError:
    from backend.config import (
        WEEKLY_OPERATIONS_CSV,
        WEIGHT_DISRUPTION,
        WEIGHT_DELAY,
        WEIGHT_RIPPLE,
        DELAY_NORM_MAX_DAYS,
        get_risk_level
    )

try:
    from services.model_loader import get_models
    from services.feature_engineering import (
        FEATURE_COLUMNS,
        create_supply_guard_features,
        build_quick_prediction_features,
        build_historical_prediction_features,
        compute_simulated_features_from_base
    )
    from services.network_engine import get_network_engine
    from services.recommendation_engine import RecommendationEngine
    from services.weather_prediction import get_weather_predictor
    from services.intelligence_engine import get_intelligence_engine
except ImportError:
    try:
        from model_loader import get_models
        from feature_engineering import (
            FEATURE_COLUMNS,
            create_supply_guard_features,
            build_quick_prediction_features,
            build_historical_prediction_features,
            compute_simulated_features_from_base
        )
        from network_engine import get_network_engine
        from recommendation_engine import RecommendationEngine
        from weather_prediction import get_weather_predictor
        from intelligence_engine import get_intelligence_engine
    except ImportError:
        from backend.services.model_loader import get_models
        from backend.services.feature_engineering import (
            FEATURE_COLUMNS,
            create_supply_guard_features,
            build_quick_prediction_features,
            build_historical_prediction_features,
            compute_simulated_features_from_base
        )
        from backend.services.network_engine import get_network_engine
        from backend.services.recommendation_engine import RecommendationEngine
        from backend.services.weather_prediction import get_weather_predictor
        from backend.services.intelligence_engine import get_intelligence_engine

REQUIRED_COLUMNS = [
    "date",
    "route_id",
    "trade_volume_tonnes",
    "shipping_delay_days",
    "freight_cost_usd",
    "container_availability_index",
    "port_congestion_index",
    "fuel_cost_index",
    "commodity_price_index",
    "weather_disruption_score",
    "geopolitical_risk_score",
    "route_status"
]

class RiskEngine:
    _instance = None

    def __init__(self):
        self.is_loaded = False
        self.is_demo = False
        self.dataset_name = ""
        self.records_count = 0
        self.routes_count = 0
        self.date_min = ""
        self.date_max = ""
        self.detected_columns = []
        self.raw_df: Optional[pd.DataFrame] = None
        self.features_df: Optional[pd.DataFrame] = None
        self.latest_rows: Dict[str, pd.Series] = {}
        self.route_predictions: Dict[str, Dict[str, Any]] = {}
        self.routes_with_insufficient_data: Set[str] = set()
        
        # Single-route prediction state
        self.latest_single_prediction: Optional[Dict[str, Any]] = None
        self.recent_predictions: List[Dict[str, Any]] = []

    def clear_dataset(self):
        """Resets the engine to the fresh empty startup state."""
        self.is_loaded = False
        self.is_demo = False
        self.dataset_name = ""
        self.records_count = 0
        self.routes_count = 0
        self.date_min = ""
        self.date_max = ""
        self.detected_columns = []
        self.raw_df = None
        self.features_df = None
        self.latest_rows = {}
        self.route_predictions = {}
        self.routes_with_insufficient_data = set()
        self.latest_single_prediction = None
        self.recent_predictions = []

    def analyze_shipment(self, shipment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        NEW PRIMARY INPUT MODEL:
        Accepts real business shipment parameters:
        Supplier, Customer, Product, Quantity & Unit, Weight & Unit, Shipment Value,
        Searchable Origin & Destination Ports, Departure Date & Time, Current Shipment Status.
        
        Derives all technical ML inputs automatically via IntelligenceEngine, WeatherPredictor,
        and PortRegistry.
        Executes LightGBM ML models and generates complete risk intelligence, route timeline,
        currency conversion, business impact, network ripple, and full data provenance.
        """
        models = get_models()
        network_engine = get_network_engine()
        rec_engine = RecommendationEngine()
        ie = get_intelligence_engine()
        wp = get_weather_predictor()

        try:
            from services.port_registry import (
                find_port,
                calculate_route_timeline,
                haversine_distance_km,
                calculate_ocean_transit
            )
        except ImportError:
            try:
                from port_registry import (
                    find_port,
                    calculate_route_timeline,
                    haversine_distance_km,
                    calculate_ocean_transit
                )
            except ImportError:
                from backend.services.port_registry import (
                    find_port,
                    calculate_route_timeline,
                    haversine_distance_km,
                    calculate_ocean_transit
                )

        # 1. Extract and Validate Business / Shipment Parameters
        supplier_company = str(shipment_data.get("supplier_company") or shipment_data.get("my_company") or "").strip()
        customer_company = str(shipment_data.get("receiving_company") or shipment_data.get("customer_company") or "").strip()
        product_name = str(shipment_data.get("product_name") or shipment_data.get("item_name") or "").strip()
        
        try:
            quantity = float(shipment_data.get("quantity", 0.0) or 0.0)
        except Exception:
            quantity = 0.0
        quantity_unit = str(shipment_data.get("quantity_unit") or "Units").strip()

        try:
            shipment_weight = float(shipment_data.get("shipment_weight", 0.0) or 0.0)
        except Exception:
            shipment_weight = 0.0
        weight_unit = str(shipment_data.get("weight_unit") or "kg").strip().lower()

        shipment_val_raw = shipment_data.get("commercial_value") if shipment_data.get("commercial_value") is not None else shipment_data.get("shipment_value")
        shipment_value = float(shipment_val_raw) if shipment_val_raw is not None and str(shipment_val_raw).strip() != "" and float(shipment_val_raw) > 0 else None

        user_currency = str(shipment_data.get("currency") or "").strip().upper()

        # 2. Extract Route Endpoints (Support nested origin/destination objects per Section 3 & 17)
        origin_obj = shipment_data.get("origin") if isinstance(shipment_data.get("origin"), dict) else {}
        dest_obj = shipment_data.get("destination") if isinstance(shipment_data.get("destination"), dict) else {}

        origin_port_raw = str(origin_obj.get("port") or shipment_data.get("origin_port") or origin_obj.get("city") or shipment_data.get("origin_city") or "").strip()
        dest_port_raw = str(dest_obj.get("port") or shipment_data.get("destination_port") or dest_obj.get("city") or shipment_data.get("destination_city") or shipment_data.get("dest_city") or "").strip()

        origin_country_hint = str(origin_obj.get("country") or shipment_data.get("origin_country") or "").strip()
        dest_country_hint = str(dest_obj.get("country") or shipment_data.get("destination_country") or shipment_data.get("dest_country") or "").strip()

        origin_city_hint = str(origin_obj.get("city") or shipment_data.get("origin_city") or "").strip()
        dest_city_hint = str(dest_obj.get("city") or shipment_data.get("destination_city") or shipment_data.get("dest_city") or "").strip()

        origin_lat_input = origin_obj.get("latitude") if origin_obj.get("latitude") is not None else shipment_data.get("origin_latitude")
        origin_lon_input = origin_obj.get("longitude") if origin_obj.get("longitude") is not None else shipment_data.get("origin_longitude")

        dest_lat_input = dest_obj.get("latitude") if dest_obj.get("latitude") is not None else shipment_data.get("destination_latitude")
        dest_lon_input = dest_obj.get("longitude") if dest_obj.get("longitude") is not None else shipment_data.get("destination_longitude")

        # 3. Schedule & Civil Timing
        departure_date = str(shipment_data.get("departure_date") or "").strip()
        departure_time = str(shipment_data.get("departure_time") or "10:00").strip()

        # 4. Current Shipment Status
        shipment_status = str(shipment_data.get("shipment_status") or shipment_data.get("route_status") or "Normal").strip()
        if shipment_status.lower() not in ["normal", "delayed", "disrupted"]:
            shipment_status = "Normal"
        current_delay_days = float(shipment_data.get("current_delay_days", 0.0) or 0.0) if shipment_status.lower() == "delayed" else 0.0
        disruption_reason = str(shipment_data.get("disruption_reason") or "").strip() if shipment_status.lower() == "disrupted" else ""

        # ---------------------------------------------------------------------
        # STRICT VALIDATION: NO DUMMY DATA / NO SILENT FALLBACK (Section 1 & 16)
        # ---------------------------------------------------------------------
        missing_fields = []
        if not supplier_company:
            missing_fields.append("Supplier / company")
        if not customer_company:
            missing_fields.append("Receiving company")
        if not product_name:
            missing_fields.append("Product name")
        if quantity <= 0:
            missing_fields.append("Shipment quantity")
        if shipment_weight <= 0:
            missing_fields.append("Shipment weight")
        if not origin_port_raw:
            missing_fields.append("Origin port")
        if not dest_port_raw:
            missing_fields.append("Destination port")
        if not departure_date:
            missing_fields.append("Departure date")
        if not departure_time:
            missing_fields.append("Departure time")
        if not shipment_status:
            missing_fields.append("Shipment status")

        if missing_fields:
            bullet_list = "\n".join(f"• {f}" for f in missing_fields)
            raise ValueError(f"Cannot analyze shipment yet.\nPlease provide:\n{bullet_list}")

        # Derive trade_volume_tonnes for ML models
        if weight_unit in ["kg", "kilograms"]:
            trade_volume_tonnes = round(shipment_weight / 1000.0, 3)
            weight_unit_display = "kg"
        else:
            trade_volume_tonnes = round(shipment_weight, 3)
            weight_unit_display = "tonnes"

        # Resolve Port Details and preserve actual coordinates
        p_origin = find_port(origin_port_raw or origin_city_hint, origin_country_hint)
        p_dest = find_port(dest_port_raw or dest_city_hint, dest_country_hint)

        origin_port_name = origin_obj.get("port") or p_origin.get("port_name", origin_port_raw)
        origin_city = origin_obj.get("city") or p_origin.get("city", origin_port_raw)
        origin_country = origin_obj.get("country") or p_origin.get("country", origin_country_hint or "Unknown")
        origin_timezone = p_origin.get("timezone", "UTC")
        origin_currency = p_origin.get("currency", "USD")
        origin_tz_abbr = p_origin.get("tz_abbr", "UTC")
        origin_latitude = float(origin_lat_input) if origin_lat_input is not None and float(origin_lat_input) != 0.0 else float(p_origin.get("latitude", 0.0))
        origin_longitude = float(origin_lon_input) if origin_lon_input is not None and float(origin_lon_input) != 0.0 else float(p_origin.get("longitude", 0.0))

        dest_port_name = dest_obj.get("port") or p_dest.get("port_name", dest_port_raw)
        dest_city = dest_obj.get("city") or p_dest.get("city", dest_port_raw)
        dest_country = dest_obj.get("country") or p_dest.get("country", dest_country_hint or "Unknown")
        dest_timezone = p_dest.get("timezone", "UTC")
        dest_currency = p_dest.get("currency", "USD")
        dest_tz_abbr = p_dest.get("tz_abbr", "UTC")
        dest_latitude = float(dest_lat_input) if dest_lat_input is not None and float(dest_lat_input) != 0.0 else float(p_dest.get("latitude", 0.0))
        dest_longitude = float(dest_lon_input) if dest_lon_input is not None and float(dest_lon_input) != 0.0 else float(p_dest.get("longitude", 0.0))

        display_currency = user_currency if user_currency else (origin_currency if origin_currency != "USD" else dest_currency)
        if not display_currency:
            display_currency = "USD"

        # 5. Route Identification & Nautical Transit Duration
        route_meta = ie.identify_route(origin_country, dest_country, origin_city, dest_city)
        route_id = route_meta["route_id"]
        route_type = route_meta["route_type"]
        is_known_route = route_meta["is_known_route"]
        shipping_method = route_meta["shipping_method"]
        trade_route_type = route_meta.get("trade_route_type", "Consumer Goods")

        # Dynamic physics calculation if coordinates are present
        if origin_latitude != 0.0 and dest_latitude != 0.0:
            distance_km = round(haversine_distance_km(origin_latitude, origin_longitude, dest_latitude, dest_longitude), 1)
            baseline_transit_days = calculate_ocean_transit(distance_km)
            transit_source = "Maritime physics calculation (18.5 knots sailing + 4.8d port dwell)"
        else:
            baseline_transit_days = float(route_meta["baseline_transit_days"])
            transit_source = route_meta["transit_source"]
            distance_km = float(route_meta["distance_km"])

        # 6. Automatic Intelligence Derivation (or Advanced Risk Overrides)
        overrides = shipment_data.get("overrides", {}) or {}

        # a) Weather Intelligence (Origin Port Departure Date via weather_final.pkl)
        origin_weather = wp.predict(country=origin_country, city=origin_city, prediction_date=departure_date)
        if overrides.get("weather_risk") is not None:
            weat = float(np.clip(float(overrides["weather_risk"]), 0.0, 100.0))
            weather_source = "User override in Advanced Inputs"
            weather_provenance = "USER INPUT"
        elif shipment_data.get("weather_disruption_score") is not None and str(shipment_data.get("weather_mode", "")).upper() == "MANUAL":
            weat = float(np.clip(float(shipment_data["weather_disruption_score"]), 0.0, 100.0))
            weather_source = "User override in Advanced Inputs"
            weather_provenance = "USER INPUT"
        else:
            weat = float(origin_weather.get("weather_disruption_score", 35.0))
            weather_source = f"Trained Weather Model ({origin_weather.get('prediction', 'Forecast')})"
            weather_provenance = "WEATHER MODEL"

        # b) Port Congestion & Container Availability Intelligence
        pc = ie.derive_port_and_container(route_meta, origin_country, dest_country)
        if overrides.get("port_congestion") is not None:
            cong = float(np.clip(float(overrides["port_congestion"]), 0.0, 100.0))
            cong_source = "User override in Advanced Inputs"
            cong_provenance = "USER INPUT"
        elif shipment_data.get("port_congestion_index") is not None and overrides.get("port_congestion_manual"):
            cong = float(np.clip(float(shipment_data["port_congestion_index"]), 0.0, 100.0))
            cong_source = "User override in Advanced Inputs"
            cong_provenance = "USER INPUT"
        else:
            cong = float(pc["port_congestion_index"])
            cong_source = pc["congestion_source"]
            cong_provenance = pc["congestion_provenance"]

        if overrides.get("container_availability") is not None:
            cont = float(np.clip(float(overrides["container_availability"]), 0.0, 100.0))
            cont_source = "User override in Advanced Inputs"
            cont_provenance = "USER INPUT"
        elif shipment_data.get("container_availability_index") is not None and overrides.get("container_availability_manual"):
            cont = float(np.clip(float(shipment_data["container_availability_index"]), 0.0, 100.0))
            cont_source = "User override in Advanced Inputs"
            cont_provenance = "USER INPUT"
        else:
            cont = float(pc["container_availability_index"])
            cont_source = pc["container_source"]
            cont_provenance = pc["container_provenance"]

        # c) Geopolitical Risk Intelligence
        gp = ie.derive_geopolitical_risk(route_meta, origin_country, dest_country, departure_date)
        if overrides.get("geopolitical_risk") is not None:
            geop = float(np.clip(float(overrides["geopolitical_risk"]), 0.0, 100.0))
            geop_source = "User override in Advanced Inputs"
            geop_provenance = "USER INPUT"
        elif shipment_data.get("geopolitical_risk_score") is not None and overrides.get("geopolitical_risk_manual"):
            geop = float(np.clip(float(shipment_data["geopolitical_risk_score"]), 0.0, 100.0))
            geop_source = "User override in Advanced Inputs"
            geop_provenance = "USER INPUT"
        else:
            geop = float(gp["geopolitical_risk_score"])
            geop_source = gp["geopolitical_source"]
            geop_provenance = gp["geopolitical_provenance"]

        # d) Fuel Cost & Commodity Price Index Intelligence
        cf = ie.derive_commodity_and_fuel(departure_date)
        if overrides.get("fuel_cost") is not None:
            fuel = float(overrides["fuel_cost"])
            fuel_source = "User override in Advanced Inputs"
            fuel_provenance = "USER INPUT"
        elif shipment_data.get("fuel_cost_index") is not None and overrides.get("fuel_cost_manual"):
            fuel = float(shipment_data["fuel_cost_index"])
            fuel_source = "User override in Advanced Inputs"
            fuel_provenance = "USER INPUT"
        else:
            fuel = float(cf["fuel_cost_index"])
            fuel_source = f"commodity_market.csv (date: {cf.get('matched_date')})"
            fuel_provenance = cf["provenance"]

        if overrides.get("commodity_price") is not None:
            comm = float(overrides["commodity_price"])
            comm_source = "User override in Advanced Inputs"
            comm_provenance = "USER INPUT"
        elif shipment_data.get("commodity_price_index") is not None and overrides.get("commodity_price_manual"):
            comm = float(shipment_data["commodity_price_index"])
            comm_source = "User override in Advanced Inputs"
            comm_provenance = "USER INPUT"
        else:
            comm = float(cf["commodity_price_index"])
            comm_source = f"commodity_market.csv (stress index: {cf.get('commodity_stress_score')})"
            comm_provenance = cf["provenance"]

        # 7. Feature Engineering via existing build_quick_prediction_features
        tech_input = {
            "route_id": route_id,
            "trade_volume_tonnes": trade_volume_tonnes,
            "container_availability_index": cont,
            "port_congestion_index": cong,
            "fuel_cost_index": fuel,
            "commodity_price_index": comm,
            "weather_disruption_score": weat,
            "geopolitical_risk_score": geop,
            "route_status": shipment_status
        }
        prep_res = build_quick_prediction_features(tech_input)
        features_df = prep_res["features_df"]
        feature_dict = prep_res["feature_dict"]

        # 8. Real LightGBM ML Inference
        disruption_prob = float(models.disruption_model.predict_proba(features_df)[0, 1])
        pred_delay = max(0.0, float(models.delay_model.predict(features_df)[0]))
        pred_cost_usd = max(0.0, float(models.freight_cost_model.predict(features_df)[0]))

        # 9. Civil Route Timeline Calculation
        route_timeline = calculate_route_timeline(
            origin_timezone_name=origin_timezone,
            dest_timezone_name=dest_timezone,
            departure_date_str=departure_date,
            departure_time_str=departure_time,
            baseline_transit_days=baseline_transit_days,
            predicted_delay_days=pred_delay
        )
        calculated_arrival_date = route_timeline["arrival_date_str"]

        # 10. Destination Port Weather at Calculated Arrival Date
        dest_weather = wp.predict(
            country=dest_country,
            city=dest_city,
            prediction_date=calculated_arrival_date
        )

        # 11. Network Topology Impact
        if self.is_loaded and self.route_predictions:
            disruption_map = {r: p["disruption_probability"] for r, p in self.route_predictions.items()}
        else:
            disruption_map = {}
        disruption_map[route_id] = disruption_prob

        net_exposure = network_engine.calculate_ripple_risk(
            route_id,
            disruption_map,
            origin_country=origin_country,
            destination_country=dest_country
        )
        ripple_score = net_exposure["ripple_risk_score"]
        network_analysis = {
            "available": True,
            "message": f"Connected corridor identified in global trade topology ({net_exposure['direct_routes_count']} direct links across {origin_country}/{dest_country} hubs).",
            "direct_routes_exposed": net_exposure["direct_routes_exposed"],
            "direct_routes_count": net_exposure["direct_routes_count"],
            "second_order_routes_exposed": net_exposure["second_order_routes_exposed"],
            "second_order_routes_count": net_exposure["second_order_routes_count"],
            "avg_direct_risk": net_exposure["avg_direct_risk"],
            "max_direct_risk": net_exposure["max_direct_risk"],
            "ripple_risk_score": ripple_score,
            "note": "Network connectivity derived from global trade topology hubs."
        }
        delay_score = float(np.clip(pred_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
        score = (
            WEIGHT_DISRUPTION * disruption_prob
            + WEIGHT_DELAY * delay_score
            + WEIGHT_RIPPLE * (ripple_score / 100.0)
        ) * 100.0
        score_formula = "0.50 * P(Disruption) + 0.30 * DelayScore + 0.20 * (RippleScore / 100)"

        score = round(float(np.clip(score, 0.0, 100.0)), 2)
        risk_lvl = get_risk_level(score)

        # 12. Currency Conversion Layer
        converted_display = ie.convert_currency(pred_cost_usd, display_currency)
        converted_origin = ie.convert_currency(pred_cost_usd, origin_currency)
        converted_dest = ie.convert_currency(pred_cost_usd, dest_currency)

        # 13. Business Impact Exposures (Genuine calculations without dummy constants)
        vol_at_risk = round(trade_volume_tonnes * disruption_prob, 2)
        delay_exp = round(vol_at_risk * pred_delay, 2)
        freight_exp_usd = round(pred_cost_usd * disruption_prob, 2)
        freight_exp_display = round(converted_display["converted_amount"] * disruption_prob, 2)
        val_at_risk = round(shipment_value * disruption_prob, 2) if shipment_value else None

        # 14. Data Provenance Summary
        data_provenance = [
            {"item": "Supplier / Company", "value": supplier_company, "provenance": "USER INPUT", "details": "Direct user entry"},
            {"item": "Receiving Company", "value": customer_company, "provenance": "USER INPUT", "details": "Direct user entry"},
            {"item": "Product / Item Name", "value": product_name, "provenance": "USER INPUT", "details": "Direct user entry"},
            {"item": "Quantity", "value": f"{quantity:,.0f} {quantity_unit}", "provenance": "USER INPUT", "details": "Direct user entry"},
            {"item": "Shipment Weight", "value": f"{shipment_weight:,.1f} {weight_unit_display}", "provenance": "USER INPUT", "details": "Direct user entry"},
            {"item": "Normalized Trade Volume", "value": f"{trade_volume_tonnes:,.2f} tonnes", "provenance": "DERIVED", "details": f"Calculated from {shipment_weight:,.1f} {weight_unit_display}"},
            {"item": "Origin Port", "value": f"{origin_port_name}, {origin_country} ({origin_latitude:.4f}, {origin_longitude:.4f})", "provenance": "USER INPUT", "details": "Selected via global port directory with true coordinates"},
            {"item": "Destination Port", "value": f"{dest_port_name}, {dest_country} ({dest_latitude:.4f}, {dest_longitude:.4f})", "provenance": "USER INPUT", "details": "Selected via global port directory with true coordinates"},
            {"item": "Origin Country & Timezone", "value": f"{origin_country} • {origin_tz_abbr} ({origin_timezone})", "provenance": "DERIVED", "details": "Derived automatically from selected origin port"},
            {"item": "Destination Country & Timezone", "value": f"{dest_country} • {dest_tz_abbr} ({dest_timezone})", "provenance": "DERIVED", "details": "Derived automatically from selected destination port"},
            {"item": "Trade Lane Identification", "value": f"{route_id} ({route_type})", "provenance": "ROUTE DATA", "details": route_meta.get("note", "Corridor lookup in trade_routes.csv")},
            {"item": "Baseline Ocean Transit", "value": f"{baseline_transit_days:.1f} days ({distance_km:,.1f} km)", "provenance": "ROUTE DATA" if is_known_route else "DERIVED", "details": transit_source},
            {"item": "Origin Weather Disruption Score", "value": f"{weat:.1f} / 100", "provenance": weather_provenance, "details": weather_source},
            {"item": "Port Congestion Index", "value": f"{cong:.1f} / 100", "provenance": cong_provenance, "details": cong_source},
            {"item": "Container Availability Index", "value": f"{cont:.1f} / 100", "provenance": cont_provenance, "details": cont_source},
            {"item": "Geopolitical Risk Score", "value": f"{geop:.1f} / 100", "provenance": geop_provenance, "details": geop_source},
            {"item": "Fuel Cost Index", "value": f"{fuel:.1f}", "provenance": fuel_provenance, "details": fuel_source},
            {"item": "Commodity Price Index", "value": f"{comm:.1f}", "provenance": comm_provenance, "details": comm_source},
            {"item": "Disruption Probability", "value": f"{disruption_prob * 100.0:.2f}%", "provenance": "MODEL PREDICTION", "details": "LightGBM Classifier (disruption_model_v1.pkl)"},
            {"item": "Predicted Shipping Delay", "value": f"+{pred_delay:.2f} days", "provenance": "MODEL PREDICTION", "details": "LightGBM Regressor (delay_model_v1.pkl)"},
            {"item": "Predicted Freight Cost (USD)", "value": f"${pred_cost_usd:,.2f} USD", "provenance": "MODEL PREDICTION", "details": "LightGBM Regressor (freight_cost_model_v1.pkl)"},
            {"item": "Display Freight Cost", "value": converted_display["formatted"], "provenance": "DERIVED", "details": f"FX conversion at {converted_display['rate_formatted']}"},
            {"item": "Estimated Arrival Time (ETA)", "value": route_timeline["arrival_local"]["formatted"], "provenance": "DERIVED", "details": "Departure + Baseline Transit + ML Delay in destination timezone"}
        ]

        # 15. Endpoint Weather Payload
        endpoint_weather = {
            "origin": {
                "port_name": origin_port_name,
                "city": origin_city,
                "country": origin_country,
                "forecast_date": departure_date,
                "forecast_time": departure_time,
                "timezone": origin_timezone,
                "tz_abbr": origin_tz_abbr,
                "weather": origin_weather.get("prediction") or origin_weather.get("predicted_weather", "Forecast Available"),
                "weather_emoji": origin_weather.get("weather_emoji", "🌤️"),
                "confidence_percent": origin_weather.get("confidence_percent", 90.0),
                "weather_risk": weat,
                "weather_risk_level": origin_weather.get("weather_risk_level", "MODERATE"),
                "probabilities": origin_weather.get("probabilities", {}),
                "available": origin_weather.get("forecast_available", True),
                "source": weather_source,
                "provenance": weather_provenance
            },
            "destination": {
                "port_name": dest_port_name,
                "city": dest_city,
                "country": dest_country,
                "forecast_date": calculated_arrival_date,
                "forecast_time": route_timeline["arrival_local"]["time"],
                "timezone": dest_timezone,
                "tz_abbr": dest_tz_abbr,
                "weather": dest_weather.get("prediction", "Forecast Available"),
                "weather_emoji": dest_weather.get("weather_emoji", "🌤️"),
                "confidence_percent": dest_weather.get("confidence_percent", 85.0),
                "weather_risk": dest_weather.get("weather_disruption_score", 25.0),
                "weather_risk_level": dest_weather.get("weather_risk_level", "LOW"),
                "probabilities": dest_weather.get("probabilities", {}),
                "available": dest_weather.get("forecast_available", True),
                "message": dest_weather.get("message", "Authentic prediction from weather_final.pkl"),
                "source": "Trained Weather Model (weather_final.pkl)",
                "provenance": "WEATHER MODEL"
            }
        }

        # 16. Future Risk Timeline (Section 11)
        future_timeline = []
        future_timeline.append({
            "milestone": "Departure",
            "day_offset": 0,
            "date": departure_date,
            "location": f"{origin_port_name}, {origin_country}",
            "weather": origin_weather.get("prediction") or origin_weather.get("predicted_weather", "Forecast Available"),
            "weather_emoji": origin_weather.get("weather_emoji", "🌤️"),
            "weather_risk": round(weat, 1),
            "disruption_probability": round(disruption_prob, 4),
            "disruption_probability_percent": round(disruption_prob * 100.0, 2),
            "predicted_delay_days": round(pred_delay, 2),
            "predicted_freight_cost_usd": round(pred_cost_usd, 2),
            "supply_guard_score": score,
            "risk_level": risk_lvl
        })

        # Multi-point intermediate milestones
        target_milestones = [1, 3, 7, 10]
        for d in target_milestones:
            if d < baseline_transit_days:
                d_date = (pd.to_datetime(departure_date) + pd.Timedelta(days=d)).strftime("%Y-%m-%d")
                if d <= baseline_transit_days / 2.0:
                    mid_w = wp.predict(country=origin_country, city=origin_city, prediction_date=d_date)
                    mid_loc = f"Maritime Transit ({d}d from {origin_city})"
                else:
                    mid_w = wp.predict(country=dest_country, city=dest_city, prediction_date=d_date)
                    mid_loc = f"Maritime Transit (Approaching {dest_city})"
                
                mid_weat = float(mid_w.get("weather_disruption_score", 30.0))
                mid_input = dict(tech_input)
                mid_input["weather_disruption_score"] = mid_weat
                mid_feat = build_quick_prediction_features(mid_input)["features_df"]
                mid_disrupt = float(models.disruption_model.predict_proba(mid_feat)[0, 1])
                mid_delay = max(0.0, float(models.delay_model.predict(mid_feat)[0]))
                mid_cost = max(0.0, float(models.freight_cost_model.predict(mid_feat)[0]))
                mid_delay_score = float(np.clip(mid_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
                if is_known_route and ripple_score is not None:
                    mid_score = (WEIGHT_DISRUPTION * mid_disrupt + WEIGHT_DELAY * mid_delay_score + WEIGHT_RIPPLE * (ripple_score / 100.0)) * 100.0
                else:
                    mid_score = ((WEIGHT_DISRUPTION / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * mid_disrupt + (WEIGHT_DELAY / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * mid_delay_score) * 100.0
                mid_score = round(float(np.clip(mid_score, 0.0, 100.0)), 2)
                
                future_timeline.append({
                    "milestone": f"Day {d}",
                    "day_offset": d,
                    "date": d_date,
                    "location": mid_loc,
                    "weather": mid_w.get("prediction", "Forecast Available"),
                    "weather_emoji": mid_w.get("weather_emoji", "🌤️"),
                    "weather_risk": round(mid_weat, 1),
                    "disruption_probability": round(mid_disrupt, 4),
                    "disruption_probability_percent": round(mid_disrupt * 100.0, 2),
                    "predicted_delay_days": round(mid_delay, 2),
                    "predicted_freight_cost_usd": round(mid_cost, 2),
                    "supply_guard_score": mid_score,
                    "risk_level": get_risk_level(mid_score)
                })

        # Final Arrival milestone
        arr_weat = float(dest_weather.get("weather_disruption_score", 25.0))
        arr_input = dict(tech_input)
        arr_input["weather_disruption_score"] = arr_weat
        arr_feat = build_quick_prediction_features(arr_input)["features_df"]
        arr_disrupt = float(models.disruption_model.predict_proba(arr_feat)[0, 1])
        arr_delay = max(0.0, float(models.delay_model.predict(arr_feat)[0]))
        arr_cost = max(0.0, float(models.freight_cost_model.predict(arr_feat)[0]))
        arr_delay_score = float(np.clip(arr_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
        if is_known_route and ripple_score is not None:
            arr_score = (WEIGHT_DISRUPTION * arr_disrupt + WEIGHT_DELAY * arr_delay_score + WEIGHT_RIPPLE * (ripple_score / 100.0)) * 100.0
        else:
            arr_score = ((WEIGHT_DISRUPTION / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * arr_disrupt + (WEIGHT_DELAY / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * arr_delay_score) * 100.0
        arr_score = round(float(np.clip(arr_score, 0.0, 100.0)), 2)

        future_timeline.append({
            "milestone": "Arrival",
            "day_offset": round(baseline_transit_days + pred_delay, 1),
            "date": calculated_arrival_date,
            "location": f"{dest_port_name}, {dest_country}",
            "weather": dest_weather.get("prediction", "Forecast Available"),
            "weather_emoji": dest_weather.get("weather_emoji", "🌤️"),
            "weather_risk": round(arr_weat, 1),
            "disruption_probability": round(arr_disrupt, 4),
            "disruption_probability_percent": round(arr_disrupt * 100.0, 2),
            "predicted_delay_days": round(arr_delay, 2),
            "predicted_freight_cost_usd": round(arr_cost, 2),
            "supply_guard_score": arr_score,
            "risk_level": get_risk_level(arr_score)
        })

        # 17. Prediction Trace (Section 13)
        prediction_trace = {
            "user_input": {
                "supplier": supplier_company,
                "receiver": customer_company,
                "product": product_name,
                "cargo": f"{shipment_weight:,.0f} {weight_unit_display} ({quantity:,.0f} {quantity_unit})",
                "origin": f"{origin_port_name}, {origin_country}",
                "destination": f"{dest_port_name}, {dest_country}",
                "departure": f"{departure_date} {departure_time}",
                "status": shipment_status
            },
            "route_engine": {
                "distance": f"{distance_km:,.1f} km",
                "transit": f"{baseline_transit_days:.1f} days",
                "arrival": route_timeline["arrival_local"]["formatted"],
                "route_type": route_type,
                "transit_source": transit_source
            },
            "weather_model": {
                "model_file": "weather_final.pkl",
                "origin_weather": f"{origin_weather.get('prediction', 'Normal')} (Risk: {weat:.1f}/100, Confidence: {origin_weather.get('confidence_percent', 0):.1f}%)",
                "destination_weather": f"{dest_weather.get('prediction', 'Normal')} (Risk: {dest_weather.get('weather_disruption_score', 0):.1f}/100, Confidence: {dest_weather.get('confidence_percent', 0):.1f}%)"
            },
            "feature_engineering": {
                "source": "feature_engineering.py",
                "features_generated_count": len(features_df.columns),
                "features": feature_dict
            },
            "ml_models": {
                "disruption_model": f"LightGBM Classifier (disruption_model_v1.pkl) -> Disruption Prob = {disruption_prob * 100.0:.2f}%",
                "delay_model": f"LightGBM Regressor (delay_model_v1.pkl) -> Predicted Delay = +{pred_delay:.2f} days",
                "freight_model": f"LightGBM Regressor (freight_cost_model_v1.pkl) -> Predicted Freight Cost = ${pred_cost_usd:,.2f} USD"
            },
            "risk_engine": {
                "supply_guard_score": score,
                "risk_level": risk_lvl,
                "formula": score_formula
            }
        }

        # Recommendations
        route_payload = {
            "route_id": route_id,
            "origin": f"{origin_city}, {origin_country}",
            "destination": f"{dest_city}, {dest_country}",
            "distance_km": distance_km,
            "shipping_method": shipping_method,
            "trade_route_type": trade_route_type,
            "trade_volume_tonnes": trade_volume_tonnes,
            "port_congestion_index": cong,
            "weather_disruption_score": weat,
            "geopolitical_risk_score": geop,
            "container_availability_index": cont,
            "fuel_cost_index": fuel,
            "commodity_price_index": comm,
            "route_status": shipment_status,
            "base_currency": origin_currency,
            "quote_currency": dest_currency,
            "disruption_probability": disruption_prob,
            "predicted_delay_days": pred_delay,
            "predicted_freight_cost_usd": pred_cost_usd,
            "supply_guard_score": score,
            "risk_level": risk_lvl
        }
        recommendations = rec_engine.generate_route_recommendations(route_payload)

        freight_cost_obj = {
            "model_amount_usd": round(pred_cost_usd, 2),
            "model_currency": "USD",
            "display_amount": converted_display["converted_amount"],
            "display_currency": display_currency,
            "display_formatted": converted_display["formatted"],
            "exchange_rate": converted_display["exchange_rate"],
            "rate_formatted": converted_display["rate_formatted"],
            "origin_currency_amount": converted_origin["converted_amount"],
            "origin_currency_formatted": converted_origin["formatted"],
            "dest_currency_amount": converted_dest["converted_amount"],
            "dest_currency_formatted": converted_dest["formatted"],
            "provenance": "MODEL PREDICTION (USD) / DERIVED (FX)"
        }

        risk_factors_obj = {
            "port_congestion_index": round(cong, 1),
            "weather_disruption_score": round(weat, 1),
            "geopolitical_risk_score": round(geop, 1),
            "container_availability_index": round(cont, 1),
            "fuel_cost_index": round(fuel, 1),
            "commodity_price_index": round(comm, 1)
        }

        biz_impact_obj = {
            "label": "ESTIMATED BUSINESS EXPOSURE",
            "disclaimer": "All exposure figures represent statistical Estimated Exposure based on ML disruption probabilities, not actual realized financial loss or inventory stockout.",
            "trade_volume_tonnes": trade_volume_tonnes,
            "shipment_weight": shipment_weight,
            "weight_unit": weight_unit_display,
            "shipment_weight_display": f"{shipment_weight:,.1f} {weight_unit_display}",
            "quantity": quantity,
            "quantity_unit": quantity_unit,
            "quantity_display": f"{quantity:,.0f} {quantity_unit}",
            "commercial_value": shipment_value,
            "shipment_value": shipment_value,
            "shipment_value_formatted": f"{converted_display['currency_symbol']}{shipment_value:,.2f}" if shipment_value else "Unspecified",
            "estimated_volume_at_risk_tonnes": vol_at_risk,
            "volume_at_risk_tonnes": vol_at_risk,
            "delay_exposure_tonne_days": delay_exp,
            "financial_exposure_usd": freight_exp_usd,
            "estimated_freight_cost_exposure_usd": freight_exp_usd,
            "estimated_freight_cost_exposure_display": freight_exp_display,
            "estimated_shipment_value_at_risk": val_at_risk,
            "shipment_value_at_risk": val_at_risk,
            "shipment_value_at_risk_usd": val_at_risk,
            "currency": display_currency
        }

        # Structured Port Endpoints with coordinates
        origin_endpoint_obj = {
            "port": origin_port_name,
            "city": origin_city,
            "country": origin_country,
            "latitude": origin_latitude,
            "longitude": origin_longitude
        }
        dest_endpoint_obj = {
            "port": dest_port_name,
            "city": dest_city,
            "country": dest_country,
            "latitude": dest_latitude,
            "longitude": dest_longitude
        }

        structured_shipment = {
            "supplier_company": supplier_company,
            "customer_company": customer_company,
            "receiving_company": customer_company,
            "product_name": product_name,
            "quantity": quantity,
            "quantity_unit": quantity_unit,
            "shipment_weight": shipment_weight,
            "weight_unit": weight_unit_display,
            "commercial_value": shipment_value,
            "shipment_value": shipment_value,
            "currency": display_currency,
            "origin": origin_endpoint_obj,
            "destination": dest_endpoint_obj
        }

        structured_route = {
            "route_id": route_id,
            "route_type": route_type,
            "is_known_route": is_known_route,
            "corridor": f"{origin_port_name} ({origin_country}) → {dest_port_name} ({dest_country})",
            "origin": origin_endpoint_obj,
            "destination": dest_endpoint_obj,
            "origin_port": origin_port_name,
            "origin_city": origin_city,
            "origin_country": origin_country,
            "origin_timezone": origin_timezone,
            "origin_tz_abbr": origin_tz_abbr,
            "origin_latitude": origin_latitude,
            "origin_longitude": origin_longitude,
            "destination_port": dest_port_name,
            "destination_city": dest_city,
            "destination_country": dest_country,
            "destination_timezone": dest_timezone,
            "destination_tz_abbr": dest_tz_abbr,
            "destination_latitude": dest_latitude,
            "destination_longitude": dest_longitude,
            "distance_km": distance_km,
            "shipping_method": shipping_method,
            "trade_route_type": trade_route_type,
            "baseline_transit_days": baseline_transit_days,
            "transit_source": transit_source,
            "currency_pair": f"{origin_currency}/{dest_currency}"
        }

        structured_risk = {
            "supply_guard_score": score,
            "risk_level": risk_lvl,
            "disruption_probability": round(disruption_prob, 4),
            "disruption_probability_percent": round(disruption_prob * 100.0, 2),
            "predicted_delay_days": round(pred_delay, 2),
            "predicted_freight_cost_usd": round(pred_cost_usd, 2),
            "freight_cost": freight_cost_obj,
            "score_formula": score_formula,
            "risk_factors": risk_factors_obj
        }

        result = {
            "analysis_id": f"SGA-{int(pd.Timestamp.now().timestamp())}",
            "supplier_company": supplier_company,
            "customer_company": customer_company,
            "receiving_company": customer_company,
            "product_name": product_name,
            "quantity": quantity,
            "quantity_unit": quantity_unit,
            "shipment_weight": shipment_weight,
            "weight_unit": weight_unit_display,
            "commercial_value": shipment_value,
            "shipment_value": shipment_value,
            "trade_volume_tonnes": trade_volume_tonnes,
            "currency": display_currency,
            "display_currency": display_currency,
            "base_currency": origin_currency,
            "quote_currency": dest_currency,
            "origin_currency": origin_currency,
            "destination_currency": dest_currency,
            "currency_pair": f"{origin_currency}/{dest_currency}",

            # Structured Port Endpoints
            "origin": origin_endpoint_obj,
            "destination": dest_endpoint_obj,

            # Route Endpoints & Corridor
            "route_id": route_id,
            "route_type": route_type,
            "is_known_route": is_known_route,
            "corridor": f"{origin_port_name} ({origin_country}) → {dest_port_name} ({dest_country})",
            "origin_port": origin_port_name,
            "origin_city": origin_city,
            "origin_country": origin_country,
            "origin_timezone": origin_timezone,
            "origin_tz_abbr": origin_tz_abbr,
            "origin_latitude": origin_latitude,
            "origin_longitude": origin_longitude,
            "destination_port": dest_port_name,
            "destination_city": dest_city,
            "destination_country": dest_country,
            "destination_timezone": dest_timezone,
            "destination_tz_abbr": dest_tz_abbr,
            "destination_latitude": dest_latitude,
            "destination_longitude": dest_longitude,
            "distance_km": distance_km,
            "shipping_method": shipping_method,
            "trade_route_type": trade_route_type,
            "baseline_transit_days": baseline_transit_days,
            "estimated_transit_days": baseline_transit_days,
            "transit_source": transit_source,

            # Schedule
            "departure_date": departure_date,
            "departure_time": departure_time,
            "estimated_arrival_date": calculated_arrival_date,
            "departure_formatted": route_timeline["departure_local"]["formatted"],
            "arrival_formatted": route_timeline["arrival_local"]["formatted"],
            "route_timeline": route_timeline,

            # Shipment Status
            "shipment_status": shipment_status,
            "route_status": shipment_status,
            "current_delay_days": current_delay_days,
            "disruption_reason": disruption_reason,

            # Core ML Predictions (Real LightGBM models)
            "supply_guard_score": score,
            "risk_level": risk_lvl,
            "disruption_probability": round(disruption_prob, 4),
            "disruption_probability_percent": round(disruption_prob * 100.0, 2),
            "predicted_delay_days": round(pred_delay, 2),
            "predicted_freight_cost_usd": round(pred_cost_usd, 2),
            "score_formula": score_formula,

            # Freight Cost & Currency Layer
            "freight_cost": freight_cost_obj,

            # Endpoint Weather
            "endpoint_weather": endpoint_weather,
            "origin_weather": endpoint_weather["origin"],
            "destination_weather": endpoint_weather["destination"],

            # Technical Risk Factors (Derived Intelligence)
            "risk_factors": risk_factors_obj,

            # Business Impact
            "business_impact": biz_impact_obj,
            "businessImpact": biz_impact_obj,

            # Network Impact
            "network_analysis": network_analysis,
            "networkImpact": network_analysis,
            "network": network_analysis,

            # Future Risk Timeline & Prediction Trace
            "future_timeline": future_timeline,
            "prediction_trace": prediction_trace,
            "predictionTrace": prediction_trace,

            # Data Provenance Table
            "data_provenance": data_provenance,

            # Recommendations
            "recommendations": recommendations,

            # Canonical API section keys
            "shipment": structured_shipment,
            "route": structured_route,
            "timeline": route_timeline,
            "weather": endpoint_weather,
            "risk": structured_risk,
            "provenance": data_provenance,

            # Echo Raw Shipment for Simulator
            "raw_shipment": shipment_data,
            "raw_input": tech_input,
            "feature_dict": feature_dict,
            "created_at": pd.Timestamp.now().isoformat()
        }

        self.latest_single_prediction = result
        self.recent_predictions = [result] + [p for p in self.recent_predictions if p.get("route_id") != route_id][:9]
        return result

    def predict_single_route(self, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        PRIMARY ROUTE-BASED FLOW:
        If business shipment fields are provided, routes through analyze_shipment().
        Otherwise, runs legacy technical input flow for backwards compatibility.
        """
        if (
            user_input.get("supplier_company")
            or user_input.get("customer_company")
            or user_input.get("product_name")
            or user_input.get("shipment_weight")
        ):
            return self.analyze_shipment(user_input)

        models = get_models()
        network_engine = get_network_engine()
        rec_engine = RecommendationEngine()

        try:
            from services.port_registry import (
                find_port,
                find_baseline_transit_days,
                calculate_route_timeline,
                deduce_currency_pair
            )
        except ImportError:
            try:
                from port_registry import (
                    find_port,
                    find_baseline_transit_days,
                    calculate_route_timeline,
                    deduce_currency_pair
                )
            except ImportError:
                from backend.services.port_registry import (
                    find_port,
                    find_baseline_transit_days,
                    calculate_route_timeline,
                    deduce_currency_pair
                )

        mode = str(user_input.get("prediction_mode", "quick")).lower().strip()
        if mode not in ["quick", "historical"]:
            mode = "quick"

        # 1. Resolve Route Endpoints from user input
        origin_country_raw = str(user_input.get("origin_country") or user_input.get("country") or "").strip()
        origin_city_raw = str(user_input.get("origin_city") or user_input.get("city") or user_input.get("origin_port") or "").strip()
        dest_country_raw = str(user_input.get("destination_country") or "").strip()
        dest_city_raw = str(user_input.get("destination_city") or user_input.get("destination_port") or "").strip()

        # If completely unspecified, provide clean initial state
        if not origin_country_raw and not origin_city_raw:
            origin_country_raw = "Japan"
            origin_city_raw = "Yokohama"
        if not dest_country_raw and not dest_city_raw:
            dest_country_raw = "United States"
            dest_city_raw = "Los Angeles"

        p_origin = find_port(origin_city_raw, origin_country_raw)
        p_dest = find_port(dest_city_raw, dest_country_raw)

        origin_country = p_origin["country"]
        origin_city = p_origin["city"]
        dest_country = p_dest["country"]
        dest_city = p_dest["city"]

        departure_date = str(user_input.get("departure_date") or user_input.get("prediction_date") or "2026-10-05").strip()
        departure_time = str(user_input.get("departure_time") or "10:00").strip()

        # 2. Legitimate Baseline Transit Duration (from trade_routes.csv or physics-based nautical distance)
        user_transit_val = user_input.get("baseline_transit_days")
        if user_transit_val is not None and float(user_transit_val) > 0:
            baseline_transit_days = float(user_transit_val)
            transit_meta = {
                "source": "user_specified_baseline",
                "matched_route_id": None,
                "baseline_transit_days": baseline_transit_days,
                "distance_km": float(user_input.get("distance_km", 0.0))
            }
        else:
            transit_meta = find_baseline_transit_days(origin_country, dest_country, origin_city, dest_city)
            baseline_transit_days = float(transit_meta["baseline_transit_days"])

        # 3. Route ID (known route from dataset or session custom route)
        matched_id = transit_meta.get("matched_route_id")
        user_r_id = user_input.get("route_id")
        if user_r_id and user_r_id != "CUSTOM-001":
            route_id = str(user_r_id).strip()
        elif matched_id:
            route_id = matched_id
        else:
            route_id = "CUSTOM-001"

        corridor = f"{origin_city} ({origin_country}) → {dest_city} ({dest_country})"

        # 4. Currency Pair following the route
        auto_base, auto_quote, auto_pair = deduce_currency_pair(origin_country, dest_country)
        u_base = user_input.get("base_currency")
        u_quote = user_input.get("quote_currency")
        base_curr = str(u_base).strip() if u_base and u_base != "USD" else auto_base
        quote_curr = str(u_quote).strip() if u_quote and u_quote != "USD" else auto_quote
        if not base_curr:
            base_curr = "USD"
        if not quote_curr:
            quote_curr = "USD"
        currency_pair = f"{base_curr}/{quote_curr}"

        # 5. Determine Prediction Type (CURRENT vs FUTURE)
        prediction_type = str(user_input.get("prediction_type", "")).upper()
        if prediction_type == "FUTURE":
            is_future = True
            prediction_type = "FUTURE"
        else:
            is_future = False
            prediction_type = "CURRENT"

        weather_forecast = None
        weather_impact = None
        wp = get_weather_predictor()

        if is_future:
            prediction_type = "FUTURE"
            if not wp.model_available:
                raise ValueError("Weather prediction model unavailable.")

            # Predict Origin Port Weather at Departure Date
            origin_weather = wp.predict(
                country=origin_country,
                city=origin_city,
                prediction_date=departure_date
            )
            if "error" in origin_weather and not origin_weather.get("model_available"):
                raise ValueError(origin_weather["error"])

            weather_forecast = origin_weather
            weat = float(origin_weather.get("weather_disruption_score", 30.0))
            user_input["weather_disruption_score"] = weat
        else:
            prediction_type = "CURRENT"
            weat = float(np.clip(float(user_input.get("weather_disruption_score", 30.0)), 0.0, 100.0))
            origin_weather = {
                "model_available": True,
                "forecast_available": True,
                "country": origin_country,
                "city": origin_city,
                "prediction_date": departure_date,
                "prediction": "Current Observed",
                "predicted_weather": "Current Observed",
                "weather_emoji": "🧭",
                "confidence_percent": 100.0,
                "weather_disruption_score": weat,
                "weather_risk_level": "MODERATE" if weat < 60 else "HIGH"
            }

        vol = max(0.0, float(user_input.get("trade_volume_tonnes", 10000.0)))
        cont = float(np.clip(float(user_input.get("container_availability_index", 50.0)), 0.0, 100.0))
        cong = float(np.clip(float(user_input.get("port_congestion_index", 50.0)), 0.0, 100.0))
        fuel = float(user_input.get("fuel_cost_index", 60.0))
        comm = float(user_input.get("commodity_price_index", 60.0))
        geop = float(np.clip(float(user_input.get("geopolitical_risk_score", 30.0)), 0.0, 100.0))
        status = str(user_input.get("route_status", "Normal")).strip()

        # Update user_input with normalized route context for feature engineering
        user_input["origin_country"] = origin_country
        user_input["destination_country"] = dest_country
        user_input["base_currency"] = base_curr
        user_input["quote_currency"] = quote_curr

        # 6. Feature preparation based on mode
        if mode == "historical":
            hist_records = user_input.get("historical_records", [])
            prep_res = build_historical_prediction_features(route_id, hist_records)
            mode_note = "Historical Prediction uses empirical lag and rolling features computed from supplied records."
        else:
            prep_res = build_quick_prediction_features(user_input)
            mode_note = "Quick Prediction uses baseline steady-state features computed from user route conditions."

        features_df = prep_res["features_df"]
        feature_dict = prep_res["feature_dict"]
        baseline_strategy = prep_res["baseline_strategy"]

        # 7. Run LightGBM ML models
        disruption_prob = float(models.disruption_model.predict_proba(features_df)[0, 1])
        pred_delay = max(0.0, float(models.delay_model.predict(features_df)[0]))
        pred_cost = max(0.0, float(models.freight_cost_model.predict(features_df)[0]))

        # 8. Time Calculation: Departure Datetime + Baseline Transit + ML Delay = Estimated Arrival
        route_timeline = calculate_route_timeline(
            origin_timezone_name=p_origin["timezone"],
            dest_timezone_name=p_dest["timezone"],
            departure_date_str=departure_date,
            departure_time_str=departure_time,
            baseline_transit_days=baseline_transit_days,
            predicted_delay_days=pred_delay
        )
        calculated_arrival_date = route_timeline["arrival_date_str"]

        # 9. Destination Port Weather at Calculated Arrival Date
        if is_future:
            dest_weather = wp.predict(
                country=dest_country,
                city=dest_city,
                prediction_date=calculated_arrival_date,
                max_horizon_days=14,
                base_date=departure_date
            )
        else:
            dest_weather = {
                "model_available": True,
                "forecast_available": False,
                "country": dest_country,
                "city": dest_city,
                "prediction_date": calculated_arrival_date,
                "message": "Current mode evaluates conditions at origin departure."
            }

        # 10. Endpoint Weather Payload for UI
        endpoint_weather = {
            "label": "Endpoint weather forecast",
            "origin": {
                "port_name": p_origin.get("port_name", f"{origin_city} Port"),
                "city": origin_city,
                "country": origin_country,
                "forecast_date": departure_date,
                "forecast_time": departure_time,
                "timezone": p_origin["timezone"],
                "tz_abbr": route_timeline["departure_local"]["tz_abbr"],
                "weather": origin_weather.get("prediction") or origin_weather.get("predicted_weather", "Observed"),
                "weather_emoji": origin_weather.get("weather_emoji", "🌤️"),
                "confidence_percent": origin_weather.get("confidence_percent", 100.0),
                "weather_risk": origin_weather.get("weather_disruption_score", weat),
                "weather_risk_level": origin_weather.get("weather_risk_level", "MODERATE"),
                "probabilities": origin_weather.get("probabilities", {}),
                "available": origin_weather.get("forecast_available", True)
            },
            "destination": {
                "port_name": p_dest.get("port_name", f"{dest_city} Port"),
                "city": dest_city,
                "country": dest_country,
                "forecast_date": calculated_arrival_date,
                "forecast_time": route_timeline["arrival_local"]["time"],
                "timezone": p_dest["timezone"],
                "tz_abbr": route_timeline["arrival_local"]["tz_abbr"],
                "weather": dest_weather.get("prediction") or dest_weather.get("predicted_weather") or "Forecast Unavailable",
                "weather_emoji": dest_weather.get("weather_emoji", "⏳"),
                "confidence_percent": dest_weather.get("confidence_percent"),
                "weather_risk": dest_weather.get("weather_disruption_score") if dest_weather.get("forecast_available") else None,
                "weather_risk_level": dest_weather.get("weather_risk_level"),
                "probabilities": dest_weather.get("probabilities", {}),
                "available": dest_weather.get("forecast_available", False),
                "message": dest_weather.get("message") or dest_weather.get("error")
            }
        }

        # 11. Check Network Topology in trade_routes.csv
        is_in_network = route_id in network_engine.route_metadata
        if is_in_network:
            meta = network_engine.route_metadata[route_id]
            shipping_method = meta.get("shipping_method", "Sea")
            distance_km = meta.get("distance_km", transit_meta.get("distance_km", 0.0))
        else:
            shipping_method = transit_meta.get("shipping_method", "Sea")
            distance_km = transit_meta.get("distance_km", 0.0)

        if self.is_loaded and self.route_predictions:
            disruption_map = {r: p["disruption_probability"] for r, p in self.route_predictions.items()}
        else:
            disruption_map = {}
        disruption_map[route_id] = disruption_prob

        net_exposure = network_engine.calculate_ripple_risk(
            route_id,
            disruption_map,
            origin_country=origin_country,
            destination_country=dest_country
        )
        ripple_score = net_exposure["ripple_risk_score"]
        network_analysis = {
            "available": True,
            "message": f"Connected corridor identified in trade network topology ({net_exposure['direct_routes_count']} direct links).",
            "direct_routes_exposed": net_exposure["direct_routes_exposed"],
            "direct_routes_count": net_exposure["direct_routes_count"],
            "second_order_routes_exposed": net_exposure["second_order_routes_exposed"],
            "second_order_routes_count": net_exposure["second_order_routes_count"],
            "avg_direct_risk": net_exposure["avg_direct_risk"],
            "max_direct_risk": net_exposure["max_direct_risk"],
            "ripple_risk_score": ripple_score,
            "note": "Network connectivity derived from trade topology hubs."
        }
        delay_score = float(np.clip(pred_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
        score = (
            WEIGHT_DISRUPTION * disruption_prob
            + WEIGHT_DELAY * delay_score
            + WEIGHT_RIPPLE * (ripple_score / 100.0)
        ) * 100.0
        score_formula = "0.50 * P(Disruption) + 0.30 * DelayScore + 0.20 * (RippleScore / 100)"

        score = round(float(np.clip(score, 0.0, 100.0)), 2)
        risk_lvl = get_risk_level(score)

        # 12. Business Exposures
        disruption_prob_rounded = round(disruption_prob, 4)
        pred_delay_rounded = round(pred_delay, 2)
        pred_cost_rounded = round(pred_cost, 2)
        vol_at_risk = round(vol * disruption_prob_rounded, 2)
        delay_exp = round(vol_at_risk * pred_delay_rounded, 2)
        freight_exp = round(pred_cost_rounded * disruption_prob_rounded, 2)

        route_payload = {
            "route_id": route_id,
            "origin": f"{origin_city}, {origin_country}",
            "destination": f"{dest_city}, {dest_country}",
            "distance_km": distance_km,
            "shipping_method": shipping_method,
            "trade_route_type": transit_meta.get("trade_route_type", "User Specified"),
            "trade_volume_tonnes": vol,
            "port_congestion_index": cong,
            "weather_disruption_score": weat,
            "geopolitical_risk_score": geop,
            "container_availability_index": cont,
            "fuel_cost_index": fuel,
            "commodity_price_index": comm,
            "route_status": status,
            "base_currency": base_curr,
            "quote_currency": quote_curr,
            "disruption_probability": disruption_prob,
            "predicted_delay_days": pred_delay,
            "predicted_freight_cost_usd": pred_cost,
            "supply_guard_score": score,
            "risk_level": risk_lvl
        }

        recommendations = rec_engine.generate_route_recommendations(route_payload)

        # 13. Future Risk Weather Impact & Timeline
        if is_future and weather_forecast:
            base_weather_val = float(user_input.get("baseline_weather_score", 30.0))
            baseline_quick_copy = dict(user_input)
            baseline_quick_copy["weather_disruption_score"] = base_weather_val
            base_prep = build_quick_prediction_features(baseline_quick_copy)
            b_disrupt = float(models.disruption_model.predict_proba(base_prep["features_df"])[0, 1])
            b_delay = max(0.0, float(models.delay_model.predict(base_prep["features_df"])[0]))
            b_cost = max(0.0, float(models.freight_cost_model.predict(base_prep["features_df"])[0]))
            b_delay_score = float(np.clip(b_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
            if is_in_network and ripple_score is not None:
                b_score = (
                    WEIGHT_DISRUPTION * b_disrupt
                    + WEIGHT_DELAY * b_delay_score
                    + WEIGHT_RIPPLE * (ripple_score / 100.0)
                ) * 100.0
            else:
                b_score = (
                    (WEIGHT_DISRUPTION / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * b_disrupt
                    + (WEIGHT_DELAY / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * b_delay_score
                ) * 100.0
            b_score = round(float(np.clip(b_score, 0.0, 100.0)), 2)

            weather_impact = {
                "weather_prediction": origin_weather.get("prediction") or origin_weather.get("predicted_weather"),
                "weather_emoji": origin_weather.get("weather_emoji", "🌤️"),
                "confidence_percent": origin_weather.get("confidence_percent", 100.0),
                "weather_disruption_score": weat,
                "weather_risk_level": origin_weather.get("weather_risk_level", "MODERATE"),
                "baseline_weather_score": base_weather_val,
                "disruption_prob_with_weather": round(disruption_prob, 4),
                "disruption_prob_baseline": round(b_disrupt, 4),
                "disruption_prob_delta_percent": round((disruption_prob - b_disrupt) * 100.0, 2),
                "delay_with_weather_days": round(pred_delay, 2),
                "delay_baseline_days": round(b_delay, 2),
                "delay_delta_days": round(pred_delay - b_delay, 2),
                "freight_cost_with_weather_usd": round(pred_cost, 2),
                "freight_cost_baseline_usd": round(b_cost, 2),
                "freight_cost_delta_usd": round(pred_cost - b_cost, 2),
                "score_delta": round(score - b_score, 2),
                "baseline_score": b_score,
                "predicted_score": score
            }

        forecast_timeline = None
        if is_future and user_input.get("include_timeline") and not user_input.get("_is_timeline_step") and origin_country and origin_city:
            forecast_timeline = self.predict_future_timeline(user_input, [1, 3, 7, 10])

        result = {
            "route_id": route_id,
            "prediction_mode": mode,
            "prediction_type": prediction_type,
            "mode_note": mode_note,
            "baseline_strategy": baseline_strategy,
            "origin": f"{origin_city}, {origin_country}",
            "origin_city": origin_city,
            "origin_country": origin_country,
            "origin_port": p_origin.get("port_name", f"{origin_city} Port"),
            "destination": f"{dest_city}, {dest_country}",
            "destination_city": dest_city,
            "destination_country": dest_country,
            "destination_port": p_dest.get("port_name", f"{dest_city} Port"),
            "departure_date": departure_date,
            "departure_time": departure_time,
            "baseline_transit_days": baseline_transit_days,
            "corridor": corridor,
            "route_status": status,
            "currency_pair": currency_pair,
            "base_currency": base_curr,
            "quote_currency": quote_curr,
            "trade_volume_tonnes": round(vol, 2),
            
            # Core Model Predictions
            "supply_guard_score": score,
            "risk_level": risk_lvl,
            "score_formula": score_formula,
            "disruption_probability": round(disruption_prob, 4),
            "disruption_probability_percent": round(disruption_prob * 100.0, 2),
            "predicted_delay_days": round(pred_delay, 2),
            "predicted_freight_cost_usd": round(pred_cost, 2),
            "operating_threshold": 0.25,
            
            # Route Timing & Timeline
            "route_timeline": route_timeline,
            
            # Endpoint Weather Forecasts (Origin Port & Destination Port)
            "endpoint_weather": endpoint_weather,
            
            # Risk Factors
            "risk_factors": {
                "port_congestion_index": round(cong, 1),
                "weather_disruption_score": round(weat, 1),
                "geopolitical_risk_score": round(geop, 1),
                "container_availability_index": round(cont, 1),
                "fuel_cost_index": round(fuel, 1),
                "commodity_price_index": round(comm, 1)
            },
            
            # Weather Model Forecast Layer (Present in FUTURE mode)
            "weather_forecast": weather_forecast,
            "weather_impact": weather_impact,
            "forecast_timeline": forecast_timeline,
            
            # Business Impact
            "business_impact": {
                "label": "ESTIMATED EXPOSURE",
                "disclaimer": "All exposure figures represent statistical Estimated Exposure based on disruption probabilities, not actual realized financial loss or inventory stockouts.",
                "trade_volume_tonnes": round(vol, 2),
                "estimated_volume_at_risk_tonnes": vol_at_risk,
                "delay_exposure_tonne_days": delay_exp,
                "estimated_freight_cost_exposure_usd": freight_exp,
                "currency": base_curr
            },
            
            # Network Analysis
            "network_analysis": network_analysis,
            
            # Recommendations
            "recommendations": recommendations,
            
            # Input Echo & Feature Metadata for Stress Testing
            "raw_input": user_input,
            "feature_dict": feature_dict,
            "created_at": pd.Timestamp.now().isoformat()
        }

        self.latest_single_prediction = result
        self.recent_predictions = [result] + [p for p in self.recent_predictions if p["route_id"] != route_id][:9]
        return result

    def predict_future_timeline(
        self,
        user_input: Dict[str, Any],
        horizons: List[int] = [1, 3, 7, 10]
    ) -> List[Dict[str, Any]]:
        """
        Computes multi-date weather predictions and corresponding Supply Guard risk predictions
        for each supported forecast horizon date.
        """
        wp = get_weather_predictor()
        country = user_input.get("country") or user_input.get("origin_country", "")
        city = user_input.get("city", "")
        base_date_str = user_input.get("prediction_date") or pd.Timestamp.now().strftime("%Y-%m-%d")

        try:
            base_dt = pd.to_datetime(base_date_str)
        except Exception:
            base_dt = pd.Timestamp.now()

        timeline = []
        for h in horizons:
            target_dt = base_dt + pd.Timedelta(days=h)
            dt_str = target_dt.strftime("%Y-%m-%d")
            w_res = wp.predict(country, city, dt_str)
            if "error" in w_res:
                continue

            # Supply Guard inference with this weather score
            step_input = dict(user_input)
            step_input["_is_timeline_step"] = True
            step_input["include_timeline"] = False
            step_input["prediction_type"] = "CURRENT"  # prevent recursion
            step_input["city"] = None
            step_input["prediction_date"] = None
            step_input["weather_prediction"] = None
            step_input["weather_disruption_score"] = w_res["weather_disruption_score"]
            step_pred = self.predict_single_route(step_input)

            timeline.append({
                "horizon_days": h,
                "date": dt_str,
                "display_date": target_dt.strftime("%b %d"),
                "weather_prediction": w_res["prediction"],
                "weather_emoji": w_res["weather_emoji"],
                "weather_confidence": w_res["confidence_percent"],
                "weather_disruption_score": w_res["weather_disruption_score"],
                "weather_risk_level": w_res["weather_risk_level"],
                "disruption_probability_percent": step_pred["disruption_probability_percent"],
                "predicted_delay_days": step_pred["predicted_delay_days"],
                "predicted_freight_cost_usd": step_pred["predicted_freight_cost_usd"],
                "supply_guard_score": step_pred["supply_guard_score"],
                "risk_level": step_pred["risk_level"]
            })
        return timeline

    def simulate_custom_scenario(
        self,
        baseline_input: Dict[str, Any],
        scenario_inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Interactive Scenario Simulator starting from the user's actual input.
        Supports MANUAL weather modification or WEATHER_MODEL forecast.
        Re-infers LightGBM models under modified user conditions.
        """
        models = get_models()
        network_engine = get_network_engine()

        # Step 1: Compute Baseline Prediction
        if (
            baseline_input.get("supplier_company")
            or baseline_input.get("customer_company")
            or baseline_input.get("product_name")
            or baseline_input.get("shipment_weight")
        ):
            baseline_res = self.analyze_shipment(baseline_input)
        else:
            baseline_res = self.predict_single_route(baseline_input)

        base_feature_dict = baseline_res["feature_dict"]
        route_id = baseline_res["route_id"]

        # Step 2: Check for Weather Model Forecast in scenario
        weather_mode = str(scenario_inputs.get("weather_mode", "MANUAL")).upper()
        weather_forecast = None
        if weather_mode in ["WEATHER_MODEL", "WEATHER_MODEL_FORECAST"]:
            country = (
                scenario_inputs.get("country") or
                baseline_input.get("country") or
                baseline_input.get("origin_country") or
                ""
            )
            city = scenario_inputs.get("city") or baseline_input.get("city", "")
            pred_date = scenario_inputs.get("prediction_date") or baseline_input.get("prediction_date", "")

            if not country or not city or not pred_date:
                raise ValueError("Insufficient input for weather prediction in scenario simulator. Country, City, and Prediction Date are required.")

            wp = get_weather_predictor()
            if not wp.model_available:
                raise ValueError("Weather prediction model unavailable.")

            weather_res = wp.predict(country, city, pred_date)
            if "error" in weather_res:
                raise ValueError(weather_res["error"])

            scenario_inputs["weather_disruption_score"] = weather_res["weather_disruption_score"]
            weather_forecast = weather_res

        # Step 3: Apply Scenario Modifications
        sim_res = compute_simulated_features_from_base(base_feature_dict, scenario_inputs)
        sim_features_df = sim_res["features_df"]
        sim_feature_dict = sim_res["feature_dict"]

        # Step 4: Run LightGBM on Scenario Features
        sim_disrupt_prob = float(models.disruption_model.predict_proba(sim_features_df)[0, 1])
        sim_pred_delay = max(0.0, float(models.delay_model.predict(sim_features_df)[0]))
        sim_pred_cost = max(0.0, float(models.freight_cost_model.predict(sim_features_df)[0]))

        # Step 5: Network and Scoring for Scenario
        is_in_network = baseline_res["network_analysis"]["available"]
        if is_in_network:
            disruption_map = {r: 0.15 for r in network_engine.route_metadata}
            disruption_map[route_id] = sim_disrupt_prob
            net_exp = network_engine.calculate_ripple_risk(route_id, disruption_map)
            sim_ripple = net_exp["ripple_risk_score"]
            sim_delay_score = float(np.clip(sim_pred_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
            sim_score = (
                WEIGHT_DISRUPTION * sim_disrupt_prob
                + WEIGHT_DELAY * sim_delay_score
                + WEIGHT_RIPPLE * (sim_ripple / 100.0)
            ) * 100.0
        else:
            sim_ripple = None
            sim_delay_score = float(np.clip(sim_pred_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
            sim_score = (
                (WEIGHT_DISRUPTION / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * sim_disrupt_prob
                + (WEIGHT_DELAY / (WEIGHT_DISRUPTION + WEIGHT_DELAY)) * sim_delay_score
            ) * 100.0

        sim_score = round(float(np.clip(sim_score, 0.0, 100.0)), 2)
        sim_risk_lvl = get_risk_level(sim_score)

        sim_vol = float(sim_feature_dict.get("trade_volume_tonnes", baseline_res["trade_volume_tonnes"]))
        sim_vol_at_risk = round(sim_vol * sim_disrupt_prob, 2)
        sim_freight_exp = round(sim_pred_cost * sim_disrupt_prob, 2)

        # Baseline summary
        b_prob_pct = baseline_res["disruption_probability_percent"]
        b_delay = baseline_res["predicted_delay_days"]
        b_cost = baseline_res["predicted_freight_cost_usd"]
        b_score = baseline_res["supply_guard_score"]
        b_lvl = baseline_res["risk_level"]

        # Scenario summary
        s_prob_pct = round(sim_disrupt_prob * 100.0, 2)
        s_delay = round(sim_pred_delay, 2)
        s_cost = round(sim_pred_cost, 2)

        # Step 6: Recalculate Civil Route Timeline under modified delay
        try:
            from services.port_registry import calculate_route_timeline
            from services.intelligence_engine import get_intelligence_engine
        except ImportError:
            try:
                from port_registry import calculate_route_timeline
                from intelligence_engine import get_intelligence_engine
            except ImportError:
                from backend.services.port_registry import calculate_route_timeline
                from backend.services.intelligence_engine import get_intelligence_engine
        ie = get_intelligence_engine()

        base_timeline = baseline_res.get("route_timeline")
        if base_timeline and "departure_local" in base_timeline and "arrival_local" in base_timeline:
            sim_timeline = calculate_route_timeline(
                origin_timezone_name=base_timeline["departure_local"]["timezone"],
                dest_timezone_name=base_timeline["arrival_local"]["timezone"],
                departure_date_str=baseline_res.get("departure_date", "2026-10-05"),
                departure_time_str=baseline_res.get("departure_time", "10:00"),
                baseline_transit_days=baseline_res.get("baseline_transit_days", 17.0),
                predicted_delay_days=sim_pred_delay
            )
        else:
            sim_timeline = None

        display_curr = baseline_res.get("display_currency") or baseline_res.get("currency", "USD")
        converted_base = ie.convert_currency(b_cost, display_curr)
        converted_sim = ie.convert_currency(s_cost, display_curr)

        # Construct changes object per Section 20
        base_ripple = baseline_res.get("network_analysis", {}).get("ripple_risk_score")
        changes_obj = {
            "weather_risk_delta": round(float(sim_feature_dict["weather_disruption_score"]) - float(base_feature_dict["weather_disruption_score"]), 1),
            "disruption_probability_change_pp": round(s_prob_pct - b_prob_pct, 2),
            "disruption_probability_change_percent": round(s_prob_pct - b_prob_pct, 2),
            "predicted_delay_change_days": round(s_delay - b_delay, 2),
            "predicted_freight_cost_change_usd": round(s_cost - b_cost, 2),
            "supply_guard_score_change": round(sim_score - b_score, 2),
            "ripple_risk_change": round(sim_ripple - (base_ripple or 0.0), 2) if (sim_ripple is not None and base_ripple is not None) else 0.0,
            "risk_level_changed": b_lvl != sim_risk_lvl,
            "volume_at_risk_delta_tonnes": round(sim_vol_at_risk - baseline_res["business_impact"]["estimated_volume_at_risk_tonnes"], 2),
            "volume_at_risk_change_tonnes": round(sim_vol_at_risk - baseline_res["business_impact"]["estimated_volume_at_risk_tonnes"], 2),
            "new_estimated_arrival": sim_timeline["arrival_local"]["formatted"] if sim_timeline else None
        }

        # Deterministic scenario explanation adhering strictly to Section 17
        explanation_lines = []
        cond_base = baseline_res["risk_factors"]
        cond_sim = sim_feature_dict

        if round(float(cond_sim["port_congestion_index"]), 1) != round(float(cond_base["port_congestion_index"]), 1):
            b_val = round(float(cond_base["port_congestion_index"]), 1)
            s_val = round(float(cond_sim["port_congestion_index"]), 1)
            verb = "increased" if s_val > b_val else "decreased"
            explanation_lines.append(f"Port congestion {verb} from {b_val} → {s_val}.")

        if round(float(cond_sim["weather_disruption_score"]), 1) != round(float(cond_base["weather_disruption_score"]), 1):
            b_val = round(float(cond_base["weather_disruption_score"]), 1)
            s_val = round(float(cond_sim["weather_disruption_score"]), 1)
            verb = "increased" if s_val > b_val else "decreased"
            explanation_lines.append(f"Weather risk {verb} from {b_val} → {s_val}.")

        if round(float(cond_sim["geopolitical_risk_score"]), 1) != round(float(cond_base["geopolitical_risk_score"]), 1):
            b_val = round(float(cond_base["geopolitical_risk_score"]), 1)
            s_val = round(float(cond_sim["geopolitical_risk_score"]), 1)
            verb = "increased" if s_val > b_val else "decreased"
            explanation_lines.append(f"Geopolitical risk {verb} from {b_val} → {s_val}.")

        if round(float(cond_sim["container_availability_index"]), 1) != round(float(cond_base["container_availability_index"]), 1):
            b_val = round(float(cond_base["container_availability_index"]), 1)
            s_val = round(float(cond_sim["container_availability_index"]), 1)
            verb = "increased" if s_val > b_val else "decreased"
            explanation_lines.append(f"Container availability {verb} from {b_val} → {s_val}.")

        if round(float(cond_sim.get("fuel_cost_index", 0)), 1) != round(float(cond_base.get("fuel_cost_index", 0)), 1):
            b_val = round(float(cond_base.get("fuel_cost_index", 0)), 1)
            s_val = round(float(cond_sim.get("fuel_cost_index", 0)), 1)
            verb = "increased" if s_val > b_val else "decreased"
            explanation_lines.append(f"Fuel cost index {verb} from {b_val} → {s_val}.")

        if round(float(cond_sim.get("commodity_price_index", 0)), 1) != round(float(cond_base.get("commodity_price_index", 0)), 1):
            b_val = round(float(cond_base.get("commodity_price_index", 0)), 1)
            s_val = round(float(cond_sim.get("commodity_price_index", 0)), 1)
            verb = "increased" if s_val > b_val else "decreased"
            explanation_lines.append(f"Commodity price index {verb} from {b_val} → {s_val}.")

        pred_summary = (
            f"Under this scenario, the trained LightGBM models recalculate disruption probability and delay: "
            f"disruption probability shifts from {b_prob_pct}% to {s_prob_pct}% ({'+' if s_prob_pct >= b_prob_pct else ''}{round(s_prob_pct - b_prob_pct, 2)}%), "
            f"predicted delay shifts from {b_delay} to {s_delay} days ({'+' if s_delay >= b_delay else ''}{round(s_delay - b_delay, 2)} days), "
            f"and freight cost shifts from ${b_cost:,.2f} to ${s_cost:,.2f} USD."
        )
        if sim_timeline and "arrival_local" in sim_timeline:
            pred_summary += f" Estimated arrival adjusts to {sim_timeline['arrival_local']['formatted']}."
        explanation_lines.append(pred_summary)
        explanation_text = " ".join(explanation_lines)

        biz_impact_sim = {
            "estimated_volume_at_risk_tonnes": sim_vol_at_risk,
            "estimated_freight_cost_exposure_usd": sim_freight_exp,
            "delay_exposure_tonne_days": round(sim_vol_at_risk * sim_pred_delay, 2),
            "currency": display_curr
        }

        return {
            "route_id": route_id,
            "corridor": baseline_res["corridor"],
            "weather_mode": weather_mode,
            "weather_forecast": weather_forecast,
            "shipment": {
                "supplier_company": baseline_res.get("supplier_company"),
                "customer_company": baseline_res.get("customer_company"),
                "product_name": baseline_res.get("product_name"),
                "quantity": baseline_res.get("quantity"),
                "quantity_unit": baseline_res.get("quantity_unit"),
                "shipment_weight": baseline_res.get("shipment_weight"),
                "weight_unit": baseline_res.get("weight_unit"),
                "shipment_value": baseline_res.get("shipment_value"),
                "currency": display_curr,
                "origin_port": baseline_res.get("origin_port"),
                "destination_port": baseline_res.get("destination_port"),
                "origin_country": baseline_res.get("origin_country"),
                "destination_country": baseline_res.get("destination_country"),
                "departure_formatted": baseline_res.get("departure_formatted"),
                "baseline_transit_days": baseline_res.get("baseline_transit_days"),
                "route_type": baseline_res.get("route_type")
            },
            "baseline": {
                "disruption_probability": baseline_res["disruption_probability"],
                "disruption_probability_percent": b_prob_pct,
                "predicted_delay_days": b_delay,
                "predicted_freight_cost_usd": b_cost,
                "display_freight_cost": converted_base["formatted"],
                "supply_guard_score": b_score,
                "risk_level": b_lvl,
                "ripple_risk_score": base_ripple,
                "estimated_arrival": base_timeline["arrival_local"]["formatted"] if base_timeline and "arrival_local" in base_timeline else None,
                "estimated_volume_at_risk_tonnes": baseline_res["business_impact"]["estimated_volume_at_risk_tonnes"],
                "estimated_freight_cost_exposure_usd": baseline_res["business_impact"]["estimated_freight_cost_exposure_usd"],
                "timeline": base_timeline,
                "conditions": {
                    "port_congestion_index": baseline_res["risk_factors"]["port_congestion_index"],
                    "weather_disruption_score": baseline_res["risk_factors"]["weather_disruption_score"],
                    "geopolitical_risk_score": baseline_res["risk_factors"]["geopolitical_risk_score"],
                    "container_availability_index": baseline_res["risk_factors"]["container_availability_index"],
                    "fuel_cost_index": baseline_res["risk_factors"]["fuel_cost_index"],
                    "commodity_price_index": baseline_res["risk_factors"]["commodity_price_index"]
                }
            },
            "scenario": {
                "disruption_probability": round(sim_disrupt_prob, 4),
                "disruption_probability_percent": s_prob_pct,
                "predicted_delay_days": s_delay,
                "predicted_freight_cost_usd": s_cost,
                "display_freight_cost": converted_sim["formatted"],
                "supply_guard_score": sim_score,
                "risk_level": sim_risk_lvl,
                "ripple_risk_score": sim_ripple,
                "estimated_arrival": sim_timeline["arrival_local"]["formatted"] if sim_timeline and "arrival_local" in sim_timeline else None,
                "estimated_volume_at_risk_tonnes": sim_vol_at_risk,
                "estimated_freight_cost_exposure_usd": sim_freight_exp,
                "timeline": sim_timeline,
                "conditions": {
                    "port_congestion_index": round(sim_feature_dict["port_congestion_index"], 1),
                    "weather_disruption_score": round(sim_feature_dict["weather_disruption_score"], 1),
                    "geopolitical_risk_score": round(sim_feature_dict["geopolitical_risk_score"], 1),
                    "container_availability_index": round(sim_feature_dict["container_availability_index"], 1),
                    "fuel_cost_index": round(sim_feature_dict["fuel_cost_index"], 1),
                    "commodity_price_index": round(sim_feature_dict["commodity_price_index"], 1)
                }
            },
            "changes": changes_obj,
            "timeline": sim_timeline,
            "businessImpact": biz_impact_sim,
            "explanation": explanation_text,
            "explanation_lines": explanation_lines,
            "delta": {
                "weather_risk_delta": round(float(sim_feature_dict["weather_disruption_score"]) - float(base_feature_dict["weather_disruption_score"]), 1),
                "disruption_delta_percent": round(s_prob_pct - b_prob_pct, 2),
                "delay_delta_days": round(s_delay - b_delay, 2),
                "freight_delta_usd": round(s_cost - b_cost, 2),
                "risk_score_delta": round(sim_score - b_score, 2),
                "ripple_risk_delta": round(sim_ripple - (base_ripple or 0.0), 2) if (sim_ripple is not None and base_ripple is not None) else 0.0,
                "risk_level_changed": b_lvl != sim_risk_lvl,
                "volume_at_risk_delta_tonnes": round(sim_vol_at_risk - baseline_res["business_impact"]["estimated_volume_at_risk_tonnes"], 2),
                "new_estimated_arrival": sim_timeline["arrival_local"]["formatted"] if sim_timeline else None
            }
        }


    def validate_and_load_dataframe(self, df: pd.DataFrame, dataset_name: str, is_demo: bool = False) -> Dict[str, Any]:
        """
        Validates CSV dataframe, executes feature engineering, runs LightGBM models,
        and establishes an active analysis session.
        """
        if df.empty:
            raise ValueError("Uploaded CSV contains no records.")

        columns = list(df.columns)
        missing_columns = [col for col in REQUIRED_COLUMNS if col not in columns]
        if missing_columns:
            raise ValueError(f"Missing required columns in CSV: {', '.join(missing_columns)}")

        try:
            df["date"] = pd.to_datetime(df["date"])
        except Exception as e:
            raise ValueError(f"Invalid date format in 'date' column: {str(e)}")

        numeric_cols = [
            "trade_volume_tonnes", "shipping_delay_days", "freight_cost_usd",
            "container_availability_index", "port_congestion_index", "fuel_cost_index",
            "commodity_price_index", "weather_disruption_score", "geopolitical_risk_score"
        ]
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            if df[col].isna().all():
                raise ValueError(f"Column '{col}' must contain valid numeric values.")

        routes = df["route_id"].dropna().unique()
        if len(routes) == 0:
            raise ValueError("No valid routes detected in 'route_id' column.")

        self.clear_dataset()
        self.raw_df = df.copy()
        self.dataset_name = dataset_name
        self.is_demo = is_demo
        self.records_count = len(df)
        self.routes_count = len(routes)
        self.date_min = str(df["date"].min())[:10]
        self.date_max = str(df["date"].max())[:10]
        self.detected_columns = columns

        self.features_df = create_supply_guard_features(df)

        route_counts = df.groupby("route_id")["date"].count()
        for r_id, count in route_counts.items():
            if count < 4:
                self.routes_with_insufficient_data.add(str(r_id))

        latest = (
            self.features_df.sort_values(["route_id", "date"])
            .groupby("route_id")
            .tail(1)
            .copy()
        )
        for _, row in latest.iterrows():
            self.latest_rows[str(row["route_id"])] = row

        self._compute_all_route_risks()
        self.is_loaded = True

        return {
            "success": True,
            "filename": dataset_name,
            "is_demo": is_demo,
            "records": self.records_count,
            "routes": self.routes_count,
            "date_min": self.date_min,
            "date_max": self.date_max,
            "columns": self.detected_columns,
            "insufficient_history_routes": list(self.routes_with_insufficient_data)
        }

    def load_demo_dataset(self) -> Dict[str, Any]:
        """Explicitly loads the development dataset when user clicks 'Load Demo Dataset'."""
        if not WEEKLY_OPERATIONS_CSV.exists():
            raise FileNotFoundError(f"Demo dataset not found at: {WEEKLY_OPERATIONS_CSV}")
        df = pd.read_csv(WEEKLY_OPERATIONS_CSV)
        return self.validate_and_load_dataframe(df, dataset_name="weekly_route_operations.csv", is_demo=True)

    def _compute_all_route_risks(self):
        models = get_models()
        network_engine = get_network_engine()

        valid_route_ids = [
            r for r in sorted(list(self.latest_rows.keys()))
            if r not in self.routes_with_insufficient_data
        ]

        if not valid_route_ids:
            return

        latest_df = pd.DataFrame([self.latest_rows[r] for r in valid_route_ids])
        X = latest_df[FEATURE_COLUMNS]

        disruption_probs = models.disruption_model.predict_proba(X)[:, 1]
        delays = models.delay_model.predict(X)
        costs = models.freight_cost_model.predict(X)

        disruption_map = {r: float(p) for r, p in zip(valid_route_ids, disruption_probs)}

        for idx, r_id in enumerate(valid_route_ids):
            row = self.latest_rows[r_id]
            p_disrupt = float(disruption_probs[idx])
            pred_delay = max(0.0, float(delays[idx]))
            pred_cost = max(0.0, float(costs[idx]))
            vol = float(row.get("trade_volume_tonnes", 0.0))

            net_exposure = network_engine.calculate_ripple_risk(r_id, disruption_map)
            ripple_score = net_exposure["ripple_risk_score"]

            delay_score = float(np.clip(pred_delay / DELAY_NORM_MAX_DAYS, 0.0, 1.0))
            score = (
                WEIGHT_DISRUPTION * p_disrupt
                + WEIGHT_DELAY * delay_score
                + WEIGHT_RIPPLE * (ripple_score / 100.0)
            ) * 100.0
            score = round(float(np.clip(score, 0.0, 100.0)), 2)
            risk_lvl = get_risk_level(score)

            vol_at_risk = round(vol * p_disrupt, 2)
            delay_exp = round(vol_at_risk * pred_delay, 2)
            freight_exp = round(pred_cost * p_disrupt, 2)

            route_meta = network_engine.route_metadata.get(r_id, {})

            self.route_predictions[r_id] = {
                "route_id": r_id,
                "origin": route_meta.get("origin_country", "Origin Port"),
                "destination": route_meta.get("destination_country", "Destination Port"),
                "distance_km": route_meta.get("distance_km", 0.0),
                "shipping_method": route_meta.get("shipping_method", "Sea"),
                "trade_route_type": route_meta.get("trade_route_type", "General Cargo"),
                "estimated_transit_days": route_meta.get("estimated_transit_days", 14),
                "date": str(row["date"])[:10],
                "trade_volume_tonnes": round(vol, 2),
                "port_congestion_index": round(float(row.get("port_congestion_index", 0.0)), 2),
                "weather_disruption_score": round(float(row.get("weather_disruption_score", 0.0)), 2),
                "geopolitical_risk_score": round(float(row.get("geopolitical_risk_score", 0.0)), 2),
                "container_availability_index": round(float(row.get("container_availability_index", 0.0)), 2),
                "fuel_cost_index": round(float(row.get("fuel_cost_index", 0.0)), 2),
                "commodity_price_index": round(float(row.get("commodity_price_index", 0.0)), 2),
                "disruption_probability": round(p_disrupt, 4),
                "disruption_probability_percent": round(p_disrupt * 100.0, 2),
                "predicted_delay_days": round(pred_delay, 2),
                "predicted_freight_cost_usd": round(pred_cost, 2),
                "supply_guard_score": score,
                "risk_level": risk_lvl,
                "ripple_risk_score": ripple_score,
                "estimated_volume_at_risk_tonnes": vol_at_risk,
                "delay_exposure_tonne_days": delay_exp,
                "estimated_freight_cost_exposure_usd": freight_exp,
                "network_exposure": net_exposure,
                "has_sufficient_history": True,
                "inventory_shortage_risk": "Not available — inventory/demand data required",
                "methodology_note": "ML model predictions combined with network graph topology. Exposure figures reflect estimated statistical exposure, not actual financial loss."
            }

        for r_id in self.routes_with_insufficient_data:
            row = self.latest_rows[r_id]
            vol = float(row.get("trade_volume_tonnes", 0.0))
            route_meta = network_engine.route_metadata.get(r_id, {})
            self.route_predictions[r_id] = {
                "route_id": r_id,
                "origin": route_meta.get("origin_country", "Origin Port"),
                "destination": route_meta.get("destination_country", "Destination Port"),
                "distance_km": route_meta.get("distance_km", 0.0),
                "shipping_method": route_meta.get("shipping_method", "Sea"),
                "trade_route_type": route_meta.get("trade_route_type", "General Cargo"),
                "estimated_transit_days": route_meta.get("estimated_transit_days", 14),
                "date": str(row["date"])[:10],
                "trade_volume_tonnes": round(vol, 2),
                "port_congestion_index": round(float(row.get("port_congestion_index", 0.0)), 2),
                "weather_disruption_score": round(float(row.get("weather_disruption_score", 0.0)), 2),
                "geopolitical_risk_score": round(float(row.get("geopolitical_risk_score", 0.0)), 2),
                "container_availability_index": round(float(row.get("container_availability_index", 0.0)), 2),
                "fuel_cost_index": round(float(row.get("fuel_cost_index", 0.0)), 2),
                "commodity_price_index": round(float(row.get("commodity_price_index", 0.0)), 2),
                "disruption_probability": 0.0,
                "disruption_probability_percent": 0.0,
                "predicted_delay_days": 0.0,
                "predicted_freight_cost_usd": 0.0,
                "supply_guard_score": 0.0,
                "risk_level": "LOW",
                "ripple_risk_score": 0.0,
                "estimated_volume_at_risk_tonnes": 0.0,
                "delay_exposure_tonne_days": 0.0,
                "estimated_freight_cost_exposure_usd": 0.0,
                "network_exposure": {"direct_routes_count": 0, "second_order_routes_count": 0, "ripple_risk_score": 0.0, "avg_direct_risk": 0.0, "max_direct_risk": 0.0, "direct_routes_exposed": [], "second_order_routes_exposed": [], "disruption_modeling_note": "Insufficient historical data for ML prediction."},
                "has_sufficient_history": False,
                "error_status": "Insufficient historical data for ML prediction. Requires at least 4 consecutive weekly observations.",
                "inventory_shortage_risk": "Not available — inventory/demand data required",
                "methodology_note": "Insufficient historical data for ML prediction."
            }

    def get_dashboard_kpis(self) -> Dict[str, Any]:
        """Returns empty/null dashboard when no dataset is loaded, or dynamic real metrics when loaded."""
        if not self.is_loaded or not self.route_predictions:
            return {
                "is_loaded": False,
                "is_demo": False,
                "dataset_name": "",
                "total_routes": 0,
                "critical_routes": 0,
                "high_risk_routes": 0,
                "medium_risk_routes": 0,
                "low_risk_routes": 0,
                "avg_predicted_delay_days": 0.0,
                "estimated_volume_at_risk_tonnes": 0.0,
                "estimated_freight_cost_exposure_usd": 0.0,
                "avg_ripple_risk": 0.0,
                "avg_supply_guard_score": 0.0,
                "avg_disruption_probability_percent": 0.0,
                "risk_distribution": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
                "top_risk_routes": [],
                "system_status": "READY FOR ANALYSIS",
                "model_version": "v1.0-LightGBM"
            }

        routes = [r for r in self.route_predictions.values() if r.get("has_sufficient_history", True)]
        if not routes:
            return {
                "is_loaded": True,
                "is_demo": self.is_demo,
                "dataset_name": self.dataset_name,
                "total_routes": len(self.route_predictions),
                "critical_routes": 0,
                "high_risk_routes": 0,
                "medium_risk_routes": 0,
                "low_risk_routes": 0,
                "avg_predicted_delay_days": 0.0,
                "estimated_volume_at_risk_tonnes": 0.0,
                "estimated_freight_cost_exposure_usd": 0.0,
                "avg_ripple_risk": 0.0,
                "avg_supply_guard_score": 0.0,
                "avg_disruption_probability_percent": 0.0,
                "risk_distribution": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
                "top_risk_routes": [],
                "system_status": "ONLINE (DEMO DATASET)" if self.is_demo else "ONLINE (USER DATA)",
                "model_version": "v1.0-LightGBM"
            }

        total_routes = len(self.route_predictions)
        critical_routes = sum(1 for r in routes if r["risk_level"] == "CRITICAL")
        high_routes = sum(1 for r in routes if r["risk_level"] == "HIGH")
        medium_routes = sum(1 for r in routes if r["risk_level"] == "MEDIUM")
        low_routes = sum(1 for r in routes if r["risk_level"] == "LOW")

        avg_delay = round(float(np.mean([r["predicted_delay_days"] for r in routes])), 2)
        avg_ripple = round(float(np.mean([r["ripple_risk_score"] for r in routes])), 2)
        avg_score = round(float(np.mean([r["supply_guard_score"] for r in routes])), 2)
        avg_disruption = round(float(np.mean([r["disruption_probability_percent"] for r in routes])), 2)

        tot_vol_risk = round(float(sum(r["estimated_volume_at_risk_tonnes"] for r in routes)), 2)
        tot_freight_exp = round(float(sum(r["estimated_freight_cost_exposure_usd"] for r in routes)), 2)

        sorted_routes = sorted(routes, key=lambda x: x["supply_guard_score"], reverse=True)

        return {
            "is_loaded": True,
            "is_demo": self.is_demo,
            "dataset_name": self.dataset_name,
            "total_routes": total_routes,
            "critical_routes": critical_routes,
            "high_risk_routes": high_routes,
            "medium_risk_routes": medium_routes,
            "low_risk_routes": low_routes,
            "avg_predicted_delay_days": avg_delay,
            "estimated_volume_at_risk_tonnes": tot_vol_risk,
            "estimated_freight_cost_exposure_usd": tot_freight_exp,
            "avg_ripple_risk": avg_ripple,
            "avg_supply_guard_score": avg_score,
            "avg_disruption_probability_percent": avg_disruption,
            "risk_distribution": {
                "LOW": low_routes,
                "MEDIUM": medium_routes,
                "HIGH": high_routes,
                "CRITICAL": critical_routes
            },
            "top_risk_routes": sorted_routes[:10],
            "system_status": "ONLINE (DEMO DATASET)" if self.is_demo else "ONLINE (USER DATA)",
            "model_version": "v1.0-LightGBM"
        }

    def get_all_routes_summary(self) -> List[Dict[str, Any]]:
        if not self.is_loaded:
            return []
        return list(self.route_predictions.values())

    def get_route_risk(self, route_id: str) -> Optional[Dict[str, Any]]:
        if self.is_loaded and route_id in self.route_predictions:
            return self.route_predictions[route_id]
        if self.latest_single_prediction and self.latest_single_prediction["route_id"] == route_id:
            return self.latest_single_prediction
        return None

    def get_route_history(self, route_id: str, limit: int = 52) -> List[Dict[str, Any]]:
        if not self.is_loaded or self.features_df is None:
            return []
        route_df = (
            self.features_df[self.features_df["route_id"] == route_id]
            .sort_values("date")
            .tail(limit)
        )
        if route_df.empty:
            return []

        history = []
        for _, row in route_df.iterrows():
            history.append({
                "date": str(row["date"])[:10],
                "port_congestion_index": round(float(row["port_congestion_index"]), 2),
                "weather_disruption_score": round(float(row["weather_disruption_score"]), 2),
                "geopolitical_risk_score": round(float(row["geopolitical_risk_score"]), 2),
                "container_availability_index": round(float(row["container_availability_index"]), 2),
                "shipping_delay_days": round(float(row["shipping_delay_days"]), 2),
                "freight_cost_usd": round(float(row["freight_cost_usd"]), 2),
                "trade_volume_tonnes": round(float(row["trade_volume_tonnes"]), 2),
                "route_status": str(row.get("route_status", "Normal"))
            })
        return history

_risk_engine = None

def get_risk_engine() -> RiskEngine:
    global _risk_engine
    if _risk_engine is None:
        _risk_engine = RiskEngine()
    return _risk_engine
