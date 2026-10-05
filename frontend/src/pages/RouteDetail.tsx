import React, { useState, useEffect } from 'react';
import {
  Route as RouteIcon,
  Clock,
  DollarSign,
  AlertTriangle,
  Share2,
  Sliders,
  CheckSquare,
  Sparkles,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { RouteItem, RecommendationItem } from '../types/supplyGuard';
import { RiskBadge } from '../components/RiskBadge';
import { RiskGauge } from '../components/RiskGauge';
import { api } from '../services/api';

interface RouteDetailProps {
  route: RouteItem;
  onNavigate: (page: any) => void;
  onSelectRouteId: (id: string) => void;
}

export const RouteDetail: React.FC<RouteDetailProps> = ({
  route,
  onNavigate,
  onSelectRouteId
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  const [explaining, setExplaining] = useState<boolean>(false);

  useEffect(() => {
    api.getRouteRecommendations(route.route_id)
      .then((res) => setRecommendations(res.recommendations))
      .catch((err) => console.error('Error fetching recommendations:', err));
  }, [route.route_id]);

  const handleGenerateExplanation = async () => {
    setExplaining(true);
    try {
      const res = await api.getRouteExplanation(route.route_id);
      setExplanation(res.explanation);
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  };

  const net = route.network_exposure;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Back button link */}
      <div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onNavigate('routes')}
          style={{ height: '28px', fontSize: '11px' }}
        >
          <ChevronLeft size={12} />
          <span>Back to Route Directory</span>
        </button>
      </div>

      {/* Header Profile Card */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span className="mono" style={{ fontSize: '1.45rem', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                {route.route_id}
              </span>
              <RiskBadge level={route.risk_level} />
              <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                OBSERVATION: {route.date || '2026-10-05'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#FFFFFF', margin: 0 }}>
              {route.origin} → {route.destination}
            </h1>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-body)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
              Mode: {route.shipping_method} • Sector: {route.trade_route_type} • Distance: {route.distance_km?.toLocaleString()} km • Target Transit: {route.estimated_transit_days}d
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleGenerateExplanation}
              disabled={explaining}
            >
              <Sparkles size={13} />
              <span>{explaining ? 'Analyzing...' : 'Generate AI Briefing'}</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onSelectRouteId(route.route_id);
                onNavigate('simulator');
              }}
            >
              <Sliders size={13} />
              <span>Stress-Test Corridor</span>
            </button>
          </div>
        </div>

        {explanation && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-xs)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem', color: '#FFFFFF', fontWeight: 500, fontSize: '0.78rem' }}>
              <Sparkles size={13} />
              <span>AI Executive Synthesis Briefing</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.76rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {explanation}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Gauge + Predictions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Risk Score */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card-title" style={{ width: '100%' }}>
            <span>SUPPLY GUARD RISK INDEX</span>
            <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>COMPOSITE</span>
          </div>
          <RiskGauge score={route.supply_guard_score} level={route.risk_level} size={210} />
          <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '320px', marginTop: '0.65rem', fontFamily: 'var(--font-mono)' }}>
            Weights: 50% Disruption ({route.disruption_probability_percent}%) + 30% Delay (+{route.predicted_delay_days.toFixed(1)}d) + 20% Ripple ({route.ripple_risk_score.toFixed(1)})
          </div>
        </div>

        {/* ML Predictions */}
        <div className="card">
          <div className="card-title">
            <span>CORE ML PREDICTIVE OUTPUTS</span>
            <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>LIGHTGBM-V1</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>SIGNIFICANT DISRUPTION PROBABILITY</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-body)' }}>Target: delay ≥ 12 days (threshold: 25%)</div>
              </div>
              <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 300, color: route.disruption_probability_percent >= 50 ? '#EF4444' : '#FFFFFF' }}>
                {route.disruption_probability_percent}%
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>PREDICTED TRANSIT DELAY</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-body)' }}>Over baseline {route.estimated_transit_days}d transit</div>
              </div>
              <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 300, color: '#FFFFFF' }}>
                +{route.predicted_delay_days.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>days</span>
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-xs)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>PREDICTED FREIGHT RATE</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-body)' }}>Trained LightGBM cost regressor</div>
              </div>
              <div className="mono" style={{ fontSize: '1.45rem', fontWeight: 300, color: '#FFFFFF' }}>
                ${route.predicted_freight_cost_usd?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Features */}
      <div className="card">
        <div className="card-title">
          <span>OPERATIONAL CONDITIONS (INFERENCE INPUT METRICS)</span>
          <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>DATE: {route.date}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.65rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-xs)' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TRADE VOLUME</span>
            <div className="mono" style={{ fontSize: '1.15rem', color: '#FFFFFF', marginTop: '2px' }}>
              {route.trade_volume_tonnes?.toLocaleString()} t
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-xs)' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>PORT CONGESTION</span>
            <div className="mono" style={{ fontSize: '1.15rem', color: '#FFFFFF', marginTop: '2px' }}>
              {route.port_congestion_index} / 100
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-xs)' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>WEATHER RISK</span>
            <div className="mono" style={{ fontSize: '1.15rem', color: '#FFFFFF', marginTop: '2px' }}>
              {route.weather_disruption_score} / 100
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-xs)' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>GEOPOLITICAL</span>
            <div className="mono" style={{ fontSize: '1.15rem', color: '#FFFFFF', marginTop: '2px' }}>
              {route.geopolitical_risk_score} / 100
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-xs)' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>CONTAINER AVAILABILITY</span>
            <div className="mono" style={{ fontSize: '1.15rem', color: '#FFFFFF', marginTop: '2px' }}>
              {route.container_availability_index} / 100
            </div>
          </div>
        </div>
      </div>

      {/* Network Exposure & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Network Exposure */}
        <div className="card">
          <div className="card-title">
            <span>NETWORK TOPOLOGICAL EXPOSURE</span>
            <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>MULTI-HOP</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-xs)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-body)' }}>Direct Adjacent Routes:</span>
              <span className="mono" style={{ color: '#FFFFFF' }}>{net?.direct_routes_count || 4} lanes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-xs)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-body)' }}>2nd-Order Exposure:</span>
              <span className="mono" style={{ color: '#FFFFFF' }}>{net?.second_order_routes_count || 12} nodes</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-xs)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-body)' }}>Ripple Risk Score:</span>
              <span className="mono" style={{ color: '#FFFFFF' }}>{route.ripple_risk_score.toFixed(1)} / 100</span>
            </div>
          </div>
        </div>

        {/* Action Directives */}
        <div className="card">
          <div className="card-title">
            <span>CORRIDOR DIRECTIVES &amp; MITIGATIONS</span>
            <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>RULE ENGINE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 'var(--radius-xs)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{rec.category}</span>
                    <span className={`risk-badge ${rec.priority}`}>{rec.priority}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#FFFFFF', fontWeight: 500 }}>
                    {rec.action}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                No active critical directives for this corridor. Operational conditions nominal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
