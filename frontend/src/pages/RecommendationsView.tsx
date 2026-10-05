import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Radio,
  FileCheck
} from 'lucide-react';
import { RecommendationItem } from '../types/supplyGuard';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';

interface RecommendationsViewProps {
  onSelectRoute: (routeId: string) => void;
  onShowToast: (msg: string) => void;
  onLoadDemo: () => void;
  isLoaded: boolean;
  activePrediction?: any;
  onNavigate?: (page: any) => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  onSelectRoute,
  onShowToast,
  onLoadDemo,
  isLoaded,
  activePrediction,
  onNavigate
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // If shipment analyzed, generate shipment-specific directives
  useEffect(() => {
    if (activePrediction) {
      const shipmentRecs: RecommendationItem[] = [];
      const congestion = Number(activePrediction.risk_factors?.port_congestion_index ?? (activePrediction.feature_dict?.port_congestion_index ?? 70));
      const weather = Number(activePrediction.risk_factors?.weather_disruption_score ?? (activePrediction.origin_weather?.weather_risk ?? 42));
      const delay = Number(activePrediction.predicted_delay_days ?? 0);
      const ripple = Number(activePrediction.network?.ripple_risk_score ?? 34.6);
      const routeId = activePrediction.route_id || 'ANALYZED-SHIPMENT';

      const corridor = activePrediction.corridor || `${activePrediction.origin_port || activePrediction.origin_city || 'Origin'} → ${activePrediction.destination_port || activePrediction.destination_city || 'Destination'}`;

      if (congestion >= 65) {
        shipmentRecs.push({
          id: 'REC-001',
          route_id: routeId,
          corridor,
          priority: 'HIGH',
          category: 'PORT_CONGESTION',
          action: 'HIGH PORT CONGESTION: Shift departure window (+24h to +48h) or request priority offloading berth',
          reason: `Origin port congestion index is elevated at ${congestion}/100. Terminal dwell queues may extend vessel turnaround.`,
          status: 'Active'
        });
      }

      if (weather >= 40) {
        shipmentRecs.push({
          id: 'REC-002',
          route_id: routeId,
          corridor,
          priority: weather >= 60 ? 'CRITICAL' : 'MEDIUM',
          category: 'WEATHER_SURGE',
          action: 'WEATHER RISK INCREASING: Monitor origin weather before departure and verify maritime safety corridors',
          reason: `Weather model predicts adverse precipitation or maritime storm conditions (${weather}/100 weather risk).`,
          status: 'Active'
        });
      }

      if (delay >= 3.0) {
        shipmentRecs.push({
          id: 'REC-003',
          route_id: routeId,
          corridor,
          priority: 'HIGH',
          category: 'TRANSIT_DELAY',
          action: 'PREDICTED TRANSIT DELAY: Notify receiving consignee and establish buffer safety stock',
          reason: `LightGBM delay model forecasts +${delay.toFixed(1)} days extension beyond baseline transit of ${activePrediction.baseline_transit_days || 17} days.`,
          status: 'Active'
        });
      }

      if (ripple >= 30) {
        shipmentRecs.push({
          id: 'REC-004',
          route_id: routeId,
          corridor,
          priority: 'MEDIUM',
          category: 'NETWORK_EXPOSURE',
          action: 'HIGH NETWORK EXPOSURE: Evaluate alternative route or secondary feeder corridors',
          reason: `Corridor exhibits ripple risk score of ${ripple}/100 across connected maritime network links.`,
          status: 'Active'
        });
      }

      // If no high risks triggered, provide affirmative baseline clearance
      if (shipmentRecs.length === 0) {
        shipmentRecs.push({
          id: 'REC-000',
          route_id: routeId,
          corridor,
          priority: 'LOW',
          category: 'SCHEDULE_CLEARANCE',
          action: 'NOMINAL CORRIDOR CLEARANCE: Proceed with standard scheduled dispatch timetable',
          reason: 'All ML risk indicators (congestion, weather, ripple, delay) remain within safe operating thresholds.',
          status: 'Active'
        });
      }

      setRecommendations(shipmentRecs);
      setLoading(false);
      return;
    }

    if (!isLoaded) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.getRecommendations()
      .then((res) => {
        setRecommendations(res.recommendations);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching recommendations:', err);
        setLoading(false);
      });
  }, [isLoaded, activePrediction]);

  const handleAction = (id: string, newStatus: 'Actioned' | 'Dismissed') => {
    setRecommendations((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: newStatus } : rec))
    );
    onShowToast(`Recommendation ${id} marked as ${newStatus.toUpperCase()}`);
  };

  const filteredRecs = recommendations.filter((r) => {
    if (priorityFilter === 'ALL') return true;
    return r.priority === priorityFilter;
  });

  if (!isLoaded && !activePrediction) {
    return (
      <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Directives Engine • Offline
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5', margin: 0 }}>
            Operational Recommendations &amp; Directives
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
            Deterministic rule-based directives and risk mitigation strategies triggered by ML model thresholds
          </p>
        </div>

        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <CheckSquare size={40} style={{ opacity: 0.25, color: '#f5f5f5', marginBottom: '1.25rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
            No Active Directives Generated
          </div>
          <div style={{ fontSize: '0.8rem', maxWidth: '440px', margin: '0.5rem auto 1.75rem auto', lineHeight: 1.5, color: 'var(--text-muted)' }}>
            Directives require active telemetry or an ingested corridor dataset to model threshold interventions.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {onNavigate && (
              <button className="btn btn-primary" onClick={() => onNavigate('overview')} style={{ padding: '0.6rem 1.4rem', fontSize: '0.75rem' }}>
                <span>Configure Shipment on Overview</span>
              </button>
            )}
            <button className="btn btn-secondary" onClick={onLoadDemo} style={{ padding: '0.6rem 1.4rem', fontSize: '0.75rem' }}>
              <Database size={13} style={{ marginRight: '0.4rem' }} /> Ingest Enterprise Demo Dataset
            </button>
          </div>
        </div>
      </div>
    );
  }

  const supplier = activePrediction?.shipment?.supplier_company || activePrediction?.supplier_company;
  const customer = activePrediction?.shipment?.customer_company || activePrediction?.customer_company;

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              ACTION DISPATCH • RULE-BASED DIRECTIVES
            </span>
            {supplier && customer && (
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                • {supplier} → {customer}
              </span>
            )}
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5' }}>
            Operational Recommendations &amp; Directives
          </h1>
          <p className="page-subtitle" style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Actionable interventions derived strictly from predictive ML disruption likelihoods, delays, and weather alerts
          </p>
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(15,15,15,0.6)', padding: '0.25rem', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => {
            const isSelected = priorityFilter === p;
            return (
              <button
                key={p}
                className="mono"
                style={{
                  fontSize: '0.68rem',
                  padding: '0.35rem 0.65rem',
                  borderRadius: 2,
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#000000' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setPriorityFilter(p)}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommendations Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredRecs.length === 0 ? (
          <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
            No recommendations currently matching the '{priorityFilter}' filter.
          </div>
        ) : (
          filteredRecs.map((rec) => {
            const isActioned = rec.status === 'Actioned';
            const isDismissed = rec.status === 'Dismissed';

            return (
              <div
                key={rec.id}
                className="card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  padding: '1.15rem 1.35rem',
                  background: isActioned
                    ? 'rgba(34, 197, 94, 0.03)'
                    : isDismissed
                    ? 'rgba(255, 255, 255, 0.015)'
                    : 'rgba(10, 10, 10, 0.5)',
                  border: isActioned
                    ? '1px solid rgba(34, 197, 94, 0.25)'
                    : isDismissed
                    ? '1px solid rgba(255, 255, 255, 0.04)'
                    : '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: 2,
                  opacity: isDismissed ? 0.6 : 1
                }}
              >
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                    <RiskBadge level={rec.priority as any} />
                    <span className="mono" style={{ fontSize: '0.68rem', color: '#e5e5e5', fontWeight: 600 }}>
                      {rec.id}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>•</span>
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {rec.category || 'OPERATION'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>•</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {rec.corridor}
                    </span>
                    {isActioned && (
                      <span className="mono" style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 600, padding: '0.1rem 0.4rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 2 }}>
                        ✓ ACTIONED
                      </span>
                    )}
                    {isDismissed && (
                      <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
                        DISMISSED
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.88rem', fontWeight: 500, color: isDismissed ? 'var(--text-muted)' : '#f5f5f5', lineHeight: 1.4 }}>
                    {rec.action}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.45 }}>
                    {rec.reason}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!isActioned && !isDismissed && (
                    <>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.72rem', borderRadius: 2 }}
                        onClick={() => handleAction(rec.id, 'Actioned')}
                      >
                        <CheckCircle2 size={13} style={{ marginRight: '0.35rem' }} /> Mark Actioned
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.8rem', fontSize: '0.72rem', borderRadius: 2, color: 'var(--text-dim)' }}
                        onClick={() => handleAction(rec.id, 'Dismissed')}
                      >
                        <XCircle size={13} style={{ marginRight: '0.35rem' }} /> Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
