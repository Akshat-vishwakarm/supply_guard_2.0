import React from 'react';
import { Calendar, ArrowDown } from 'lucide-react';

interface FutureMilestone {
  milestone: string;
  day_offset: number;
  date: string;
  location: string;
  weather: string;
  weather_emoji?: string;
  weather_risk: number;
  disruption_probability?: number;
  disruption_probability_percent: number;
  predicted_delay_days: number;
  predicted_freight_cost_usd?: number;
  supply_guard_score: number;
  risk_level: string;
}

interface FutureRiskTimelineFlowProps {
  timeline?: FutureMilestone[];
}

export const FutureRiskTimelineFlow: React.FC<FutureRiskTimelineFlowProps> = ({
  timeline = []
}) => {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.65rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={14} color="#FFFFFF" />
            <h3 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF', margin: 0, letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              FUTURE RISK TIMELINE // WAYPOINT EVALUATION
            </h3>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            Waypoint risk predictions using weather model forecasts and ML inference along the ocean corridor
          </p>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          weather_final.pkl + LightGBM
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {timeline.map((point, idx) => (
          <React.Fragment key={idx}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.75rem 1rem',
                display: 'grid',
                gridTemplateColumns: '120px 160px 1fr 120px 110px 100px',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 500, color: '#FFFFFF' }}>{point.milestone}</div>
                <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{point.date}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{point.location}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Waypoint node</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#FFFFFF' }}>{point.weather}</span>
                <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>({point.weather_risk}/100)</span>
              </div>

              <div>
                <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block' }}>DISRUPTION</span>
                <span className="mono" style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 500 }}>
                  {point.disruption_probability_percent.toFixed(1)}%
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block' }}>PRED. DELAY</span>
                <span className="mono" style={{ fontSize: '0.78rem', color: '#FFFFFF', fontWeight: 500 }}>
                  +{point.predicted_delay_days.toFixed(1)}d
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className={`risk-badge ${point.risk_level.toUpperCase()}`}>
                  {point.risk_level}
                </span>
              </div>
            </div>

            {idx < timeline.length - 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                <ArrowDown size={11} color="rgba(255, 255, 255, 0.2)" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
