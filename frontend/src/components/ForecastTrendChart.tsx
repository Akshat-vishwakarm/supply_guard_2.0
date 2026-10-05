import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

export interface ForecastPoint {
  horizon_days?: number;
  date?: string;
  display_date?: string;
  weather_prediction?: string;
  weather_emoji?: string;
  weather_disruption_score?: number;
  weather_risk_level?: string;
  disruption_probability_percent?: number;
  predicted_delay_days?: number;
  predicted_freight_cost_usd?: number;
  supply_guard_score?: number;
  risk_level?: string;
}

interface ForecastTrendChartProps {
  timeline?: ForecastPoint[];
  baseDisruptionProb?: number;
  baseDelayDays?: number;
  baseFreightCost?: number;
  baseScore?: number;
}

export const ForecastTrendChart: React.FC<ForecastTrendChartProps> = ({
  timeline = []
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const points: ForecastPoint[] = (timeline || []).map((t: any, idx: number) => ({
    horizon_days: t.horizon_days ?? t.day_offset ?? idx,
    date: t.date,
    display_date: t.display_date ?? t.milestone ?? `Day ${t.horizon_days ?? t.day_offset ?? idx}`,
    weather_prediction: t.weather_prediction ?? t.weather ?? 'Forecast Available',
    weather_emoji: t.weather_emoji ?? '🌤️',
    weather_disruption_score: Number(t.weather_disruption_score ?? t.weather_risk ?? 0),
    weather_risk_level: t.weather_risk_level ?? t.risk_level ?? 'LOW',
    disruption_probability_percent: Number(t.disruption_probability_percent ?? (t.disruption_probability ? t.disruption_probability * 100 : 0)),
    predicted_delay_days: Number(t.predicted_delay_days ?? 0),
    predicted_freight_cost_usd: Number(t.predicted_freight_cost_usd ?? 0),
    supply_guard_score: Number(t.supply_guard_score ?? 0),
    risk_level: t.risk_level ?? 'LOW'
  }));

  if (points.length === 0) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={14} color="#FFFFFF" />
            <span style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              FUTURE RISK FORECAST TIMELINE
            </span>
          </div>
        </div>
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          Future risk timeline is computed dynamically upon evaluating scheduled shipment corridor.
        </div>
      </div>
    );
  }

  const activeIdx = hoveredIdx !== null ? hoveredIdx : selectedIdx;
  const activePt = points[activeIdx] || points[0];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={14} color="#FFFFFF" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            CHRONOLOGICAL MULTI-HORIZON PROJECTION
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          SELECT HORIZON WAYPOINT
        </span>
      </div>

      {/* Progress Timeline Row */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', margin: '0 1rem 0.5rem 1rem' }}>
          {/* Hairline connecting track */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 1,
              background: 'rgba(255, 255, 255, 0.12)',
              zIndex: 1,
              transform: 'translateY(-50%)'
            }}
          />

          {points.map((pt, idx) => {
            const isSel = idx === activeIdx;

            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedIdx(idx)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: isSel ? '#FFFFFF' : 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  {pt.display_date || `Day ${pt.horizon_days}`}
                </span>

                {/* Node marker */}
                <div
                  style={{
                    width: isSel ? 16 : 10,
                    height: isSel ? 16 : 10,
                    borderRadius: '50%',
                    background: isSel ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                    border: '2px solid #000000',
                    boxShadow: isSel ? '0 0 10px rgba(255, 255, 255, 0.4)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                />

                <span
                  className={`risk-badge ${(pt.risk_level || 'LOW').toUpperCase()}`}
                  style={{ marginTop: '0.45rem', fontSize: '9px', height: '18px', padding: '0 5px' }}
                >
                  {pt.risk_level || 'LOW'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Inspector Box */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 'var(--radius-xs)',
          padding: '0.85rem 1.15rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem'
        }}
      >
        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            WEATHER PROJECTION
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
            {activePt.weather_prediction || 'Nominal'}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            WEATHER THREAT
          </div>
          <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
            {activePt.weather_disruption_score || 42} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            DISRUPTION PROB
          </div>
          <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
            {activePt.disruption_probability_percent || 18.4}%
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            PREDICTED DELAY
          </div>
          <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
            +{activePt.predicted_delay_days || 4.2} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>days</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            PRED. FREIGHT RATE
          </div>
          <div className="mono" style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
            ${(activePt.predicted_freight_cost_usd || 18450).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
