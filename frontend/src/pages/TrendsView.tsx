import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Database, FileSpreadsheet, Activity, ShieldAlert, Clock, CloudRain, Anchor, Layers } from 'lucide-react';
import { RouteItem, RouteHistoryItem } from '../types/supplyGuard';
import { api } from '../services/api';

interface TrendsViewProps {
  routes: RouteItem[];
  selectedRouteId: string;
  onSelectRouteId: (id: string) => void;
  onLoadDemo: () => void;
  isLoaded: boolean;
}

export const TrendsView: React.FC<TrendsViewProps> = ({
  routes,
  selectedRouteId,
  onSelectRouteId,
  onLoadDemo,
  isLoaded
}) => {
  const [routeId, setRouteId] = useState<string>(selectedRouteId || (routes[0]?.route_id || 'R00012'));
  const [history, setHistory] = useState<RouteHistoryItem[]>([]);
  const [timeRange, setTimeRange] = useState<number>(30); // 7, 30, 52
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isLoaded || !routeId) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getRouteHistory(routeId, 52)
      .then((res) => {
        setHistory(res.history || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching route history:', err);
        setLoading(false);
      });
  }, [routeId, isLoaded]);

  const visibleHistory = useMemo(() => {
    if (history.length <= timeRange) return history;
    return history.slice(history.length - timeRange);
  }, [history, timeRange]);

  if (!isLoaded || routes.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Historical Ledger • Inactive
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5', margin: 0 }}>
            Historical Corridor Trends
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
            Chronological multi-week operational telemetry from the Supply Guard dataset
          </p>
        </div>

        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <FileSpreadsheet size={40} style={{ opacity: 0.25, color: '#f5f5f5', marginBottom: '1.25rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
            No Historical Time-Series Loaded
          </div>
          <div style={{ fontSize: '0.8rem', maxWidth: '440px', margin: '0.5rem auto 1.75rem auto', lineHeight: 1.5, color: 'var(--text-muted)' }}>
            Load the enterprise dataset to visualize chronological disruption probabilities, delay histories, congestion, weather risks, and Supply Guard Scores.
          </div>
          <button className="btn btn-primary" onClick={onLoadDemo} style={{ padding: '0.6rem 1.4rem', fontSize: '0.75rem' }}>
            <Database size={13} style={{ marginRight: '0.4rem' }} /> Ingest Enterprise Demo Dataset
          </button>
        </div>
      </div>
    );
  }

  // Active route
  const currentRoute = routes.find((r) => r.route_id === routeId) || routes[0];

  // Helper to extract or derive the 5 required metrics for any historical data point
  const getMetricValue = (item: RouteHistoryItem, key: string): number => {
    if (key === 'disruption_probability') {
      const explicit = (item as any).disruption_probability_percent ?? ((item as any).disruption_probability ? (item as any).disruption_probability * 100 : null);
      if (explicit !== null) return explicit;
      const base = item.weather_disruption_score * 0.35 + item.port_congestion_index * 0.35 + item.geopolitical_risk_score * 0.18 + (item.shipping_delay_days > 2 ? 15 : 0);
      return Math.round(Math.min(95, Math.max(5, base)) * 10) / 10;
    }
    if (key === 'supply_guard_score') {
      const explicit = (item as any).supply_guard_score;
      if (explicit !== null && explicit !== undefined) return explicit;
      const dis = getMetricValue(item, 'disruption_probability');
      const score = 100 - (dis * 0.45 + item.port_congestion_index * 0.25 + item.shipping_delay_days * 2.2);
      return Math.round(Math.min(98, Math.max(12, score)) * 10) / 10;
    }
    if (key === 'delay') {
      return Number(item.shipping_delay_days || 0);
    }
    if (key === 'port_congestion') {
      return Number(item.port_congestion_index || 0);
    }
    if (key === 'weather_risk') {
      return Number(item.weather_disruption_score || 0);
    }
    return Number((item as any)[key] || 0);
  };

  const renderTrendChart = (
    title: string,
    metricKey: string,
    unit: string,
    minVal: number,
    maxVal: number,
    subtitle: string,
    icon: React.ReactNode
  ) => {
    if (!visibleHistory.length) return null;

    const width = 500;
    const height = 180;
    const padX = 42;
    const padY = 22;

    const points = visibleHistory.map((item, idx) => {
      const x = padX + (idx / (visibleHistory.length - 1 || 1)) * (width - padX - 18);
      const val = getMetricValue(item, metricKey);
      const y = height - padY - ((val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padY);
      return { x, y, val, date: item.date };
    });

    const pathData = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
    const latestVal = points[points.length - 1]?.val || 0;
    const avgVal = points.reduce((acc, p) => acc + p.val, 0) / points.length;

    return (
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ color: '#ffffff' }}>{icon}</div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                  {title}
                </span>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {subtitle}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 600 }}>
                {latestVal.toFixed(1)} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-dim)' }}>{unit}</span>
              </div>
              <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                AVG: {avgVal.toFixed(1)} {unit}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', background: 'rgba(5, 5, 5, 0.75)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 2 }}>
            <line x1={padX} y1={height - padY} x2={width - 18} y2={height - padY} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1={padX} y1={(height - padY + padY) / 2} x2={width - 18} y2={(height - padY + padY) / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" strokeWidth="1" />
            <line x1={padX} y1={padY} x2={width - 18} y2={padY} stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" strokeWidth="1" />

            <defs>
              <linearGradient id={`grad-mono-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <path
              d={`${pathData} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`}
              fill={`url(#grad-mono-${metricKey})`}
            />

            <path d={pathData} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

            {points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={i === points.length - 1 ? 3.5 : 1.5}
                fill={i === points.length - 1 ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                stroke="#000000"
                strokeWidth={i === points.length - 1 ? 1.5 : 0}
              />
            ))}

            <text x={padX - 6} y={height - padY + 3} textAnchor="end" fill="var(--text-dim)" fontSize="0.6rem" fontFamily="JetBrains Mono, monospace">
              {minVal}
            </text>
            <text x={padX - 6} y={padY + 4} textAnchor="end" fill="var(--text-dim)" fontSize="0.6rem" fontFamily="JetBrains Mono, monospace">
              {maxVal}
            </text>
          </svg>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
            <span className="mono">{visibleHistory[0]?.date}</span>
            <span className="mono" style={{ color: 'var(--text-muted)' }}>{visibleHistory.length} TELEMETRY POINTS</span>
            <span className="mono">{visibleHistory[visibleHistory.length - 1]?.date}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              CHRONOLOGICAL REPOSITORY • 52-WEEK MULTI-HORIZON
            </span>
            {currentRoute && (
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                • {currentRoute.origin} → {currentRoute.destination}
              </span>
            )}
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5' }}>
            Historical Corridor Trends
          </h1>
          <p className="page-subtitle" style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            5 key predictive model variables tracked across historical voyage cycles
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <select
            className="search-input"
            style={{ width: 'auto', minWidth: '220px', cursor: 'pointer', padding: '0.4rem 0.75rem', fontSize: '0.75rem', background: 'rgba(15,15,15,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, color: '#f5f5f5' }}
            value={routeId}
            onChange={(e) => {
              setRouteId(e.target.value);
              onSelectRouteId(e.target.value);
            }}
          >
            {routes.map((r) => (
              <option key={r.route_id} value={r.route_id}>
                {r.route_id} — {r.origin} → {r.destination}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(15,15,15,0.6)', padding: '0.2rem', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
            {[7, 30, 52].map((range) => {
              const isSelected = timeRange === range;
              return (
                <button
                  key={range}
                  className="mono"
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.68rem',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#000000' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 2,
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setTimeRange(range)}
                >
                  {range === 52 ? '52W' : `${range}W`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          Loading operational history time-series...
        </div>
      ) : (
        /* THE 5 REQUIRED CHARTS VISUALIZED IN SLEEK MONOCHROME */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
          {/* 1. Disruption probability over time */}
          {renderTrendChart(
            'Disruption Probability',
            'disruption_probability',
            '%',
            0,
            100,
            'Historical likelihood of logistical disruption',
            <ShieldAlert size={15} />
          )}

          {/* 2. Delay over time */}
          {renderTrendChart(
            'Transit Delay Deviation',
            'delay',
            'days',
            0,
            20,
            'Recorded transit extension beyond baseline',
            <Clock size={15} />
          )}

          {/* 3. Port congestion over time */}
          {renderTrendChart(
            'Port Congestion Index',
            'port_congestion',
            '/100',
            0,
            100,
            'Terminal dwell times and harbor bottleneck index',
            <Anchor size={15} />
          )}

          {/* 4. Weather risk over time */}
          {renderTrendChart(
            'Weather Severity Score',
            'weather_risk',
            '/100',
            0,
            100,
            'Ocean swell, wind shear, and precipitation risk',
            <CloudRain size={15} />
          )}

          {/* 5. Supply Guard Score over time */}
          {renderTrendChart(
            'Supply Guard Resilience Score',
            'supply_guard_score',
            '/100',
            0,
            100,
            'Composite corridor resilience and integrity index',
            <Activity size={15} />
          )}
        </div>
      )}
    </div>
  );
};

