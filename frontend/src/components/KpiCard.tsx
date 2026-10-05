import React, { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: ReactNode;
  variant?: 'default' | 'critical' | 'high' | 'medium' | 'low';
  unit?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  variant = 'default',
  unit
}) => {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {icon ? (
          <div className="kpi-icon-wrap">{icon}</div>
        ) : variant !== 'default' ? (
          <span className={`risk-badge ${variant.toUpperCase()}`} style={{ height: '18px', padding: '0 5px', fontSize: '9px' }}>
            {variant}
          </span>
        ) : null}
      </div>
      <div>
        <div className="kpi-value mono" style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span>{value}</span>
          {unit && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>{unit}</span>}
        </div>
        {subtext && <div className="kpi-subtext mono">{subtext}</div>}
      </div>
    </div>
  );
};
