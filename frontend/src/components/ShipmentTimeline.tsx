import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';

interface ShipmentTimelineProps {
  originPort: string;
  originCity: string;
  originCountry: string;
  destPort: string;
  destCity: string;
  destCountry: string;
  departureDate: string;
  departureTime: string;
  originTzAbbr: string;
  arrivalDate: string;
  arrivalTime: string;
  destTzAbbr: string;
  baselineDays: number;
  predictedDelayDays: number;
  distanceKm?: number;
  routeType?: string;
  originWeather?: string;
  originWeatherEmoji?: string;
  originWeatherRisk?: number;
  destWeather?: string;
  destWeatherEmoji?: string;
  destWeatherRisk?: number;
}

export const ShipmentTimeline: React.FC<ShipmentTimelineProps> = ({
  originPort,
  originCity,
  originCountry,
  destPort,
  destCity,
  destCountry,
  departureDate,
  departureTime,
  originTzAbbr,
  arrivalDate,
  arrivalTime,
  destTzAbbr,
  baselineDays = 0,
  predictedDelayDays = 0,
  distanceKm,
  routeType,
  originWeather = 'Nominal',
  destWeather = 'Nominal'
}) => {
  const totalDays = (baselineDays + predictedDelayDays).toFixed(1);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={14} color="#FFFFFF" />
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            ROUTE TIMELINE &amp; ENDPOINT CONDITIONS
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          <span>CORRIDOR: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>{routeType || 'Maritime Corridor'}</strong></span>
          <span>TRANSIT: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>{totalDays} DAYS</strong></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) auto minmax(200px, 1fr)', gap: '1rem', alignItems: 'center' }}>
        {/* Origin */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 'var(--radius-xs)',
            padding: '1rem'
          }}
        >
          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            DEPARTURE
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
            {originPort}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {originCity}, {originCountry}
          </div>
          <div className="mono" style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            {departureDate} • {departureTime} {originTzAbbr}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Surface: {originWeather}
          </div>
        </div>

        {/* Center Vector */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 0.5rem' }}>
          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {distanceKm ? `${distanceKm.toLocaleString()} KM` : 'DIRECT'}
          </div>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowRight size={14} color="#FFFFFF" />
          </div>
          <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: '#FFFFFF', marginTop: '4px' }}>
            +{predictedDelayDays.toFixed(1)}d Delay
          </div>
        </div>

        {/* Destination */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 'var(--radius-xs)',
            padding: '1rem'
          }}
        >
          <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            ESTIMATED ARRIVAL
          </span>
          <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px' }}>
            {destPort}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {destCity}, {destCountry}
          </div>
          <div className="mono" style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
            {arrivalDate} • {arrivalTime} {destTzAbbr}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Surface: {destWeather}
          </div>
        </div>
      </div>
    </div>
  );
};
