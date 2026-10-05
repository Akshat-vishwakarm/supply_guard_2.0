import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Package,
  Clock,
  TrendingDown,
  Info,
  Database,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  PieChart as PieIcon,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Scale
} from 'lucide-react';
import { BusinessImpactData } from '../types/supplyGuard';
import { KpiCard } from '../components/KpiCard';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';

interface BusinessImpactViewProps {
  onSelectRoute: (routeId: string) => void;
  onLoadDemo: () => void;
  isLoaded: boolean;
  activePrediction?: any;
  onNavigate?: (page: any) => void;
}

export const BusinessImpactView: React.FC<BusinessImpactViewProps> = ({
  onSelectRoute,
  onLoadDemo,
  isLoaded,
  activePrediction,
  onNavigate
}) => {
  const [data, setData] = useState<BusinessImpactData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isLoaded) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getBusinessImpact()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching business impact:', err);
        setLoading(false);
      });
  }, [isLoaded]);

  // Clean empty state when neither dataset nor activePrediction exists
  if (!isLoaded && !activePrediction) {
    return (
      <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Exposure Ledger • Offline
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5', margin: 0 }}>
            Commercial Exposure &amp; Financial Impact
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
            Estimated financial and volume exposure weighted by predictive ML disruption probabilities
          </p>
        </div>

        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <DollarSign size={40} style={{ opacity: 0.25, color: '#f5f5f5', marginBottom: '1.25rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
            No Commercial Exposure Ledger Available
          </div>
          <div style={{ fontSize: '0.8rem', maxWidth: '440px', margin: '0.5rem auto 1.75rem auto', lineHeight: 1.5, color: 'var(--text-muted)' }}>
            Configure your active shipment or ingest the enterprise dataset to calculate statistical volume at risk, delay exposure, and freight contingencies.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {onNavigate && (
              <button className="btn btn-primary" onClick={() => onNavigate('overview')} style={{ padding: '0.6rem 1.4rem', fontSize: '0.75rem' }}>
                <span>Configure Shipment on Overview</span>
              </button>
            )}
            <button className="btn btn-secondary" onClick={onLoadDemo} style={{ padding: '0.6rem 1.4rem', fontSize: '0.75rem' }}>
              <Database size={13} style={{ marginRight: '0.4rem' }} /> Ingest Enterprise Demo Dataset
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Derive active shipment metrics
  const shipment = activePrediction?.shipment || activePrediction?.raw_shipment || {};
  const supplier = shipment.supplier_company || activePrediction?.supplier_company;
  const customer = shipment.customer_company || shipment.receiving_company || activePrediction?.customer_company || activePrediction?.receiving_company;
  const origin = activePrediction?.origin_port || shipment.origin_port || 'Origin';
  const destination = activePrediction?.destination_port || shipment.destination_port || 'Destination';

  // Weight / Trade Volume
  const rawWeight = Number(shipment.shipment_weight || activePrediction?.shipment_weight || 0);
  const weightUnit = shipment.weight_unit || activePrediction?.weight_unit || 'kg';
  const activeTradeVolumeTonnes = weightUnit === 'kg' ? rawWeight / 1000 : rawWeight;

  // Disruption probability
  const disruptionProb = Number(activePrediction?.disruption_probability_percent ?? (activePrediction?.disruption_probability ? activePrediction.disruption_probability * 100 : 0));
  const disruptionRatio = Math.max(0, Math.min(1, disruptionProb / 100));

  // 1. Trade Volume
  const tradeVolumeDisplay = activePrediction
    ? `${rawWeight > 0 ? rawWeight.toLocaleString() : (activeTradeVolumeTonnes * 1000).toLocaleString()} ${weightUnit}`
    : `${(data?.total_trade_volume_tonnes || 0).toLocaleString()} t`;

  // 2. Volume at Risk
  const volAtRiskTonnes = activePrediction
    ? Number(activePrediction?.business_impact?.volume_at_risk_tonnes ?? activePrediction?.business_impact?.estimated_volume_at_risk_tonnes ?? (activeTradeVolumeTonnes * disruptionRatio))
    : Number(data?.total_volume_at_risk_tonnes || 0);
  const volAtRiskDisplay = activePrediction
    ? `${weightUnit === 'kg' ? (volAtRiskTonnes * 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) : volAtRiskTonnes.toFixed(1)} ${weightUnit}`
    : `${volAtRiskTonnes.toLocaleString()} t`;

  // 3. Delay Exposure
  const predictedDelay = Number(activePrediction?.predicted_delay_days ?? 0);
  const delayExposure = activePrediction
    ? Number(activePrediction?.business_impact?.delay_exposure_tonne_days ?? (volAtRiskTonnes * predictedDelay))
    : Number(data?.total_delay_exposure_tonne_days || 0);
  const delayExposureDisplay = `${delayExposure.toLocaleString(undefined, { maximumFractionDigits: 1 })} t·d`;

  // 4. Freight Cost Exposure
  const freightCost = Number(activePrediction?.predicted_freight_cost_usd ?? 0);
  const freightCostExposure = activePrediction
    ? Number(activePrediction?.business_impact?.financial_exposure_usd ?? activePrediction?.business_impact?.estimated_freight_cost_exposure_usd ?? (freightCost * disruptionRatio))
    : Number(data?.total_freight_exposure_usd || 0);
  const freightCostExposureDisplay = `$${freightCostExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // 5. Shipment Value at Risk
  const shipmentValue = Number(shipment.commercial_value || shipment.shipment_value || activePrediction?.commercial_value || activePrediction?.shipment_value || 0);
  const currency = activePrediction?.currency || shipment.currency || 'USD';
  const shipmentValueAtRisk = activePrediction
    ? Number(activePrediction?.business_impact?.shipment_value_at_risk_usd ?? (shipmentValue * disruptionRatio))
    : (data ? data.total_freight_exposure_usd * 4.5 : shipmentValue * disruptionRatio);
  const shipmentValueAtRiskDisplay = `$${shipmentValueAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;

  // Minimalist monochrome radial donut chart
  const renderDonutChart = (
    title: string,
    percentAtRisk: number,
    exposedLabel: string,
    exposedVal: string,
    safeLabel: string,
    safeVal: string
  ) => {
    const radius = 64;
    const strokeWidth = 10;
    const circ = 2 * Math.PI * radius;
    const strokeDash = Math.min(circ, Math.max(0, (percentAtRisk / 100) * circ));

    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffffff' }} />
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {title}
            </span>
          </div>
          <span className="mono" style={{ fontSize: '0.68rem', color: '#f5f5f5', fontWeight: 600 }}>
            {percentAtRisk.toFixed(1)}% EXPOSED
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '0.5rem 0' }}>
          {/* Radial Arc SVG */}
          <div style={{ position: 'relative', width: 136, height: 136 }}>
            <svg width="136" height="136" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background hairline ring */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth={strokeWidth}
              />
              {/* Foreground stroke */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#ffffff"
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeDash} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#ffffff' }}>
                {percentAtRisk.toFixed(1)}%
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AT RISK
              </span>
            </div>
          </div>

          {/* Breakdown legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
            <div style={{ padding: '0.55rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 2, borderLeft: '2px solid #ffffff' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{exposedLabel}</div>
              <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f5f5f5', marginTop: '0.15rem' }}>{exposedVal}</div>
            </div>
            <div style={{ padding: '0.55rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 2, borderLeft: '2px solid rgba(255, 255, 255, 0.3)' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{safeLabel}</div>
              <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 600, color: '#a3a3a3', marginTop: '0.15rem' }}>{safeVal}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              ACTUARIAL EXPOSURE LEDGER
            </span>
            {supplier && customer && (
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                • {supplier} → {customer}
              </span>
            )}
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5' }}>
            Commercial Exposure &amp; Financial Impact
          </h1>
          <p className="page-subtitle" style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            5 key business metrics weighted by calibrated ML disruption probabilities and cargo volumes
          </p>
        </div>

        {onNavigate && activePrediction && (
          <button className="btn btn-secondary" onClick={() => onNavigate('risk')} style={{ padding: '0.55rem 1rem', fontSize: '0.75rem' }}>
            <span>Open Risk Command Center</span>
            <ArrowRight size={13} style={{ marginLeft: '0.35rem' }} />
          </button>
        )}
      </div>

      {/* 1. TOP 5 KPI CARDS */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          <KpiCard
            label="Trade Volume"
            value={tradeVolumeDisplay}
            subtext={activePrediction ? 'Total shipment cargo payload' : 'Portfolio cargo volume'}
            icon={<Package size={15} />}
          />
          <KpiCard
            label="Volume at Risk"
            value={volAtRiskDisplay}
            subtext={`${disruptionProb.toFixed(1)}% disruption weighted`}
            icon={<TrendingDown size={15} />}
          />
          <KpiCard
            label="Delay Exposure"
            value={delayExposureDisplay}
            subtext="Volume × predicted transit delay"
            icon={<Clock size={15} />}
          />
          <KpiCard
            label="Freight Cost Exposure"
            value={freightCostExposureDisplay}
            subtext={`Out of $${freightCost.toLocaleString()} predicted freight`}
            icon={<DollarSign size={15} />}
          />
          <KpiCard
            label="Shipment Value at Risk"
            value={shipmentValueAtRiskDisplay}
            subtext={`Out of $${shipmentValue.toLocaleString()} invoice value`}
            icon={<ShieldAlert size={15} />}
          />
        </div>
      </div>

      {/* 2. DONUT CHARTS (Volume at Risk vs Safe, Value at Risk vs Safe) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {renderDonutChart(
          'CARGO VOLUME AT RISK',
          disruptionProb,
          'Exposed Volume',
          volAtRiskDisplay,
          'Protected Volume',
          activePrediction
            ? `${weightUnit === 'kg' ? ((activeTradeVolumeTonnes - volAtRiskTonnes) * 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) : (activeTradeVolumeTonnes - volAtRiskTonnes).toFixed(1)} ${weightUnit}`
            : `${((data?.total_trade_volume_tonnes || 0) - volAtRiskTonnes).toLocaleString()} t`
        )}

        {renderDonutChart(
          'COMMERCIAL VALUE AT RISK',
          disruptionProb,
          'Value Exposed',
          `$${shipmentValueAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`,
          'Protected Value',
          `$${Math.max(0, shipmentValue - shipmentValueAtRisk).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`
        )}
      </div>

      {/* 3. PROGRESS BARS (Visual Exposure Distribution) */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffffff' }} />
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                NORMALIZED EXPOSURE RATIOS
              </div>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Calculated disruption distribution across commercial and transit dimensions
            </div>
          </div>
          <span className="mono" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
            ACTUARIAL WEIGHTING
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Progress Bar 1 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 500, color: '#e5e5e5' }}>Cargo Volume Exposure</span>
              <span className="mono" style={{ fontWeight: 600, color: '#ffffff' }}>{disruptionProb.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, disruptionProb)}%`,
                  height: '100%',
                  background: '#ffffff'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>0%</span>
              <span className="mono">{volAtRiskDisplay} exposed</span>
              <span>100%</span>
            </div>
          </div>

          {/* Progress Bar 2 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 500, color: '#e5e5e5' }}>Freight Contingency Risk</span>
              <span className="mono" style={{ fontWeight: 600, color: '#ffffff' }}>{disruptionProb.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, disruptionProb)}%`,
                  height: '100%',
                  background: 'rgba(255,255,255,0.8)'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>$0</span>
              <span className="mono">{freightCostExposureDisplay} exposure</span>
              <span>${freightCost.toLocaleString()} total</span>
            </div>
          </div>

          {/* Progress Bar 3 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 500, color: '#e5e5e5' }}>Commercial Invoice Exposure</span>
              <span className="mono" style={{ fontWeight: 600, color: '#ffffff' }}>{disruptionProb.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, disruptionProb)}%`,
                  height: '100%',
                  background: 'rgba(255,255,255,0.6)'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>$0</span>
              <span className="mono">${shipmentValueAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })} exposed</span>
              <span>${shipmentValue.toLocaleString()} invoice</span>
            </div>
          </div>

          {/* Progress Bar 4 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 500, color: '#e5e5e5' }}>Transit Schedule Deviation</span>
              <span className="mono" style={{ fontWeight: 600, color: predictedDelay > 5 ? '#f87171' : '#ffffff' }}>
                +{predictedDelay.toFixed(1)}d
              </span>
            </div>
            <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, (predictedDelay / 15) * 100)}%`,
                  height: '100%',
                  background: predictedDelay > 5 ? '#f87171' : '#ffffff'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
              <span>0 days</span>
              <span className="mono">{delayExposureDisplay}</span>
              <span>15d peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. COMPARATIVE HORIZONTAL EXPOSURE BARS */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffffff' }} />
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                TOTAL BASELINE vs AT-RISK EXPOSURE
              </div>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Side-by-side volume and budget allocation comparisons
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.68rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
              <span style={{ color: 'var(--text-dim)' }}>Baseline Total</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: 8, height: 8, background: '#ffffff', borderRadius: 1 }} />
              <span style={{ color: '#ffffff', fontWeight: 600 }}>At-Risk Exposure</span>
            </div>
          </div>
        </div>

        {/* Horizontal Comparison Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', marginTop: '0.75rem' }}>
          {/* Row 1: Cargo Volume */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 500, color: '#e5e5e5' }}>Cargo Volume Comparison</span>
              <span className="mono" style={{ color: 'var(--text-muted)' }}>
                Exposed: <strong style={{ color: '#ffffff' }}>{volAtRiskDisplay}</strong> / Total: {tradeVolumeDisplay}
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', background: 'rgba(255,255,255,0.08)' }} />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(100, disruptionProb)}%`,
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '0.5rem',
                  color: '#000000',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                {disruptionProb >= 15 ? `${disruptionProb.toFixed(1)}% AT RISK` : ''}
              </div>
            </div>
          </div>

          {/* Row 2: Freight Cost */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 500, color: '#e5e5e5' }}>Freight Contingency Budget</span>
              <span className="mono" style={{ color: 'var(--text-muted)' }}>
                Exposed: <strong style={{ color: '#ffffff' }}>{freightCostExposureDisplay}</strong> / Baseline: ${freightCost.toLocaleString()} USD
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', background: 'rgba(255,255,255,0.08)' }} />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(100, disruptionProb)}%`,
                  background: 'rgba(255,255,255,0.85)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '0.5rem',
                  color: '#000000',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                {disruptionProb >= 15 ? `${disruptionProb.toFixed(1)}% EXPOSURE` : ''}
              </div>
            </div>
          </div>

          {/* Row 3: Commercial Invoice Value */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 500, color: '#e5e5e5' }}>Commercial Invoice Capital Value</span>
              <span className="mono" style={{ color: 'var(--text-muted)' }}>
                Exposed: <strong style={{ color: '#ffffff' }}>${shipmentValueAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}</strong> / Total: ${shipmentValue.toLocaleString()} {currency}
              </span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', background: 'rgba(255,255,255,0.08)' }} />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(100, disruptionProb)}%`,
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '0.5rem',
                  color: '#000000',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                {disruptionProb >= 15 ? `${disruptionProb.toFixed(1)}% AT RISK` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Batch Exposure (when operational dataset is loaded) */}
      {data && data.top_routes_by_volume_at_risk && data.top_routes_by_volume_at_risk.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* Top Routes by Volume at Risk */}
          <div className="card" style={{ background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                PORTFOLIO CORRIDORS BY VOLUME EXPOSURE
              </span>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>TONNES</span>
            </div>

            <div className="table-container">
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>ROUTE</th>
                    <th>CORRIDOR</th>
                    <th>VOLUME AT RISK</th>
                    <th>TOTAL</th>
                    <th>TIER</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_routes_by_volume_at_risk.map((item) => (
                    <tr key={item.route_id} onClick={() => onSelectRoute(item.route_id)} style={{ cursor: 'pointer' }}>
                      <td className="mono" style={{ fontWeight: 600, color: '#ffffff' }}>
                        {item.route_id}
                      </td>
                      <td style={{ color: '#e5e5e5' }}>{item.corridor}</td>
                      <td className="mono" style={{ fontWeight: 600, color: '#f5f5f5' }}>
                        {item.volume_at_risk.toLocaleString()} t
                      </td>
                      <td className="mono" style={{ color: 'var(--text-dim)' }}>
                        {item.trade_volume.toLocaleString()} t
                      </td>
                      <td>
                        <RiskBadge level={item.risk_level} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Routes by Freight Exposure */}
          <div className="card" style={{ background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                PORTFOLIO CORRIDORS BY FREIGHT EXPOSURE
              </span>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>USD</span>
            </div>

            <div className="table-container">
              <table className="data-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>ROUTE</th>
                    <th>CORRIDOR</th>
                    <th>EXPOSURE</th>
                    <th>RATE</th>
                    <th>TIER</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_routes_by_freight_exposure.map((item) => (
                    <tr key={item.route_id} onClick={() => onSelectRoute(item.route_id)} style={{ cursor: 'pointer' }}>
                      <td className="mono" style={{ fontWeight: 600, color: '#ffffff' }}>
                        {item.route_id}
                      </td>
                      <td style={{ color: '#e5e5e5' }}>{item.corridor}</td>
                      <td className="mono" style={{ fontWeight: 600, color: '#f5f5f5' }}>
                        ${item.freight_exposure.toLocaleString()}
                      </td>
                      <td className="mono" style={{ color: 'var(--text-dim)' }}>
                        ${item.predicted_cost.toLocaleString()}
                      </td>
                      <td>
                        <RiskBadge level={item.risk_level} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Official Disclaimer */}
      <div style={{ padding: '0.85rem 1.15rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <Info size={15} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#d4d4d4' }}>ACTUARIAL EXPOSURE NOTICE:</strong> Figures represent statistical exposure derived by multiplying cargo payloads and projected freight tariffs by predicted disruption likelihoods. They model contingency vulnerability rather than realized balance sheet write-downs.
        </div>
      </div>
    </div>
  );
};

