import os
import json
import urllib.request
from typing import Dict, Any, Optional

class GeminiExplainer:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    def explain_route(self, route_summary: Dict[str, Any], recommendations: list) -> str:
        """
        Synthesizes a clear executive risk briefing based solely on the
        deterministic ML predictions and risk engine outputs.
        """
        r_id = route_summary["route_id"]
        corridor = f"{route_summary['origin']} → {route_summary['destination']}"
        score = route_summary["supply_guard_score"]
        level = route_summary["risk_level"]
        prob = route_summary["disruption_probability_percent"]
        delay = route_summary["predicted_delay_days"]
        cost = route_summary["predicted_freight_cost_usd"]
        ripple = route_summary["ripple_risk_score"]
        vol = route_summary["estimated_volume_at_risk_tonnes"]
        rec_actions = [f"- {r['action']} ({r['reason']})" for r in recommendations[:3]]
        rec_text = "\n".join(rec_actions) if rec_actions else "- Standard operational monitoring"

        # Deterministic structured briefing
        structured_summary = f"""### Route Executive Briefing: {r_id} ({corridor})

**Current Operational Risk Assessment**: **{level}** (Supply Guard Score: **{score}/100**)

#### 1. Predictive Risk Diagnostics
- **Disruption Likelihood**: The LightGBM Disruption Classifier projects an **{prob}% probability** of significant route disruption (delay ≥ 12 days).
- **Projected Delay**: LightGBM Regressor estimates an average transit delay of **{delay} days** above scheduled transit ({route_summary['estimated_transit_days']} days baseline).
- **Freight Cost Projection**: Predicted spot freight rate stands at **${cost:,.2f}** for this corridor.

#### 2. Network Exposure & Topological Ripple Risk
- Modeled network ripple exposure is assessed at **{ripple}/100**, connecting **{route_summary['network_exposure']['direct_routes_count']} direct corridors** and **{route_summary['network_exposure']['second_order_routes_count']} second-order routes**.
- Peak connected route disruption risk across adjacent links is **{route_summary['network_exposure']['max_direct_risk']}%**.

#### 3. Operational Exposure
- **Estimated Volume at Risk**: **{vol:,.1f} tonnes** currently moving through corridor bottlenecks.
- **Congestion & Friction Indices**: Port Congestion: **{route_summary['port_congestion_index']}/100** | Geopolitical Tension: **{route_summary['geopolitical_risk_score']}/100** | Weather Friction: **{route_summary['weather_disruption_score']}/100**.

#### 4. Priority Operational Directives
{rec_text}
"""
        return structured_summary

    def generate_executive_report(self, dashboard_kpis: Dict[str, Any], top_routes: list) -> str:
        """
        Synthesizes an executive supply-chain control tower briefing across all 50 corridors.
        """
        total = dashboard_kpis.get("total_routes", 50)
        high = dashboard_kpis.get("high_risk_routes", 0)
        critical = dashboard_kpis.get("critical_routes", 0)
        avg_delay = dashboard_kpis.get("avg_predicted_delay_days", 0.0)
        vol_risk = dashboard_kpis.get("estimated_volume_at_risk_tonnes", 0.0)
        freight_exp = dashboard_kpis.get("estimated_freight_cost_exposure_usd", 0.0)

        top_route_lines = []
        for r in top_routes[:5]:
            top_route_lines.append(
                f"- **{r['route_id']}** ({r['origin']} → {r['destination']}): Score **{r['supply_guard_score']}** ({r['risk_level']}), "
                f"Disruption **{r['disruption_probability_percent']}%**, Delay **{r['predicted_delay_days']}d**, Vol at Risk: **{r['estimated_volume_at_risk_tonnes']:,.0f}t**"
            )
        routes_summary_md = "\n".join(top_route_lines)

        report = f"""# Supply Guard 2.0 — Executive Risk & Network Intelligence Report

**System Status**: ● ML ENGINE ONLINE | LightGBM Production Pipeline Active  
**Corridor Coverage**: {total} Global Trade Corridors Monitored  
**Active Risk Tiers**: {critical} Critical | {high} High | {dashboard_kpis.get('medium_risk_routes', 0)} Medium | {dashboard_kpis.get('low_risk_routes', 0)} Low  

---

### Executive Summary

Across the active global trade network of {total} routes, the automated ML ensemble predicts an average network transit delay of **{avg_delay} days**, with an aggregate estimated volume at risk of **{vol_risk:,.2f} tonnes** and freight cost exposure of **${freight_exp:,.2f}**.

Network health remains predominantly stable, with **{high + critical} routes** requiring elevated oversight and tactical intervention.

### Highest Vulnerability Corridors
{routes_summary_md}

### Strategic Recommendations
1. **Corridor Diversion & Capacity Shifting**: Prioritize alternative routings for routes exhibiting disruption probabilities above 50%, particularly in Asian and Trans-Atlantic trade segments.
2. **Buffer Expansion**: Implement a dynamic 3 to 5 day schedule buffer for routes with predicted delays exceeding 8.0 days.
3. **Port & Equipment Coordination**: Pre-book container equipment and adjust destination terminals to alleviate pressure from ports showing congestion indexes exceeding 70.

*Note: All disruption probabilities, delays, and freight rates are deterministically inferred via pre-trained LightGBM gradient boosting models. Volume at risk figures reflect estimated statistical exposure.*
"""
        return report

_gemini_explainer = None

def get_gemini_explainer() -> GeminiExplainer:
    global _gemini_explainer
    if _gemini_explainer is None:
        _gemini_explainer = GeminiExplainer()
    return _gemini_explainer
