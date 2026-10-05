import React from 'react';
import { ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';

interface DeltaBadgeProps {
  delta: number;
  unit?: string;
  prefix?: string;
  decimals?: number;
  invertColor?: boolean; // If true, positive is bad (e.g. risk increase = red)
  label?: string;
}

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({
  delta,
  unit = '',
  prefix = '',
  decimals = 1,
  invertColor = true,
  label
}) => {
  const isZero = Math.abs(delta) < 0.01;
  const isPositive = delta > 0;

  let color = '#888888';
  let bg = 'rgba(255, 255, 255, 0.03)';
  let border = 'rgba(255, 255, 255, 0.08)';
  let Icon = ArrowRight;

  if (!isZero) {
    if (invertColor) {
      if (isPositive) {
        color = '#f87171';
        bg = 'rgba(239, 68, 68, 0.08)';
        border = 'rgba(239, 68, 68, 0.25)';
        Icon = ArrowUp;
      } else {
        color = '#4ade80';
        bg = 'rgba(34, 197, 94, 0.08)';
        border = 'rgba(34, 197, 94, 0.25)';
        Icon = ArrowDown;
      }
    } else {
      if (isPositive) {
        color = '#4ade80';
        bg = 'rgba(34, 197, 94, 0.08)';
        border = 'rgba(34, 197, 94, 0.25)';
        Icon = ArrowUp;
      } else {
        color = '#f87171';
        bg = 'rgba(239, 68, 68, 0.08)';
        border = 'rgba(239, 68, 68, 0.25)';
        Icon = ArrowDown;
      }
    }
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.15rem 0.45rem',
        borderRadius: '2px',
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: '0.7rem',
        fontWeight: 600,
        fontFamily: 'JetBrains Mono, monospace',
        letterSpacing: '0.02em'
      }}
    >
      <Icon size={11} strokeWidth={2} />
      <span>
        {isPositive ? '+' : ''}
        {prefix}
        {delta.toFixed(decimals)}
        {unit}
      </span>
      {label && <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', marginLeft: '0.2rem' }}>{label}</span>}
    </span>
  );
};
