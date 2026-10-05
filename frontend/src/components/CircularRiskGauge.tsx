import React from 'react';

interface CircularRiskGaugeProps {
  score: number;
  label?: string;
  sublabel?: string;
  level?: string;
  size?: number;
  unit?: string;
  isMain?: boolean;
}

export const CircularRiskGauge: React.FC<CircularRiskGaugeProps> = ({
  score,
  label = 'SUPPLY GUARD SCORE',
  sublabel = 'AI Model Prediction',
  level,
  size = 240,
  unit = '',
  isMain = false
}) => {
  const clampedScore = Math.max(0, Math.min(100, score || 0));

  // Restrained status mapping
  const getLevelInfo = (val: number) => {
    if (val >= 70) return { text: 'CRITICAL', color: '#EF4444', badgeBg: 'rgba(239, 68, 68, 0.12)' };
    if (val >= 50) return { text: 'HIGH', color: '#F97316', badgeBg: 'rgba(249, 115, 22, 0.12)' };
    if (val >= 30) return { text: 'MEDIUM', color: '#F59E0B', badgeBg: 'rgba(245, 158, 11, 0.12)' };
    return { text: 'LOW', color: '#10B981', badgeBg: 'rgba(16, 185, 129, 0.12)' };
  };

  const status = getLevelInfo(clampedScore);
  const displayLevel = level || status.text;

  // Arc math: 240 degree arc from -210 deg to 30 deg
  const startAngle = -210;
  const totalAngle = 240;
  const radius = isMain ? size * 0.38 : size * 0.36;
  const strokeWidth = isMain ? 4 : 3;
  const center = size / 2;

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, r: number, start: number, end: number) => {
    const startPt = polarToCartesian(x, y, r, end);
    const endPt = polarToCartesian(x, y, r, start);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return ['M', startPt.x, startPt.y, 'A', r, r, 0, largeArcFlag, 0, endPt.x, endPt.y].join(' ');
  };

  const backgroundArc = describeArc(center, center, radius, startAngle, startAngle + totalAngle);
  const currentAngle = startAngle + (clampedScore / 100) * totalAngle;
  const valueArc = describeArc(center, center, radius, startAngle, Math.max(startAngle + 0.1, currentAngle));

  const tipPt = polarToCartesian(center, center, radius, currentAngle);

  // Interval ticks
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: size,
        margin: '0 auto'
      }}
    >
      <svg width={size} height={size * 0.86} viewBox={`0 0 ${size} ${size * 0.86}`}>
        {/* Subtle background guide ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + 12}
          fill="none"
          stroke="rgba(255, 255, 255, 0.025)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {/* Base dark track */}
        <path
          d={backgroundArc}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Active stark arc */}
        <path
          d={valueArc}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Indicator tip dot */}
        <circle
          cx={tipPt.x}
          cy={tipPt.y}
          r={strokeWidth * 0.9}
          fill="#FFFFFF"
          filter="drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))"
        />

        {/* Tick marks */}
        {ticks.map((t) => {
          const deg = startAngle + (t / 100) * totalAngle;
          const pInner = polarToCartesian(center, center, radius - 8, deg);
          const pOuter = polarToCartesian(center, center, radius - 3, deg);
          const pLabel = polarToCartesian(center, center, radius - 16, deg);
          return (
            <g key={t}>
              <line
                x1={pInner.x}
                y1={pInner.y}
                x2={pOuter.x}
                y2={pOuter.y}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="1"
              />
              <text
                x={pLabel.x}
                y={pLabel.y}
                fill="rgba(255, 255, 255, 0.28)"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Center Readout */}
        <text
          x={center}
          y={center - (isMain ? 8 : 4)}
          fill="#FFFFFF"
          fontSize={isMain ? "42" : "32"}
          fontFamily="Inter, sans-serif"
          fontWeight="300"
          letterSpacing="-0.04em"
          textAnchor="middle"
          dominantBaseline="central"
        >
          {clampedScore.toFixed(1)}
        </text>

        <text
          x={center}
          y={center + (isMain ? 24 : 18)}
          fill="rgba(255, 255, 255, 0.35)"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          textAnchor="middle"
        >
          {unit || '/ 100 INDEX'}
        </text>
      </svg>

      {/* Meta Label & Status Badge */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-0.5rem', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              background: status.badgeBg,
              color: status.color,
              border: `1px solid ${status.color}35`,
              letterSpacing: '0.08em',
              fontWeight: 600
            }}
          >
            {displayLevel}
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--text-muted)'
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
