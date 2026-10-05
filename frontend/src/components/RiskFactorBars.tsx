import React from 'react';
import { Sliders } from 'lucide-react';

interface RiskFactorBarsProps {
  factors: {
    port_congestion_index?: number;
    weather_disruption_score?: number;
    geopolitical_risk_score?: number;
    container_availability_index?: number;
    fuel_cost_index?: number;
    commodity_price_index?: number;
  };
}

export const RiskFactorBars: React.FC<RiskFactorBarsProps> = ({ factors }) => {
  const list = [
    {
      id: 'port_congestion',
      label: 'PORT CONGESTION INDEX',
      value: factors?.port_congestion_index ?? 50,
      invert: false,
      unit: '/ 100',
      source: 'weekly_route_operations.csv'
    },
    {
      id: 'weather',
      label: 'WEATHER THREAT SCORE',
      value: factors?.weather_disruption_score ?? 40,
      invert: false,
      unit: '/ 100',
      source: 'weather_final.pkl'
    },
    {
      id: 'geopolitical',
      label: 'GEOPOLITICAL FRICTION',
      value: factors?.geopolitical_risk_score ?? 50,
      invert: false,
      unit: '/ 100',
      source: 'geopolitical_events.csv'
    },
    {
      id: 'container',
      label: 'CONTAINER DEFICIT RATE',
      value: factors?.container_availability_index ? 100 - factors.container_availability_index : 50,
      invert: false,
      unit: '/ 100',
      source: 'weekly_route_operations.csv'
    },
    {
      id: 'fuel',
      label: 'BUNKER FUEL INDEX',
      value: factors?.fuel_cost_index ?? 60,
      invert: false,
      unit: 'pts',
      source: 'commodity_market.csv'
    },
    {
      id: 'commodity',
      label: 'COMMODITY VOLATILITY',
      value: factors?.commodity_price_index ?? 60,
      invert: false,
      unit: 'pts',
      source: 'commodity_market.csv'
    }
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={14} color="#FFFFFF" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            RISK FACTOR DECOMPOSITION // 21-FEATURE VECTOR
          </span>
        </div>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          LIGHTGBM INPUTS
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {list.map((item) => {
          const clampedVal = Math.min(100, Math.max(0, item.value));
          const isElevated = clampedVal >= 70;

          return (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-body)', letterSpacing: '0.04em' }}>
                  {item.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 500, color: isElevated ? '#EF4444' : '#FFFFFF' }}>
                    {clampedVal.toFixed(0)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {item.unit}
                  </span>
                </div>
              </div>

              {/* Minimal progress rail */}
              <div
                style={{
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '1px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${clampedVal}%`,
                    background: isElevated ? '#EF4444' : '#FFFFFF',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
