from typing import Dict, List, Any
import pandas as pd
from backend.services.risk_engine import get_risk_engine

class BusinessImpactEngine:
    def __init__(self):
        pass

    def get_business_impact_overview(self) -> Dict[str, Any]:
        risk_engine = get_risk_engine()
        routes = risk_engine.get_all_routes_summary()

        total_volume = sum(r["trade_volume_tonnes"] for r in routes)
        total_vol_at_risk = sum(r["estimated_volume_at_risk_tonnes"] for r in routes)
        total_delay_exposure = sum(r["delay_exposure_tonne_days"] for r in routes)
        total_freight_exposure = sum(r["estimated_freight_cost_exposure_usd"] for r in routes)

        # Ranked by volume at risk
        top_by_volume = sorted(routes, key=lambda x: x["estimated_volume_at_risk_tonnes"], reverse=True)[:10]

        # Ranked by freight exposure
        top_by_freight = sorted(routes, key=lambda x: x["estimated_freight_cost_exposure_usd"], reverse=True)[:10]

        # Risk vs Volume scatter plot data
        scatter_data = [
            {
                "route_id": r["route_id"],
                "origin": r["origin"],
                "destination": r["destination"],
                "trade_volume_tonnes": r["trade_volume_tonnes"],
                "supply_guard_score": r["supply_guard_score"],
                "disruption_probability_percent": r["disruption_probability_percent"],
                "estimated_volume_at_risk_tonnes": r["estimated_volume_at_risk_tonnes"],
                "estimated_freight_cost_exposure_usd": r["estimated_freight_cost_exposure_usd"],
                "risk_level": r["risk_level"]
            }
            for r in routes
        ]

        return {
            "total_trade_volume_tonnes": round(total_volume, 2),
            "total_volume_at_risk_tonnes": round(total_vol_at_risk, 2),
            "total_delay_exposure_tonne_days": round(total_delay_exposure, 2),
            "total_freight_exposure_usd": round(total_freight_exposure, 2),
            "top_routes_by_volume_at_risk": [
                {
                    "route_id": r["route_id"],
                    "corridor": f"{r['origin']} → {r['destination']}",
                    "volume_at_risk": r["estimated_volume_at_risk_tonnes"],
                    "trade_volume": r["trade_volume_tonnes"],
                    "risk_score": r["supply_guard_score"],
                    "risk_level": r["risk_level"]
                }
                for r in top_by_volume
            ],
            "top_routes_by_freight_exposure": [
                {
                    "route_id": r["route_id"],
                    "corridor": f"{r['origin']} → {r['destination']}",
                    "freight_exposure": r["estimated_freight_cost_exposure_usd"],
                    "predicted_cost": r["predicted_freight_cost_usd"],
                    "risk_score": r["supply_guard_score"],
                    "risk_level": r["risk_level"]
                }
                for r in top_by_freight
            ],
            "risk_vs_volume_scatter": scatter_data,
            "disclaimer": "All metrics represent statistical Estimated Exposure based on disruption probability. They do not constitute verified actual financial or inventory loss."
        }

    def get_route_impact(self, route_id: str) -> Dict[str, Any]:
        risk_engine = get_risk_engine()
        r = risk_engine.get_route_risk(route_id)
        if not r:
            return {}

        return {
            "route_id": route_id,
            "corridor": f"{r['origin']} → {r['destination']}",
            "trade_volume_tonnes": r["trade_volume_tonnes"],
            "disruption_probability_percent": r["disruption_probability_percent"],
            "estimated_volume_at_risk_tonnes": r["estimated_volume_at_risk_tonnes"],
            "predicted_delay_days": r["predicted_delay_days"],
            "delay_exposure_tonne_days": r["delay_exposure_tonne_days"],
            "predicted_freight_cost_usd": r["predicted_freight_cost_usd"],
            "estimated_freight_cost_exposure_usd": r["estimated_freight_cost_exposure_usd"],
            "inventory_shortage_risk": "Not available — inventory/demand data required",
            "metric_type": "Estimated Exposure"
        }

_business_impact_engine = None

def get_business_impact_engine() -> BusinessImpactEngine:
    global _business_impact_engine
    if _business_impact_engine is None:
        _business_impact_engine = BusinessImpactEngine()
    return _business_impact_engine
