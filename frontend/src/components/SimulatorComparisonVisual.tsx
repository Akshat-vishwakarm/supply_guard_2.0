import React from 'react';
import { CircularRiskGauge } from './CircularRiskGauge';
import { ArrowRight, Clock, DollarSign, TrendingUp } from 'lucide-react';

interface SimulatorComparisonVisualProps {
  baseline: {
    supply_guard_score?: number;
    disruption_probability_percent?: number;
    predicted_delay_days?: number;
    predicted_freight_cost_usd?: number;
    display_freight_cost?: string;
    estimated_arrival?: string;
    risk_level?: string;
    timeline?: any;
    estimated_volume_at_risk_tonnes?: number;
    estimated_freight_cost_exposure_usd?: number;
    ripple_risk_score?: number | null;
  };
  scenario: {
    supply_guard_score?: number;
    disruption_probability_percent?: number;
    predicted_delay_days?: number;
    predicted_freight_cost_usd?: number;
    display_freight_cost?: string;
    estimated_arrival?: string;
    risk_level?: string;
    timeline?: any;
    estimated_volume_at_risk_tonnes?: number;
    estimated_freight_cost_exposure_usd?: number;
    ripple_risk_score?: number | null;
  };
  changes?: {
    supply_guard_score_change?: number;
    disruption_probability_change_pp?: number;
    predicted_delay_change_days?: number;
    predicted_freight_cost_change_usd?: number;
    volume_at_risk_delta_tonnes?: number;
    ripple_risk_change?: number | null;
  };
  baselineTransitDays?: number;
  displayCurrency?: string;
}

export const SimulatorComparisonVisual: React.FC<SimulatorComparisonVisualProps> = ({
  baseline,
  scenario,
  changes,
  baselineTransitDays = 17.0,
  displayCurrency = 'USD'
}) => {
  const baseScore = Number(baseline?.supply_guard_score ?? 0);
  const simScore = Number(scenario?.supply_guard_score ?? 0);
  const scoreDelta = changes?.supply_guard_score_change ?? (simScore - baseScore);

  const baseDisruption = Number(baseline?.disruption_probability_percent ?? 0);
  const simDisruption = Number(scenario?.disruption_probability_percent ?? 0);
  const disruptionDelta = changes?.disruption_probability_change_pp ?? (simDisruption - baseDisruption);

  const baseDelay = Number(baseline?.predicted_delay_days ?? 0);
  const simDelay = Number(scenario?.predicted_delay_days ?? 0);
  const delayDelta = changes?.predicted_delay_change_days ?? (simDelay - baseDelay);

  const baseFreight = Number(baseline?.predicted_freight_cost_usd ?? 0);
  const simFreight = Number(scenario?.predicted_freight_cost_usd ?? 0);
  const freightDelta = changes?.predicted_freight_cost_change_usd ?? (simFreight - baseFreight);

  const baseArrival = baseline?.estimated_arrival || baseline?.timeline?.arrival_local?.formatted || 'Calculated';
  const simArrival = scenario?.estimated_arrival || scenario?.timeline?.arrival_local?.formatted || 'Calculated';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Delta Bridge Summary Strip */}
      <div
        className="card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          padding: '0.85rem 1.15rem'
        }}
      >
        {/* Score Shift */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            GUARD SCORE SHIFT
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {baseScore.toFixed(1)}
            </span>
            <ArrowRight size={12} color="var(--text-muted)" />
            <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>
              {simScore.toFixed(1)}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
                background: scoreDelta > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                color: scoreDelta > 0 ? '#EF4444' : '#FFFFFF'
              }}
            >
              {scoreDelta > 0 ? `+${scoreDelta.toFixed(1)}` : scoreDelta.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Disruption Prob Shift */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            DISRUPTION PROBABILITY
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {baseDisruption.toFixed(1)}%
            </span>
            <ArrowRight size={12} color="var(--text-muted)" />
            <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>
              {simDisruption.toFixed(1)}%
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
                background: disruptionDelta > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                color: disruptionDelta > 0 ? '#EF4444' : '#FFFFFF'
              }}
            >
              {disruptionDelta > 0 ? `+${disruptionDelta.toFixed(1)}%` : `${disruptionDelta.toFixed(1)}%`}
            </span>
          </div>
        </div>

        {/* Delay Shift */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            PREDICTED DELAY
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              +{baseDelay.toFixed(1)}d
            </span>
            <ArrowRight size={12} color="var(--text-muted)" />
            <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>
              +{simDelay.toFixed(1)}d
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
                background: delayDelta > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                color: delayDelta > 0 ? '#EF4444' : '#FFFFFF'
              }}
            >
              {delayDelta > 0 ? `+${delayDelta.toFixed(1)}d` : `${delayDelta.toFixed(1)}d`}
            </span>
          </div>
        </div>

        {/* Freight Rate Shift */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            PREDICTED FREIGHT
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ${baseFreight.toLocaleString()}
            </span>
            <ArrowRight size={12} color="var(--text-muted)" />
            <span className="mono" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>
              ${simFreight.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Scenario Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        {/* Baseline Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.65rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                SCENARIO A // BASELINE
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
                Unperturbed Operations
              </div>
            </div>
            <span className={`risk-badge ${baseline?.risk_level || 'LOW'}`}>
              {baseline?.risk_level || 'LOW'}
            </span>
          </div>

          <CircularRiskGauge score={baseScore} label="Baseline Risk Score" size={190} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>DISRUPTION PROB</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#FFFFFF' }}>
                {baseDisruption.toFixed(2)}%
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>PREDICTED DELAY</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#FFFFFF' }}>
                +{baseDelay.toFixed(1)} days
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>FREIGHT ESTIMATE</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#FFFFFF' }}>
                ${baseFreight.toLocaleString()}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>EST. ARRIVAL</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {baseArrival}
              </div>
            </div>
          </div>
        </div>

        {/* Simulated Shock Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.65rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                SCENARIO B // STRESSED INFERENCE
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
                Perturbed Shock Conditions
              </div>
            </div>
            <span className={`risk-badge ${scenario?.risk_level || 'HIGH'}`}>
              {scenario?.risk_level || 'HIGH'}
            </span>
          </div>

          <CircularRiskGauge score={simScore} label="Simulated Risk Score" size={190} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>DISRUPTION PROB</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#FFFFFF' }}>
                {simDisruption.toFixed(2)}%
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>PREDICTED DELAY</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#FFFFFF' }}>
                +{simDelay.toFixed(1)} days
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>FREIGHT ESTIMATE</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#FFFFFF' }}>
                ${simFreight.toLocaleString()}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>EST. ARRIVAL</span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {simArrival}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
