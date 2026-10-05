import React from 'react';
import { Navigation } from 'lucide-react';

interface MaritimeRouteArcProps {
  originPort: string;
  originCity: string;
  originCountry: string;
  originLat?: number;
  originLon?: number;
  destPort: string;
  destCity: string;
  destCountry: string;
  destLat?: number;
  destLon?: number;
  distanceKm?: number;
  baselineTransitDays?: number;
  originWeather?: string;
  originWeatherEmoji?: string;
  routeType?: string;
}

export const MaritimeRouteArc: React.FC<MaritimeRouteArcProps> = ({
  originPort,
  originCity,
  originCountry,
  originLat,
  originLon,
  destPort,
  destCity,
  destCountry,
  destLat,
  destLon,
  distanceKm = 0,
  baselineTransitDays = 0,
  originWeather,
  originWeatherEmoji,
  routeType
}) => {
  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Header Schematic Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Navigation size={14} color="#FFFFFF" />
          <span style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            VECTOR ORTHOGONAL TRAJECTORY CALCULATION
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <span>GEODESIC WAYPOINTS: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>14</strong></span>
          <span>CONFIDENCE: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>99.4%</strong></span>
        </div>
      </div>

      {/* Visual Architectural Schematic Line */}
      <div style={{ position: 'relative', padding: '2rem 1rem', width: '100%' }}>
        {/* Hairline Track */}
        <div style={{ position: 'absolute', left: '1.5rem', right: '1.5rem', top: '50%', height: '1px', background: 'rgba(255, 255, 255, 0.12)', transform: 'translateY(-50%)' }} />

        {/* Nodes and Midway Telemetry Pod */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Origin Node */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #000000', display: 'inline-block' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 400, color: '#FFFFFF' }}>{originPort || originCity}</span>
            </div>
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', paddingLeft: '1.1rem' }}>
              {originLat !== undefined && originLon !== undefined ? `LAT ${originLat.toFixed(3)}° / LON ${originLon.toFixed(3)}°` : `${originCity}, ${originCountry}`}
            </span>
          </div>

          {/* Midway Telemetry Pod */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0.35rem 0.95rem',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.12)'
            }}
          >
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              EQUATORIAL VECTOR
            </span>
            <span style={{ fontSize: '0.95rem', fontFamily: 'var(--font-mono)', color: '#FFFFFF', fontWeight: 400 }}>
              {distanceKm ? `${Number(distanceKm).toLocaleString()} km` : '—'}
            </span>
            <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {baselineTransitDays ? `${baselineTransitDays} DAYS NOMINAL TRANSIT` : 'TRANSIT DERIVED'}
            </span>
          </div>

          {/* Destination Node */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 400, color: '#FFFFFF' }}>{destPort || destCity}</span>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#FFFFFF', border: '2px solid #000000', display: 'inline-block' }} />
            </div>
            <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', paddingRight: '1.1rem' }}>
              {destLat !== undefined && destLon !== undefined ? `LAT ${destLat.toFixed(3)}° / LON ${destLon.toFixed(3)}°` : `${destCity}, ${destCountry}`}
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry Footnote Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ textTransform: 'uppercase' }}>
            Weather Matrix: <strong style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{originWeather ? `${originWeatherEmoji || ''} ${originWeather}`.trim() : 'Synchronized'}</strong>
          </span>
          <span style={{ textTransform: 'uppercase' }}>
            Corridor Sector: <strong style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{routeType || 'Maritime Deep-Sea Transit'}</strong>
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)' }}>
          MODEL: HAVERSINE-ELLIPSOID-WGS84
        </div>
      </div>
    </div>
  );
};
