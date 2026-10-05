import React from 'react';
import { ArrowDown, Navigation } from 'lucide-react';

interface RouteTransitFlowProps {
  originPort: string;
  originCity?: string;
  originCountry?: string;
  destinationPort: string;
  destinationCity?: string;
  destinationCountry?: string;
  distanceKm: number;
  transitDays: number;
}

export const RouteTransitFlow: React.FC<RouteTransitFlowProps> = ({
  originPort,
  originCity,
  originCountry,
  destinationPort,
  destinationCity,
  destinationCountry,
  distanceKm,
  transitDays
}) => {
  return (
    <div className="card" style={{ margin: '1rem 0' }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}>
        <Navigation size={13} color="#FFFFFF" />
        <span>ROUTE CALCULATION &amp; OCEAN TRANSIT FLOW</span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.45rem',
          maxWidth: '460px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        {/* Origin Port */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.75rem 1rem'
          }}
        >
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            ORIGIN PORT
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 500, color: '#ffffff', marginTop: '0.15rem' }}>
            {originPort}
          </div>
          {(originCity || originCountry) && (
            <div style={{ fontSize: '0.70rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {originCity}{originCity && originCountry ? ', ' : ''}{originCountry}
            </div>
          )}
        </div>

        {/* Down Connector */}
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowDown size={14} />
        </div>

        {/* Distance Pod */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.55rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>GEODESIC DISTANCE</span>
          <span className="mono" style={{ fontSize: '0.90rem', color: '#FFFFFF', fontWeight: 500 }}>
            {distanceKm ? distanceKm.toLocaleString() : '—'} km
          </span>
        </div>

        {/* Down Connector */}
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowDown size={14} />
        </div>

        {/* Transit Duration Pod */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.55rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>ESTIMATED DURATION</span>
          <span className="mono" style={{ fontSize: '0.90rem', color: '#FFFFFF', fontWeight: 500 }}>
            {transitDays} days
          </span>
        </div>

        {/* Down Connector */}
        <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowDown size={14} />
        </div>

        {/* Destination Port */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-xs)',
            padding: '0.75rem 1rem'
          }}
        >
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            DESTINATION PORT
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 500, color: '#ffffff', marginTop: '0.15rem' }}>
            {destinationPort}
          </div>
          {(destinationCity || destinationCountry) && (
            <div style={{ fontSize: '0.70rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
              {destinationCity}{destinationCity && destinationCountry ? ', ' : ''}{destinationCountry}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
