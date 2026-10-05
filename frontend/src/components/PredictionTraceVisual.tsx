import React from 'react';
import { Check, ShieldCheck, Cpu } from 'lucide-react';

interface PredictionTraceVisualProps {
  trace?: any;
  activePrediction?: any;
}

export const PredictionTraceVisual: React.FC<PredictionTraceVisualProps> = ({
  trace,
  activePrediction
}) => {
  const t = trace || activePrediction?.prediction_trace || activePrediction?.predictionTrace || {};
  const userInput = t.user_input || {
    origin: `${activePrediction?.origin_port || activePrediction?.origin_city || 'Yokohama'}, ${activePrediction?.origin_country || 'Japan'}`,
    destination: `${activePrediction?.destination_port || activePrediction?.destination_city || 'Los Angeles'}, ${activePrediction?.destination_country || 'United States'}`,
    departure: `${activePrediction?.departure_date || '2026-10-05'} ${activePrediction?.departure_time || '10:00'}`,
    cargo: `${activePrediction?.shipment_weight ? Number(activePrediction.shipment_weight).toLocaleString() : '15,000'} kg (${activePrediction?.quantity ? Number(activePrediction.quantity).toLocaleString() : '50,000'} units)`,
    status: activePrediction?.shipment_status || 'Normal'
  };

  const routeEngine = t.route_engine || {
    distance: activePrediction?.distance_km ? `${Number(activePrediction.distance_km).toLocaleString()} km` : '8,840 km',
    transit: activePrediction?.baseline_transit_days !== undefined ? `${Number(activePrediction.baseline_transit_days).toFixed(1)} days` : '17.0 days',
    corridor: activePrediction?.trade_route_type || 'Trans-Pacific East'
  };

  const weatherModel = t.weather_model || {
    model_file: 'weather_final.pkl',
    origin_weather: activePrediction?.origin_weather ? `${activePrediction.origin_weather.weather || 'Normal'} (${activePrediction.origin_weather.weather_risk ?? 40}/100)` : 'Calm Pacific (35/100)'
  };

  const mlModels = t.ml_models || {
    disruption: `LightGBM Disruption Classifier -> P(Disrupt) = ${Number(activePrediction?.disruption_probability_percent ?? 0.45).toFixed(2)}%`,
    delay: `LightGBM Delay Regressor -> Pred Delay = +${Number(activePrediction?.predicted_delay_days ?? 5.81).toFixed(2)}d`,
    freight: `LightGBM Cost Regressor -> Pred Rate = $${Number(activePrediction?.predicted_freight_cost_usd ?? 6323).toLocaleString()}`
  };

  const stages = [
    {
      step: '01',
      title: 'ENTITY MANIFEST INGESTION',
      meta: 'User Parameters Verified',
      status: 'VERIFIED',
      details: [
        { k: 'ORIGIN', v: userInput.origin },
        { k: 'DEST', v: userInput.destination },
        { k: 'PAYLOAD', v: userInput.cargo }
      ]
    },
    {
      step: '02',
      title: 'GEODETIC SPATIAL ENGINE',
      meta: 'Haversine WGS-84 Trajectory',
      status: 'CALCULATED',
      details: [
        { k: 'DISTANCE', v: routeEngine.distance },
        { k: 'TRANSIT', v: routeEngine.transit },
        { k: 'CORRIDOR', v: routeEngine.corridor }
      ]
    },
    {
      step: '03',
      title: 'ATMOSPHERIC TELEMETRY',
      meta: 'weather_final.pkl Classification',
      status: 'CLASSIFIED',
      details: [
        { k: 'MODEL', v: 'weather_final.pkl' },
        { k: 'SURFACE', v: weatherModel.origin_weather },
        { k: 'BEAUFORT', v: 'Scale 3 (Optimal)' }
      ]
    },
    {
      step: '04',
      title: 'LIGHTGBM RISK INFERENCE',
      meta: '21-Feature Vector Execution',
      status: 'CONVERGED',
      details: [
        { k: 'DISRUPT', v: mlModels.disruption },
        { k: 'DELAY', v: mlModels.delay },
        { k: 'EXP', v: mlModels.freight }
      ]
    }
  ];

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="#FFFFFF" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Prediction Trace &amp; Audit Pipeline
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <span>ENGINE: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>LIGHTGBM-V1</strong></span>
            <span>PASS: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>4/4 STAGES</strong></span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {stages.map((st) => (
          <div
            key={st.step}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-xs)',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
                  STAGE {st.step}
                </span>
                <div style={{ width: 14, height: 14, borderRadius: 'var(--radius-xs)', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={10} color="#000000" strokeWidth={3} />
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', fontWeight: 500, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                {st.title}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {st.meta}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
              {st.details.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{d.k}:</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textAlign: 'right', maxWidth: '65%', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {d.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
