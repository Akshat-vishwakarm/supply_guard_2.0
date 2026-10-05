import React from 'react';
import { Cloud, ArrowRight } from 'lucide-react';

interface WeatherIntelVisualProps {
  originWeather?: {
    city?: string;
    country?: string;
    weather?: string;
    predicted_weather?: string;
    prediction?: string;
    weather_emoji?: string;
    weather_risk?: number;
    weather_disruption_score?: number;
    confidence_percent?: number;
    confidence?: number;
    available?: boolean;
    provenance?: string;
  };
  destWeather?: {
    city?: string;
    country?: string;
    weather?: string;
    predicted_weather?: string;
    prediction?: string;
    weather_emoji?: string;
    weather_risk?: number;
    weather_disruption_score?: number;
    confidence_percent?: number;
    confidence?: number;
    available?: boolean;
    message?: string;
    provenance?: string;
  };
  departureDate?: string;
  arrivalDate?: string;
  originTz?: string;
  destTz?: string;
  baselineDisruptionProb?: number;
}

export const WeatherIntelVisual: React.FC<WeatherIntelVisualProps> = ({
  originWeather,
  destWeather,
  departureDate,
  arrivalDate,
  originTz,
  destTz
}) => {
  const originCity = originWeather?.city || '—';
  const originCountry = originWeather?.country || '—';
  const originCondition = originWeather?.weather || originWeather?.predicted_weather || originWeather?.prediction || 'Nominal';
  const originRisk = Number(originWeather?.weather_risk ?? originWeather?.weather_disruption_score ?? 0);
  const originConf = Math.round(Number(originWeather?.confidence_percent ?? (originWeather?.confidence ? originWeather.confidence * 100 : 0)));

  const destCity = destWeather?.city || '—';
  const destCountry = destWeather?.country || '—';
  const destCondition = destWeather?.weather || destWeather?.predicted_weather || destWeather?.prediction || 'Nominal';
  const destRisk = Number(destWeather?.weather_risk ?? destWeather?.weather_disruption_score ?? 0);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cloud size={14} color="#FFFFFF" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            ATMOSPHERIC TELEMETRY // ORIGIN &amp; DESTINATION
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          weather_final.pkl
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto minmax(240px, 1fr)', gap: '1rem', alignItems: 'center' }}>
        {/* Origin Weather */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 'var(--radius-xs)',
            padding: '1rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                DEPARTURE NODE
              </span>
              <div style={{ fontWeight: 500, fontSize: '0.92rem', color: '#FFFFFF', marginTop: '2px' }}>
                {originCity}, {originCountry}
              </div>
              <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {departureDate || '—'} {originTz ? `• ${originTz}` : ''}
              </div>
            </div>

            <span className={`risk-badge ${originRisk >= 60 ? 'CRITICAL' : originRisk >= 35 ? 'MEDIUM' : 'LOW'}`}>
              {originRisk >= 60 ? 'ELEVATED' : originRisk >= 35 ? 'MODERATE' : 'OPTIMAL'}
            </span>
          </div>

          <div style={{ margin: '0.75rem 0' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Surface Condition</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 400, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              {originCondition}
            </div>
            {originConf > 0 && (
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                Model Confidence: {originConf}%
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Weather Threat:</span>
              <span style={{ color: '#FFFFFF' }}>{originRisk} / 100</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, originRisk)}%`, height: '100%', background: originRisk >= 60 ? '#EF4444' : '#FFFFFF' }} />
            </div>
          </div>
        </div>

        {/* Mid-Transit Connector */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowRight size={13} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: '0.60rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
            CORRIDOR
          </span>
        </div>

        {/* Destination Weather */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 'var(--radius-xs)',
            padding: '1rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                ARRIVAL NODE
              </span>
              <div style={{ fontWeight: 500, fontSize: '0.92rem', color: '#FFFFFF', marginTop: '2px' }}>
                {destCity}, {destCountry}
              </div>
              <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {arrivalDate || 'Calculated'} {destTz ? `• ${destTz}` : ''}
              </div>
            </div>

            <span className={`risk-badge ${destRisk >= 60 ? 'CRITICAL' : destRisk >= 35 ? 'MEDIUM' : 'LOW'}`}>
              {destRisk >= 60 ? 'ELEVATED' : destRisk >= 35 ? 'MODERATE' : 'OPTIMAL'}
            </span>
          </div>

          <div style={{ margin: '0.75rem 0' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Surface Condition</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 400, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              {destCondition}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              Arrival Window Projection
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Weather Threat:</span>
              <span style={{ color: '#FFFFFF' }}>{destRisk} / 100</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, destRisk)}%`, height: '100%', background: destRisk >= 60 ? '#EF4444' : '#FFFFFF' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
