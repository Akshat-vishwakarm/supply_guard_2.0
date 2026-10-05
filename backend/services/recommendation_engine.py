from typing import Dict, List, Any

class RecommendationEngine:
    def __init__(self):
        pass

    def generate_route_recommendations(self, route_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Deterministic rule-based recommendations for a single route.
        """
        recs = []
        r_id = route_info["route_id"]
        corridor = f"{route_info['origin']} → {route_info['destination']}"
        disrupt_prob = route_info["disruption_probability"]
        delay_days = route_info["predicted_delay_days"]
        congestion = route_info["port_congestion_index"]
        weather = route_info["weather_disruption_score"]
        geopolitical = route_info["geopolitical_risk_score"]
        container = route_info["container_availability_index"]
        cost = route_info["predicted_freight_cost_usd"]

        # Rule 1: High disruption probability
        if disrupt_prob >= 0.50:
            recs.append({
                "id": f"REC-{r_id}-01",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "CRITICAL",
                "category": "Route Strategy",
                "action": "Activate alternate route planning",
                "reason": f"Disruption probability is {round(disrupt_prob * 100, 1)}% (exceeds critical 50% threshold).",
                "status": "Active"
            })
        elif disrupt_prob >= 0.25:
            recs.append({
                "id": f"REC-{r_id}-02",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "HIGH",
                "category": "Route Strategy",
                "action": "Prepare an alternate route",
                "reason": f"Disruption probability is {round(disrupt_prob * 100, 1)}% (exceeds candidate operating threshold of 25%).",
                "status": "Active"
            })

        # Rule 2: High predicted delays
        if delay_days >= 12.0:
            recs.append({
                "id": f"REC-{r_id}-03",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "HIGH",
                "category": "Schedule",
                "action": "Increase delivery time buffer",
                "reason": f"Predicted delay of {round(delay_days, 1)} days exceeds 12-day severe threshold.",
                "status": "Active"
            })
        elif delay_days >= 7.0:
            recs.append({
                "id": f"REC-{r_id}-04",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "MEDIUM",
                "category": "Schedule",
                "action": "Review shipment schedule",
                "reason": f"Predicted delay is {round(delay_days, 1)} days; adjustments to delivery commitments recommended.",
                "status": "Active"
            })

        # Rule 3: Port Congestion
        if congestion >= 70.0:
            recs.append({
                "id": f"REC-{r_id}-05",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "HIGH",
                "category": "Port Operations",
                "action": "Evaluate alternate port",
                "reason": f"Port congestion index is elevated at {round(congestion, 1)}/100.",
                "status": "Active"
            })

        # Rule 4: Weather Disruption
        if weather >= 70.0:
            recs.append({
                "id": f"REC-{r_id}-06",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "MEDIUM",
                "category": "Weather Alert",
                "action": "Review weather-sensitive shipments",
                "reason": f"Weather disruption score is elevated at {round(weather, 1)}/100.",
                "status": "Active"
            })

        # Rule 5: Geopolitical Risk
        if geopolitical >= 70.0:
            recs.append({
                "id": f"REC-{r_id}-07",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "HIGH",
                "category": "Geopolitical",
                "action": "Evaluate alternate trade corridors",
                "reason": f"Geopolitical risk score reached {round(geopolitical, 1)}/100 along transit borders.",
                "status": "Active"
            })

        # Rule 6: Container Availability Shortage
        if container <= 30.0:
            recs.append({
                "id": f"REC-{r_id}-08",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "HIGH",
                "category": "Equipment",
                "action": "Secure additional container capacity",
                "reason": f"Container availability index is constrained at {round(container, 1)}/100.",
                "status": "Active"
            })

        # Rule 7: Freight Cost Outlier
        if cost >= 4600.0:
            recs.append({
                "id": f"REC-{r_id}-09",
                "route_id": r_id,
                "corridor": corridor,
                "priority": "MEDIUM",
                "category": "Cost Optimization",
                "action": "Evaluate alternative carrier or route",
                "reason": f"Predicted freight cost of ${round(cost):,} is in the upper operational percentile.",
                "status": "Active"
            })

        return recs

    def get_all_recommendations(self) -> List[Dict[str, Any]]:
        try:
            from services.risk_engine import get_risk_engine
        except ImportError:
            try:
                from risk_engine import get_risk_engine
            except ImportError:
                from backend.services.risk_engine import get_risk_engine
        risk_engine = get_risk_engine()
        routes = risk_engine.get_all_routes_summary()
        all_recs = []
        for r in routes:
            all_recs.extend(self.generate_route_recommendations(r))

        # Sort recommendations by priority (CRITICAL, HIGH, MEDIUM, LOW)
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        all_recs.sort(key=lambda x: priority_order.get(x["priority"], 99))
        return all_recs

_recommendation_engine = None

def get_recommendation_engine() -> RecommendationEngine:
    global _recommendation_engine
    if _recommendation_engine is None:
        _recommendation_engine = RecommendationEngine()
    return _recommendation_engine
