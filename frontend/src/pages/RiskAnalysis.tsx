import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  Clock,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Download,
  Calendar,
  MapPin,
  Anchor,
  Navigation,
  Building,
  Package,
  Sliders,
  Share2,
  FileText,
  Activity,
  Check,
  RotateCcw
} from 'lucide-react';
import {
  PredictResponse,
  ShipmentRiskRequest
} from '../types/supplyGuard';
import { CircularRiskGauge } from '../components/CircularRiskGauge';
import { DelayComparisonBar } from '../components/DelayComparisonBar';
import { SupplyChainFlow } from '../components/SupplyChainFlow';
import { RiskFactorBars } from '../components/RiskFactorBars';
import { BusinessImpactCards } from '../components/BusinessImpactCards';
import { NetworkTopologyVisual } from '../components/NetworkTopologyVisual';
import { MaritimeRouteArc } from '../components/MaritimeRouteArc';
import { WeatherIntelVisual } from '../components/WeatherIntelVisual';
import { PredictionTraceVisual } from '../components/PredictionTraceVisual';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';

const BENCHMARK_PAYLOAD: ShipmentRiskRequest = {
  supplier_company: 'Maersk Line Logix',
  customer_company: 'Apex Advanced Manufacturing',
  receiving_company: 'Apex Advanced Manufacturing',
  product_name: 'Lithium-Ion Polymer Cathode Assemblies (Class 9 HazMat)',
  quantity: 50,
  quantity_unit: 'TEU ISO-Spec',
  shipment_weight: 15000,
  weight_unit: 'kg',
  commercial_value: 5000000,
  shipment_value: 5000000,
  currency: 'USD',
  origin_port: 'Port of Yokohama',
  destination_port: 'Port of Los Angeles',
  origin_country: 'Japan',
  origin_city: 'Yokohama',
  destination_country: 'United States',
  destination_city: 'Los Angeles',
  departure_date: '2026-10-29',
  departure_time: '10:00',
  shipment_status: 'Normal',
  current_delay_days: 0,
  overrides: {}
};

interface RiskAnalysisProps {
  routes?: any[];
  selectedRouteId?: string;
  onSelectRouteId?: (id: string) => void;
  onNavigate?: (page: any) => void;
  onLoadDemo?: () => void;
  isLoaded?: boolean;
  activePrediction?: any;
  onPredictionChange?: (pred: any) => void;
}

export const RiskAnalysis: React.FC<RiskAnalysisProps> = ({
  onNavigate,
  activePrediction = null,
  onPredictionChange
}) => {
  const [loadingSample, setLoadingSample] = useState<boolean>(false);

  const handleLoadBenchmark = async () => {
    setLoadingSample(true);
    try {
      const result = await api.analyzeShipment(BENCHMARK_PAYLOAD);
      if (onPredictionChange) {
        onPredictionChange(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleExportJson = () => {
    if (!activePrediction) return;
    const blob = new Blob([JSON.stringify(activePrediction, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk_analysis_${activePrediction.route_id || 'manifest'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Standby State when no active prediction
  if (!activePrediction) {
    return (
      <div className="page-container" style={{ maxWidth: '840px', margin: '3rem auto' }}>
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto',
              color: '#FFFFFF'
            }}
          >
            <ShieldAlert size={26} />
          </div>

          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '0.35rem' }}>
            STANDBY // RISK ANALYSIS ENGINE
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 400, color: '#FFFFFF', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
            No shipment analyzed yet.
          </h2>

          <p style={{ fontSize: '0.80rem', color: 'var(--text-body)', maxWidth: '520px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            Input and profile your shipment parameters on the Overview command center, or initialize the benchmark maritime corridor to execute the LightGBM predictive suite.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleLoadBenchmark}
              disabled={loadingSample}
            >
              <span>{loadingSample ? 'INITIALIZING INFERENCE...' : 'LOAD BENCHMARK CORRIDOR (YOK → LAX)'}</span>
            </button>
            {onNavigate && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate('overview')}
              >
                <span>OPEN SHIPMENT CREATION FORM</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Prediction Data Extraction
  const shipment = activePrediction?.shipment || activePrediction?.raw_shipment || {};
  const supplier = shipment?.supplier_company || activePrediction.supplier_company || 'Consignor';
  const customer = shipment?.receiving_company || shipment?.customer_company || activePrediction.receiving_company || activePrediction.customer_company || 'Enterprise';
  const product = shipment?.product_name || activePrediction.product_name || 'Commercial Freight';
  const quantity = Number(shipment?.quantity || activePrediction.quantity || 0).toLocaleString();
  const quantityUnit = shipment?.quantity_unit || activePrediction.quantity_unit || 'units';
  const weight = Number(shipment?.shipment_weight || activePrediction.shipment_weight || 0).toLocaleString();
  const weightUnit = shipment?.weight_unit || activePrediction.weight_unit || 'kg';
  const commercialVal = Number(shipment?.commercial_value || shipment?.shipment_value || activePrediction.commercial_value || activePrediction.shipment_value || 0);
  const currency = shipment?.currency || activePrediction.currency || 'USD';

  const originPort = shipment?.origin?.port || shipment?.origin_port || activePrediction.origin_port || 'Origin Port';
  const destPort = shipment?.destination?.port || shipment?.destination_port || activePrediction.destination_port || 'Destination Port';
  const originCity = shipment?.origin?.city || activePrediction.origin_city || '';
  const destCity = shipment?.destination?.city || activePrediction.destination_city || '';
  const originCountry = shipment?.origin?.country || activePrediction.origin_country || '';
  const destCountry = shipment?.destination?.country || activePrediction.destination_country || '';

  const departureDate = shipment?.departure_date || activePrediction.departure_date || '2026-10-29';
  const departureTime = shipment?.departure_time || activePrediction.departure_time || '10:00';
  const arrivalDate = activePrediction.estimated_arrival || '2026-11-27';

  const score = Number(activePrediction.supply_guard_score ?? 10.7);
  const disruptionProb = Number(activePrediction.disruption_probability_percent ?? 0.45);
  const delayDays = Number(activePrediction.predicted_delay_days ?? 5.81);
  const freightCost = Number(activePrediction.predicted_freight_cost_usd ?? 6323);
  const distanceKm = Number(activePrediction.distance_km || 13930.9);
  const transitDays = Number(activePrediction.baseline_transit_days || 24.3);
  const volumeAtRisk = Number(activePrediction.business_impact?.estimated_volume_at_risk_tonnes || 0);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ========================================================================= */}
      {/* 1. COMMAND HEADER FLOATING GLASS POD (Stitch Screen 1)                    */}
      {/* ========================================================================= */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              INPUT-DRIVEN SHIPMENT RISK ANALYSIS
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '10px' }}>/</span>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
              {supplier} → {customer}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.03em', margin: 0 }}>
              {originCity || originPort} → {destCity || destPort}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>CORRIDOR REF</span>
              <span className="mono" style={{ fontSize: '0.68rem', color: '#FFFFFF' }}>{activePrediction.route_id || 'SG-88294'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255, 255, 255, 0.04)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF' }} />
              <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
                DETERMINISTIC STAMPED
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportJson}
          >
            <Download size={13} />
            <span>Export Manifest (.JSON)</span>
          </button>
          {onNavigate && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('simulator')}
            >
              <Sliders size={13} />
              <span>Recalibrate &amp; Simulate</span>
            </button>
          )}
          {onNavigate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('overview')}
            >
              <span>+ New Analysis</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY GRID: 3 CLEAN SMOKED GLASS COLUMNS (Stitch Screen 1)           */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
        {/* Col 1: Terminal Topology */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.35rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                01 / TERMINAL TOPOLOGY
              </span>
              <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>GEO-COORD</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.25rem 0' }}>
              <div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>PORT OF DEPARTURE</span>
                <div style={{ fontSize: '0.92rem', fontWeight: 500, color: '#FFFFFF', marginTop: '1px' }}>{originPort}</div>
                <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{originCity}, {originCountry}</div>
              </div>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.04)' }} />
              <div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>PORT OF ARRIVAL</span>
                <div style={{ fontSize: '0.92rem', fontWeight: 500, color: '#FFFFFF', marginTop: '1px' }}>{destPort}</div>
                <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{destCity}, {destCountry}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>HUB ROUTING</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Deep-Sea Direct Passage</span>
          </div>
        </div>

        {/* Col 2: Temporal Dynamics */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.35rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                02 / TEMPORAL DYNAMICS
              </span>
              <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>UTC+00</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.25rem 0' }}>
              <div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>TRANSIT WINDOW</span>
                <div className="mono" style={{ fontSize: '0.88rem', color: '#FFFFFF', marginTop: '1px' }}>
                  {departureDate} → {arrivalDate}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Standard slot reservation</div>
              </div>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.04)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>TARGET DURATION</span>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 300, color: '#FFFFFF' }}>
                    {transitDays} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>days</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>NAUTICAL DISTANCE</span>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 300, color: '#FFFFFF' }}>
                    {distanceKm ? distanceKm.toLocaleString() : '8,840'} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>km</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>SPEED PROFILE</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>17.2 kts eco-steaming</span>
          </div>
        </div>

        {/* Col 3: Cargo Manifest & Valuation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.35rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                03 / CARGO &amp; POLICY
              </span>
              <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>MANIFEST</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.25rem 0' }}>
              <div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>CLASSIFICATION</span>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#FFFFFF', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Commercial containerized freight</div>
              </div>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.04)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>QUANTITY</span>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 300, color: '#FFFFFF' }}>
                    {quantity} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{quantityUnit}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>PAYLOAD MASS</span>
                  <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 300, color: '#FFFFFF' }}>
                    {weight} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{weightUnit}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>VALUATION BASE</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              ${commercialVal.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ROUTE CALCULATION ARCHITECTURAL SCHEMATIC (Stitch Screen 1)            */}
      {/* ========================================================================= */}
      <MaritimeRouteArc
        originPort={originPort}
        originCity={originCity}
        originCountry={originCountry}
        destPort={destPort}
        destCity={destCity}
        destCountry={destCountry}
        distanceKm={distanceKm}
        baselineTransitDays={transitDays}
      />

      {/* ========================================================================= */}
      {/* 4. KEY RISK METRICS (5 Translucent Smoked Glass Pods - Screen 1)          */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
        {/* KPI 1: Supply Guard Score */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              SUPPLY GUARD SCORE
            </span>
            <span className={`risk-badge ${activePrediction.risk_level || 'LOW'}`}>
              {activePrediction.risk_level || 'LOW'}
            </span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {score.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>/ 100</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Threat Profile</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {score >= 70 ? 'Critical Severity' : score >= 50 ? 'Elevated Threat' : score >= 30 ? 'Moderate Caution' : 'Optimal Vector'}
            </span>
          </div>
        </div>

        {/* KPI 2: Disruption Probability */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              DISRUPTION PROB.
            </span>
            <Activity size={14} color="var(--text-muted)" />
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {disruptionProb.toFixed(2)}
              </span>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '2px' }}>%</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Operating Gate</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {disruptionProb >= 25 ? 'Exceeds 25% Threshold' : 'Nominal (<25%)'}
            </span>
          </div>
        </div>

        {/* KPI 3: Predicted Delay */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              PREDICTED DELAY
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>P80</span>
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 300, color: delayDays >= 5 ? '#EF4444' : '#FFFFFF', letterSpacing: '-0.04em', lineHeight: 1 }}>
                +{delayDays.toFixed(1)}
              </span>
              <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>days</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Terminal Queue</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Berth Dwell Reconciled</span>
          </div>
        </div>

        {/* KPI 4: Predicted Freight Cost */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              PRED. FREIGHT RATE
            </span>
            <DollarSign size={14} color="var(--text-muted)" />
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginRight: '2px' }}>$</span>
              <span style={{ fontSize: '2.4rem', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {freightCost.toLocaleString()}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>USD</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Market Delta</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Baseline Spot Index</span>
          </div>
        </div>

        {/* KPI 5: Volume at Risk */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              VOLUME AT RISK
            </span>
            <Package size={14} color="var(--text-muted)" />
          </div>
          <div style={{ margin: '0.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {volumeAtRisk.toLocaleString()}
              </span>
              <span style={{ fontSize: '0.80rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>tonnes</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            <span>Perishability Tier</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Standard Cargo</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PREDICTION TRACE & AUDIT PIPELINE (Stages 01–04)                       */}
      {/* ========================================================================= */}
      <PredictionTraceVisual activePrediction={activePrediction} />

      {/* ========================================================================= */}
      {/* 6. RISK FACTOR DECOMPOSITION & WEATHER MATRIX                             */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '0.75rem' }}>
        <RiskFactorBars factors={activePrediction.risk_factors || activePrediction.feature_dict} />
        <WeatherIntelVisual
          originWeather={activePrediction.origin_weather}
          destWeather={activePrediction.destination_weather}
          departureDate={departureDate}
          arrivalDate={arrivalDate}
        />
      </div>

      {/* ========================================================================= */}
      {/* 7. END-TO-END SUPPLY CHAIN PIPELINE FLOW                                  */}
      {/* ========================================================================= */}
      <SupplyChainFlow
        supplier={supplier}
        customer={customer}
        originPort={originPort}
        originCountry={originCountry}
        destPort={destPort}
        destCountry={destCountry}
        transitDays={transitDays}
        shipmentStatus={activePrediction.shipment_status || 'Normal'}
        predictedDelay={delayDays}
        productName={product}
      />

      {/* ========================================================================= */}
      {/* 8. NETWORK TOPOLOGY VISUAL                                                */}
      {/* ========================================================================= */}
      <NetworkTopologyVisual
        corridor={`${originPort} → ${destPort}`}
        directRoutesCount={activePrediction.network_analysis?.direct_routes_count || activePrediction.network?.direct_routes_count || 18}
        secondOrderRoutesCount={activePrediction.network_analysis?.second_order_routes_count || activePrediction.network?.second_order_routes_count || 32}
        rippleRiskScore={activePrediction.network_analysis?.ripple_risk_score ?? activePrediction.network?.ripple_risk_score ?? 17.0}
        networkAnalysis={activePrediction.network_analysis || activePrediction.networkImpact || activePrediction.network}
      />
    </div>
  );
};
