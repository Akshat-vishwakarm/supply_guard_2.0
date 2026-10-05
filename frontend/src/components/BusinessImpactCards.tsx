import React from 'react';
import { Package, Clock, DollarSign, ShieldAlert } from 'lucide-react';

interface BusinessImpactCardsProps {
  volumeAtRiskTonnes: number;
  delayExposureTonneDays: number;
  freightCostExposureUsd: number;
  shipmentValue?: number;
  shipmentValueAtRisk?: number;
  disruptionProbability?: number;
  currency?: string;
  totalWeightTonnes?: number;
  totalFreightCostUsd?: number;
}

export const BusinessImpactCards: React.FC<BusinessImpactCardsProps> = ({
  volumeAtRiskTonnes = 0,
  delayExposureTonneDays = 0,
  freightCostExposureUsd = 0,
  shipmentValue,
  shipmentValueAtRisk,
  disruptionProbability,
  currency = 'USD',
  totalWeightTonnes,
  totalFreightCostUsd
}) => {
  const formatNum = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 10_000) return `${(num / 1_000).toFixed(1)}k`;
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const computedValAtRisk = shipmentValueAtRisk !== undefined && shipmentValueAtRisk !== null
    ? shipmentValueAtRisk
    : shipmentValue && disruptionProbability !== undefined
    ? shipmentValue * disruptionProbability
    : undefined;

  const cards = [
    {
      id: 'vol',
      title: 'VOLUME AT RISK',
      value: `${formatNum(volumeAtRiskTonnes)}`,
      unit: 'tonnes',
      sub: totalWeightTonnes ? `Out of ${totalWeightTonnes.toLocaleString()} t total cargo` : 'Cargo tonnage weighted by disruption',
      icon: <Package size={14} />
    },
    {
      id: 'delay_exp',
      title: 'DELAY EXPOSURE',
      value: `${formatNum(delayExposureTonneDays)}`,
      unit: 'tonne-days',
      sub: 'Volume at risk × predicted transit delay',
      icon: <Clock size={14} />
    },
    {
      id: 'freight_exp',
      title: 'FREIGHT COST EXPOSURE',
      value: `$${formatNum(freightCostExposureUsd)}`,
      unit: 'USD',
      sub: totalFreightCostUsd ? `Base freight: $${totalFreightCostUsd.toLocaleString()}` : 'Disruption probability × predicted freight',
      icon: <DollarSign size={14} />
    },
    {
      id: 'shipment_val',
      title: 'COMMERCIAL VALUE AT RISK',
      value: computedValAtRisk !== undefined ? `$${formatNum(computedValAtRisk)}` : '$—',
      unit: currency,
      sub: shipmentValue ? `Total Cargo: $${shipmentValue.toLocaleString()} ${currency}` : 'Enter commercial value to calculate',
      icon: <ShieldAlert size={14} />
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
        <span style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          DERIVED COMMERCIAL BUSINESS EXPOSURE
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          STATISTICAL EXPOSURE (NOT REALIZED LOSS)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        {cards.map((c) => (
          <div key={c.id} className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">{c.title}</span>
              <div className="kpi-icon-wrap">{c.icon}</div>
            </div>
            <div>
              <div className="kpi-value mono" style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span>{c.value}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{c.unit}</span>
              </div>
              <div className="kpi-subtext mono">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
