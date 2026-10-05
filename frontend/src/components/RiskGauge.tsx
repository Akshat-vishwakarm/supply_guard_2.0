import React from 'react';
import { RiskLevel } from '../types/supplyGuard';

interface RiskGaugeProps {
  score: number;
  level?: RiskLevel | string;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level = 'LOW', size = 200 }) => {
  const radius = 68;
  const strokeWidth = 5;
  const center = size / 2;
  const circumference = Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score || 0));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const normalizedLevel = String(level).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.65}`}>
        {/* Background track */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value track */}
        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        {/* Score in Center */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="1.85rem"
          fontWeight="300"
          fontFamily="Inter, sans-serif"
          letterSpacing="-0.03em"
        >
          {score.toFixed(1)}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="0.65rem"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="0.12em"
          style={{ textTransform: 'uppercase' }}
        >
          SUPPLY GUARD SCORE
        </text>
      </svg>
      <span className={`risk-badge ${normalizedLevel}`} style={{ marginTop: '-4px' }}>
        {normalizedLevel}
      </span>
    </div>
  );
};
