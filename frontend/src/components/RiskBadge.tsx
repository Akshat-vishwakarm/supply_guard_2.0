import React from 'react';
import { RiskLevel } from '../types/supplyGuard';

interface RiskBadgeProps {
  level: RiskLevel | string;
  showDot?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, showDot = true }) => {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const getDotColor = () => {
    switch (normalizedLevel) {
      case 'CRITICAL':
        return '#EF4444';
      case 'HIGH':
        return '#F97316';
      case 'MEDIUM':
        return '#F59E0B';
      default:
        return '#10B981';
    }
  };

  return (
    <span className={`risk-badge ${normalizedLevel}`}>
      {showDot && (
        <span
          style={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: getDotColor(),
            display: 'inline-block'
          }}
        />
      )}
      <span>{normalizedLevel}</span>
    </span>
  );
};
