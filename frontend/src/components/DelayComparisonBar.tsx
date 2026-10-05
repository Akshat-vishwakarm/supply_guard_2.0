import React from 'react';
import { Clock } from 'lucide-react';

interface DelayComparisonBarProps {
  baselineDays: number;
  predictedDelayDays: number;
  arrivalDateStr?: string;
  arrivalLocalFormatted?: string;
  currency?: string;
}

export const DelayComparisonBar: React.FC<DelayComparisonBarProps> = ({
  baselineDays = 17,
  predictedDelayDays = 0,
  arrivalDateStr,
  arrivalLocalFormatted
}) => {
  const totalDays = Number((baselineDays + predictedDelayDays).toFixed(1));
  const maxScale = Math.max(30, totalDays * 1.15);

  const baselinePct = Math.min(100, (baselineDays / maxScale) * 100);
  const delayPct = Math.min(100 - baselinePct, (predictedDelayDays / maxScale) * 100);

  const isCritical = predictedDelayDays >= 5;
  const isModerate = predictedDelayDays > 1.5;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            TRANSIT DURATION &amp; PREDICTED DELAY
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 300, color: isCritical ? '#EF4444' : isModerate ? '#F59E0B' : '#FFFFFF', fontFamily: 'var(--font-sans)', letterSpacing: '-0.03em' }}>
              +{predictedDelayDays.toFixed(1)}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ADDITIONAL DAYS
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>TOTAL DURATION</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 400, color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>
            {totalDays} <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>days</span>
          </div>
        </div>
      </div>

      {/* Razor-thin Segmented Progress Track */}
      <div style={{ position: 'relative', margin: '0.85rem 0 0.5rem 0' }}>
        <div
          style={{
            height: '18px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 'var(--radius-xs)',
            overflow: 'hidden',
            display: 'flex',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Baseline Transit Segment */}
          <div
            style={{
              width: `${baselinePct}%`,
              background: 'rgba(255, 255, 255, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              padding: '0 0.5rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              transition: 'width 0.4s ease'
            }}
            title={`Baseline: ${baselineDays} days`}
          >
            BASE {baselineDays}d
          </div>

          {/* Predicted Delay Segment */}
          {predictedDelayDays > 0 && (
            <div
              style={{
                width: `${delayPct}%`,
                background: isCritical ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255, 255, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                padding: '0 0.35rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                transition: 'width 0.4s ease',
                borderLeft: '1px solid rgba(0, 0, 0, 0.5)'
              }}
              title={`Delay: +${predictedDelayDays.toFixed(1)} days`}
            >
              +{predictedDelayDays.toFixed(1)}d
            </div>
          )}
        </div>
      </div>

      {/* Arrival Telemetry Footnote */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Clock size={12} />
          <span>ESTIMATED ARRIVAL:</span>
          <span style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{arrivalDateStr || 'TBD'}</span>
        </div>
        {arrivalLocalFormatted && (
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
            {arrivalLocalFormatted}
          </span>
        )}
      </div>
    </div>
  );
};
