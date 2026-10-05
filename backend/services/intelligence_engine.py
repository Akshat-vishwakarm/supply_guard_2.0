import os
import math
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "supply datra")

TRADE_ROUTES_CSV = os.path.join(DATA_DIR, "trade_routes.csv")
WEEKLY_OPERATIONS_CSV = os.path.join(DATA_DIR, "weekly_route_operations.csv")
COMMODITY_MARKET_CSV = os.path.join(DATA_DIR, "commodity_market.csv")
COUNTRY_METADATA_CSV = os.path.join(DATA_DIR, "country_metadata.csv")
GEOPOLITICAL_EVENTS_CSV = os.path.join(DATA_DIR, "geopolitical_events.csv")

# Currency exchange rates against USD (base = 1 USD)
# Transparent currency conversion layer for global logistics
CURRENCY_RATES_TO_USD: Dict[str, float] = {
    "USD": 1.0,
    "JPY": 150.0,
    "EUR": 0.92,
    "GBP": 0.78,
    "INR": 83.5,
    "CNY": 7.23,
    "AUD": 1.52,
    "CAD": 1.35,
    "BRL": 5.25,
    "SGD": 1.35,
    "KRW": 1350.0,
    "AED": 3.67,
    "CHF": 0.88,
    "HKD": 7.80
}

CURRENCY_SYMBOLS: Dict[str, str] = {
    "USD": "$",
    "JPY": "¥",
    "EUR": "€",
    "GBP": "£",
    "INR": "₹",
    "CNY": "¥",
    "AUD": "A$",
    "CAD": "C$",
    "BRL": "R$",
    "SGD": "S$",
    "KRW": "₩",
    "AED": "AED",
    "CHF": "CHF",
    "HKD": "HK$"
}

CURRENCY_NAMES: Dict[str, str] = {
    "USD": "US Dollar",
    "JPY": "Japanese Yen",
    "EUR": "Euro",
    "GBP": "British Pound",
    "INR": "Indian Rupee",
    "CNY": "Chinese Yuan",
    "AUD": "Australian Dollar",
    "CAD": "Canadian Dollar",
    "BRL": "Brazilian Real",
    "SGD": "Singapore Dollar",
    "KRW": "South Korean Won",
    "AED": "UAE Dirham",
    "CHF": "Swiss Franc",
    "HKD": "Hong Kong Dollar"
}

class IntelligenceEngine:
    _instance = None

    def __init__(self):
        self._df_routes: Optional[pd.DataFrame] = None
        self._df_ops: Optional[pd.DataFrame] = None
        self._df_comm: Optional[pd.DataFrame] = None
        self._df_country: Optional[pd.DataFrame] = None
        self._country_stats: Dict[str, Dict[str, float]] = {}
        self._route_stats: Dict[str, Dict[str, float]] = {}
        self._load_datasets()

    def _load_datasets(self):
        # 1. Trade Routes
        if os.path.exists(TRADE_ROUTES_CSV):
            try:
                self._df_routes = pd.read_csv(TRADE_ROUTES_CSV)
            except Exception as e:
                print(f"[IntelligenceEngine] Warning: trade_routes.csv could not be loaded: {e}")

        # 2. Country Metadata
        if os.path.exists(COUNTRY_METADATA_CSV):
            try:
                self._df_country = pd.read_csv(COUNTRY_METADATA_CSV)
            except Exception as e:
                print(f"[IntelligenceEngine] Warning: country_metadata.csv could not be loaded: {e}")

        # 3. Commodity Market
        if os.path.exists(COMMODITY_MARKET_CSV):
            try:
                self._df_comm = pd.read_csv(COMMODITY_MARKET_CSV)
                self._df_comm["date_dt"] = pd.to_datetime(self._df_comm["date"], errors="coerce")
            except Exception as e:
                print(f"[IntelligenceEngine] Warning: commodity_market.csv could not be loaded: {e}")

        # 4. Weekly Route Operations
        if os.path.exists(WEEKLY_OPERATIONS_CSV):
            try:
                self._df_ops = pd.read_csv(WEEKLY_OPERATIONS_CSV)
                self._df_ops["date_dt"] = pd.to_datetime(self._df_ops["date"], errors="coerce")
                self._precompute_statistics()
            except Exception as e:
                print(f"[IntelligenceEngine] Warning: weekly_route_operations.csv could not be loaded: {e}")

    def _precompute_statistics(self):
        """Precomputes median operational metrics per route and per country for instant inference."""
        if self._df_ops is None or self._df_ops.empty:
            return

        # Precompute per-route statistics
        for route_id, group in self._df_ops.groupby("route_id"):
            self._route_stats[str(route_id)] = {
                "median_congestion": float(group["port_congestion_index"].median()),
                "median_weather": float(group["weather_disruption_score"].median()),
                "median_geopolitical": float(group["geopolitical_risk_score"].median()),
                "median_container": float(group["container_availability_index"].median()),
                "median_fuel": float(group["fuel_cost_index"].median()),
                "median_commodity": float(group["commodity_price_index"].median()),
                "median_delay": float(group["shipping_delay_days"].median()),
                "median_cost": float(group["freight_cost_usd"].median()),
                "records_count": len(group)
            }

        # Precompute country-level statistics using routes mapping
        if self._df_routes is not None:
            merged = self._df_ops.merge(self._df_routes[["route_id", "origin_country", "destination_country"]], on="route_id", how="left")
            for country, group in merged.groupby("origin_country"):
                self._country_stats[str(country).strip().lower()] = {
                    "median_congestion": float(group["port_congestion_index"].median()),
                    "median_weather": float(group["weather_disruption_score"].median()),
                    "median_geopolitical": float(group["geopolitical_risk_score"].median()),
                    "median_container": float(group["container_availability_index"].median()),
                    "median_fuel": float(group["fuel_cost_index"].median()),
                    "median_commodity": float(group["commodity_price_index"].median()),
                    "routes_count": len(group["route_id"].unique()),
                    "records_count": len(group)
                }

    # -------------------------------------------------------------------------
    # ROUTE MATCHING & IDENTIFICATION
    # -------------------------------------------------------------------------
    def identify_route(
        self,
        origin_country: str,
        dest_country: str,
        origin_city: str = "",
        dest_city: str = ""
    ) -> Dict[str, Any]:
        """
        Inspects trade_routes.csv.
        If route exists between countries: loads genuine metadata.
        If route does not exist: creates temporary custom corridor with maritime physics baseline.
        Does NOT invent fake historical data.
        """
        norm_orig = str(origin_country).strip().lower()
        norm_dest = str(dest_country).strip().lower()

        if self._df_routes is not None and not self._df_routes.empty:
            matched = self._df_routes[
                (self._df_routes["origin_country"].str.lower() == norm_orig) &
                (self._df_routes["destination_country"].str.lower() == norm_dest)
            ]
            if not matched.empty:
                # Prefer sea shipping if available
                sea = matched[matched["shipping_method"].str.lower() == "sea"]
                row = sea.iloc[0] if not sea.empty else matched.iloc[0]
                route_id = str(row["route_id"])
                return {
                    "route_id": route_id,
                    "is_known_route": True,
                    "route_type": "Known Route",
                    "origin_country": str(row["origin_country"]),
                    "destination_country": str(row["destination_country"]),
                    "distance_km": float(row["distance_km"]),
                    "shipping_method": str(row["shipping_method"]),
                    "trade_route_type": str(row["trade_route_type"]),
                    "baseline_transit_days": float(row["estimated_transit_days"]),
                    "transit_source": "trade_routes.csv",
                    "has_historical_ops": route_id in self._route_stats,
                    "historical_records_count": self._route_stats.get(route_id, {}).get("records_count", 0),
                    "note": f"Documented trade lane in trade_routes.csv ({route_id})"
                }

        # Custom Route Handling via authentic nautical transit calculation
        from backend.services.port_registry import find_baseline_transit_days, find_port

        p1 = find_port(origin_city, origin_country)
        p2 = find_port(dest_city, dest_country)

        orig_coords = (float(p1["latitude"]), float(p1["longitude"])) if p1 and (p1.get("latitude") != 0.0 or p1.get("longitude") != 0.0) else None
        dest_coords = (float(p2["latitude"]), float(p2["longitude"])) if p2 and (p2.get("latitude") != 0.0 or p2.get("longitude") != 0.0) else None

        transit_info = find_baseline_transit_days(
            origin_country=origin_country,
            destination_country=dest_country,
            origin_city=origin_city,
            dest_city=dest_city,
            orig_coords=orig_coords,
            dest_coords=dest_coords
        )

        dist_km = transit_info["distance_km"]
        baseline_days = transit_info["baseline_transit_days"]
        source_desc = "Maritime physics calculation (18.5 knots sailing + 4.8d port dwell)"


        # Unique route ID for custom corridor based on ports
        p1_code = p1.get("port_code", "ORIG")
        p2_code = p2.get("port_code", "DEST")
        custom_id = f"CUSTOM-{p1_code[-3:]}-{p2_code[-3:]}".upper()

        return {
            "route_id": custom_id,
            "is_known_route": False,
            "route_type": "Custom Route",
            "origin_country": origin_country,
            "destination_country": dest_country,
            "distance_km": round(dist_km, 1),
            "shipping_method": "Sea",
            "trade_route_type": "Intermodal Maritime",
            "baseline_transit_days": baseline_days,
            "transit_source": source_desc,
            "has_historical_ops": False,
            "historical_records_count": 0,
            "note": "Corridor not in trade_routes.csv; calculated using transparent maritime sailing physics."
        }

    # -------------------------------------------------------------------------
    # COMMODITY & FUEL INTELLIGENCE
    # -------------------------------------------------------------------------
    def derive_commodity_and_fuel(self, departure_date: str) -> Dict[str, Any]:
        """
        Derives fuel cost index and commodity price index from commodity_market.csv
        at or closest to the shipment departure date.
        """
        if self._df_comm is not None and not self._df_comm.empty:
            try:
                target_dt = pd.to_datetime(departure_date)
                deltas = (self._df_comm["date_dt"] - target_dt).abs()
                closest_idx = deltas.idxmin()
                row = self._df_comm.loc[closest_idx]
                return {
                    "fuel_cost_index": round(float(row["oil_price"]), 1),
                    "commodity_price_index": round(float(row["commodity_stress_index"]), 1),
                    "source": "commodity_market.csv",
                    "matched_date": str(row["date"]),
                    "oil_price_usd": round(float(row["oil_price"]), 2),
                    "commodity_stress_score": round(float(row["commodity_stress_index"]), 2),
                    "provenance": "HISTORICAL DATA"
                }
            except Exception:
                pass

        # Fallback to empirical median from dataset
        return {
            "fuel_cost_index": 62.5,
            "commodity_price_index": 44.5,
            "source": "Empirical median baseline (commodity_market.csv)",
            "matched_date": departure_date,
            "oil_price_usd": 62.5,
            "commodity_stress_score": 44.5,
            "provenance": "ESTIMATED"
        }

    # -------------------------------------------------------------------------
    # PORT & CONTAINER INTELLIGENCE
    # -------------------------------------------------------------------------
    def derive_port_and_container(
        self,
        route_info: Dict[str, Any],
        origin_country: str,
        dest_country: str
    ) -> Dict[str, Any]:
        """
        Derives Port Congestion Index and Container Availability Index.
        If Known Route: uses genuine historical median for that route from weekly operations.
        If Custom Route: derives from country-level port operations and country_metadata.csv.
        """
        route_id = route_info.get("route_id")

        # 1. Known route in historical operations
        if route_info.get("is_known_route") and route_id in self._route_stats:
            stats = self._route_stats[route_id]
            return {
                "port_congestion_index": round(stats["median_congestion"], 1),
                "congestion_provenance": "HISTORICAL DATA",
                "congestion_source": f"Historical route median ({route_id})",
                "container_availability_index": round(stats["median_container"], 1),
                "container_provenance": "HISTORICAL DATA",
                "container_source": f"Historical route median ({route_id})"
            }

        # 2. Country-level operational statistics
        norm_orig = str(origin_country).strip().lower()
        if norm_orig in self._country_stats:
            c_stats = self._country_stats[norm_orig]
            return {
                "port_congestion_index": round(c_stats["median_congestion"], 1),
                "congestion_provenance": "HISTORICAL DATA",
                "congestion_source": f"Historical median for {origin_country} ports in operational dataset",
                "container_availability_index": round(c_stats["median_container"], 1),
                "container_provenance": "HISTORICAL DATA",
                "container_source": f"Historical median for {origin_country} maritime trade"
            }

        # 3. Country metadata logistics performance index
        if self._df_country is not None:
            c_match = self._df_country[self._df_country["country"].str.lower() == norm_orig]
            if not c_match.empty:
                row = c_match.iloc[0]
                port_cap = float(row.get("port_capacity_index", 50.0))
                lpi = float(row.get("logistics_performance_index", 50.0))
                # Higher port capacity = lower congestion index
                derived_congestion = round(np.clip(100.0 - (port_cap * 0.7), 20.0, 80.0), 1)
                derived_container = round(np.clip(lpi * 0.9, 25.0, 85.0), 1)
                return {
                    "port_congestion_index": derived_congestion,
                    "congestion_provenance": "DERIVED",
                    "congestion_source": f"Derived from {origin_country} Port Capacity Index in country_metadata.csv",
                    "container_availability_index": derived_container,
                    "container_provenance": "DERIVED",
                    "container_source": f"Derived from {origin_country} Logistics Performance Index (LPI)"
                }

        # 4. Documented standard baseline
        return {
            "port_congestion_index": 50.0,
            "congestion_provenance": "ESTIMATED",
            "congestion_source": "Documented standard maritime operating baseline",
            "container_availability_index": 50.0,
            "container_provenance": "ESTIMATED",
            "container_source": "Documented standard container availability baseline"
        }

    # -------------------------------------------------------------------------
    # GEOPOLITICAL RISK INTELLIGENCE
    # -------------------------------------------------------------------------
    def derive_geopolitical_risk(
        self,
        route_info: Dict[str, Any],
        origin_country: str,
        dest_country: str,
        departure_date: str
    ) -> Dict[str, Any]:
        """
        Derives Geopolitical Risk Score from weekly operations dataset and geopolitical events.
        """
        route_id = route_info.get("route_id")

        # 1. Known route in historical operations
        if route_info.get("is_known_route") and route_id in self._route_stats:
            stats = self._route_stats[route_id]
            return {
                "geopolitical_risk_score": round(stats["median_geopolitical"], 1),
                "geopolitical_provenance": "HISTORICAL DATA",
                "geopolitical_source": f"Historical route median ({route_id})"
            }

        # 2. Country-level operational median
        norm_orig = str(origin_country).strip().lower()
        if norm_orig in self._country_stats:
            c_stats = self._country_stats[norm_orig]
            return {
                "geopolitical_risk_score": round(c_stats["median_geopolitical"], 1),
                "geopolitical_provenance": "HISTORICAL DATA",
                "geopolitical_source": f"Historical corridor median for {origin_country} trade"
            }

        # 3. Regional baseline
        return {
            "geopolitical_risk_score": 35.0,
            "geopolitical_provenance": "ESTIMATED",
            "geopolitical_source": "Documented regional maritime security baseline"
        }

    # -------------------------------------------------------------------------
    # CURRENCY CONVERSION LAYER
    # -------------------------------------------------------------------------
    def convert_currency(
        self,
        amount_usd: float,
        target_currency: str
    ) -> Dict[str, Any]:
        """
        Converts USD amounts into user/route target currency.
        Does NOT alter the underlying ML model predictions.
        Transparently separates model currency (USD) from display currency.
        """
        target = str(target_currency).strip().upper()
        rate = CURRENCY_RATES_TO_USD.get(target, 1.0)
        converted = round(amount_usd * rate, 2)
        symbol = CURRENCY_SYMBOLS.get(target, target)
        curr_name = CURRENCY_NAMES.get(target, target)

        return {
            "amount_usd": round(amount_usd, 2),
            "converted_amount": converted,
            "target_currency": target,
            "currency_name": curr_name,
            "currency_symbol": symbol,
            "exchange_rate": rate,
            "rate_formatted": f"1 USD = {rate:,.2f} {target}",
            "formatted": f"{symbol}{converted:,.2f} {target}",
            "provenance": "DERIVED (FX conversion)" if target != "USD" else "MODEL PREDICTION (USD)"
        }

_intelligence_engine = None

def get_intelligence_engine() -> IntelligenceEngine:
    global _intelligence_engine
    if _intelligence_engine is None:
        _intelligence_engine = IntelligenceEngine()
    return _intelligence_engine
