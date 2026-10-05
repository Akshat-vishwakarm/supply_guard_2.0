import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Sparkles,
  Clock,
  Truck,
  Shield,
  PlusCircle,
  Database,
  DollarSign,
  Package,
  Calendar,
  Layers,
  Zap,
  CheckCircle2,
  Plus,
  Minus,
  Wind,
  Globe2,
  Fuel,
  Compass
} from 'lucide-react';
import {
  RouteItem,
  PredictResponse,
  CustomSimulationResponse,
  ShipmentRiskRequest
} from '../types/supplyGuard';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';
import { SimulatorComparisonVisual } from '../components/SimulatorComparisonVisual';
import { VisualSliderControl } from '../components/VisualSliderControl';
import { DeltaBadge } from '../components/DeltaBadge';

const VALIDATION_SHIPMENT_PAYLOAD: ShipmentRiskRequest = {
  supplier_company: 'Company A',
  customer_company: 'Company B',
  product_name: 'Steel Components',
  quantity: 50000,
  quantity_unit: 'units',
  shipment_weight: 15000,
  weight_unit: 'kg',
  commercial_value: 500000,
  shipment_value: 500000,
  currency: 'USD',
  origin_port: 'Yokohama Port',
  destination_port: 'Port of Los Angeles',
  origin_country: 'Japan',
  origin_city: 'Yokohama',
  destination_country: 'United States',
  destination_city: 'Los Angeles',
  origin: {
    port: 'Yokohama Port',
    city: 'Yokohama',
    country: 'Japan',
    latitude: 35.4437,
    longitude: 139.6380
  },
  destination: {
    port: 'Port of Los Angeles',
    city: 'Los Angeles',
    country: 'United States',
    latitude: 33.7432,
    longitude: -118.2673
  },
  departure_date: '2026-10-05',
  departure_time: '10:00',
  shipment_status: 'Normal',
  current_delay_days: 0,
  overrides: {}
};

const DEMO_SHIPMENT_PAYLOAD: ShipmentRiskRequest = {
  supplier_company: 'ABC Components Pvt Ltd',
  customer_company: 'Toyota Motor Corporation',
  product_name: 'Automotive Components',
  quantity: 15000,
  quantity_unit: 'Units',
  shipment_weight: 12500,
  weight_unit: 'kg',
  shipment_value: 18500000,
  currency: 'JPY',
  origin_port: 'Port of Yokohama',
  destination_port: 'Port of Los Angeles',
  origin_country: 'Japan',
  origin_city: 'Yokohama',
  destination_country: 'United States',
  destination_city: 'Los Angeles',
  departure_date: '2026-10-05',
  departure_time: '10:00',
  shipment_status: 'Normal',
  current_delay_days: 0,
  overrides: {}
};

interface SimulatorViewProps {
  routes?: RouteItem[];
  selectedRouteId?: string;
  onSelectRouteId?: (id: string) => void;
  onLoadDemo?: () => void;
  isLoaded?: boolean;
  activePrediction?: any;
  onNavigate?: (page: any) => void;
  onPredictionChange?: (pred: any) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  activePrediction = null,
  onNavigate,
  onPredictionChange
}) => {
  // Baseline factors from the user's real analyzed shipment
  const baselineFactors = activePrediction?.risk_factors || activePrediction?.risk?.risk_factors;
  const shipment = activePrediction?.shipment;

  const baseCongestion = Number(baselineFactors?.port_congestion_index ?? (activePrediction?.feature_dict?.port_congestion_index ?? 70));
  const baseWeather = Number(baselineFactors?.weather_disruption_score ?? (activePrediction?.origin_weather?.weather_risk ?? 42));
  const baseGeo = Number(baselineFactors?.geopolitical_risk_score ?? (activePrediction?.feature_dict?.geopolitical_risk_score ?? 50));
  const baseContainer = Number(baselineFactors?.container_availability_index ?? (activePrediction?.feature_dict?.container_availability_index ?? 50));
  const baseFuel = Number(baselineFactors?.fuel_cost_index ?? (activePrediction?.feature_dict?.fuel_cost_index ?? 60));
  const baseCommodity = Number(baselineFactors?.commodity_price_index ?? (activePrediction?.feature_dict?.commodity_price_index ?? 60));

  // 8 SCENARIO CONTROLS (Port Congestion, Weather, Geopolitical, Container, Fuel, Commodity, Delay, Currency)
  const [congestionDelta, setCongestionDelta] = useState<number>(20);
  const [weatherDelta, setWeatherDelta] = useState<number>(15);
  const [geoDelta, setGeoDelta] = useState<number>(10);
  const [containerDelta, setContainerDelta] = useState<number>(-15);
  const [fuelDelta, setFuelDelta] = useState<number>(10);
  const [commodityDelta, setCommodityDelta] = useState<number>(5);
  const [delayShockDelta, setDelayShockDelta] = useState<number>(0);
  const [currencyShockDelta, setCurrencyShockDelta] = useState<number>(0);

  const [weatherMode, setWeatherMode] = useState<'MANUAL' | 'WEATHER_MODEL'>('MANUAL');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingSample, setLoadingSample] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Clamped absolute scenario values
  const simCongestion = Math.min(100, Math.max(0, Math.round(baseCongestion + congestionDelta)));
  const simWeather = Math.min(100, Math.max(0, Math.round(baseWeather + weatherDelta)));
  const simGeo = Math.min(100, Math.max(0, Math.round(baseGeo + geoDelta)));
  const simContainer = Math.min(100, Math.max(0, Math.round(baseContainer + containerDelta)));
  const simFuel = Math.max(0, Math.round(baseFuel + fuelDelta));
  const simCommodity = Math.max(0, Math.round(baseCommodity + commodityDelta));

  // Execute real ML simulation via backend POST /api/shipment/simulate
  const executeSimulation = async () => {
    if (!activePrediction) return;

    setLoading(true);
    setErrorMsg('');

    const raw = activePrediction.raw_shipment || {};
    const baselineShipment = {
      supplier_company: shipment?.supplier_company || activePrediction.supplier_company || raw.supplier_company || '',
      receiving_company: shipment?.receiving_company || shipment?.customer_company || activePrediction.receiving_company || activePrediction.customer_company || raw.receiving_company || '',
      customer_company: shipment?.customer_company || shipment?.receiving_company || activePrediction.customer_company || activePrediction.receiving_company || raw.customer_company || '',
      product_name: shipment?.product_name || activePrediction.product_name || raw.product_name || '',
      quantity: shipment?.quantity ?? activePrediction.quantity ?? raw.quantity ?? 0,
      quantity_unit: shipment?.quantity_unit || activePrediction.quantity_unit || raw.quantity_unit || 'units',
      shipment_weight: shipment?.shipment_weight ?? activePrediction.shipment_weight ?? raw.shipment_weight ?? 0,
      weight_unit: shipment?.weight_unit || activePrediction.weight_unit || raw.weight_unit || 'kg',
      commercial_value: shipment?.commercial_value ?? raw.commercial_value ?? shipment?.shipment_value ?? activePrediction.commercial_value ?? activePrediction.shipment_value ?? 0,
      shipment_value: shipment?.shipment_value ?? raw.shipment_value ?? activePrediction.shipment_value ?? 0,
      currency: shipment?.currency || activePrediction.currency || activePrediction.display_currency || raw.currency || 'USD',
      origin_port: shipment?.origin_port || activePrediction.origin_port || raw.origin?.port || (activePrediction.origin_city ? `${activePrediction.origin_city} Port` : ''),
      origin_city: activePrediction.origin_city || raw.origin?.city || '',
      origin_country: activePrediction.origin_country || raw.origin?.country || '',
      destination_port: shipment?.destination_port || activePrediction.destination_port || raw.destination?.port || (activePrediction.destination_city ? `${activePrediction.destination_city} Port` : ''),
      destination_city: activePrediction.destination_city || raw.destination?.city || '',
      destination_country: activePrediction.destination_country || raw.destination?.country || '',
      departure_date: activePrediction.departure_date || shipment?.departure_date || raw.departure_date || '',
      departure_time: activePrediction.departure_time || shipment?.departure_time || raw.departure_time || '',
      baseline_transit_days: activePrediction.baseline_transit_days ?? activePrediction.estimated_transit_days ?? 0,
      trade_volume_tonnes: activePrediction.trade_volume_tonnes ?? (Number(shipment?.shipment_weight || raw.shipment_weight || 0) / 1000),
      shipment_status: activePrediction.route_status || shipment?.shipment_status || raw.shipment_status || 'Normal'
    };

    const scenario = {
      port_congestion_index: simCongestion,
      weather_disruption_score: simWeather,
      geopolitical_risk_score: simGeo,
      container_availability_index: simContainer,
      fuel_cost_index: simFuel,
      commodity_price_index: simCommodity,
      weather_mode: weatherMode
    };

    try {
      const res = await api.simulateShipment({
        baselineShipment,
        scenario
      });

      const processedRes = { ...res };
      if (delayShockDelta !== 0 || currencyShockDelta !== 0) {
        const baseCost = Number(processedRes.baseline?.predicted_freight_cost_usd || 0);
        const simDelay = Number(processedRes.scenario?.predicted_delay_days || 0) + delayShockDelta;
        const simCost = Number(processedRes.scenario?.predicted_freight_cost_usd || 0) * (1 + currencyShockDelta / 100);
        processedRes.scenario = {
          ...processedRes.scenario,
          predicted_delay_days: Math.max(0, simDelay),
          predicted_freight_cost_usd: Math.max(0, Math.round(simCost))
        };
        if (processedRes.changes) {
          processedRes.changes = {
            ...processedRes.changes,
            predicted_delay_change_days: Number(processedRes.changes.predicted_delay_change_days || 0) + delayShockDelta,
            predicted_freight_cost_change_usd: Math.round(simCost - baseCost)
          };
        }
      }
      setSimResult(processedRes);
    } catch (err: any) {
      console.error('Simulation error:', err);
      setErrorMsg(err.message || 'Failed to execute real ML scenario simulation.');
    } finally {
      setLoading(false);
    }
  };

  // Re-run simulation when activePrediction changes
  useEffect(() => {
    if (activePrediction) {
      executeSimulation();
    } else {
      setSimResult(null);
    }
  }, [activePrediction]);

  // Load Section 23 validation sample
  const handleLoadValidationShipment = async () => {
    setLoadingSample(true);
    setErrorMsg('');
    try {
      const result = await api.analyzeShipment(VALIDATION_SHIPMENT_PAYLOAD);
      if (onPredictionChange) {
        onPredictionChange(result);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load validation shipment.');
    } finally {
      setLoadingSample(false);
    }
  };

  // Load demo shipment
  const handleLoadDemoShipment = async () => {
    setLoadingSample(true);
    setErrorMsg('');
    try {
      const result = await api.analyzeShipment(DEMO_SHIPMENT_PAYLOAD);
      if (onPredictionChange) {
        onPredictionChange(result);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load demo shipment.');
    } finally {
      setLoadingSample(false);
    }
  };

  // Reset all controls to baseline
  const handleResetAll = () => {
    setCongestionDelta(0);
    setWeatherDelta(0);
    setGeoDelta(0);
    setContainerDelta(0);
    setFuelDelta(0);
    setCommodityDelta(0);
    setDelayShockDelta(0);
    setCurrencyShockDelta(0);
  };

  // Quick preset shocks
  const applyPreset = (c: number, w: number, g: number, cnt: number, f: number = 0, cmd: number = 0, d: number = 0, curr: number = 0) => {
    setCongestionDelta(c);
    setWeatherDelta(w);
    setGeoDelta(g);
    setContainerDelta(cnt);
    setFuelDelta(f);
    setCommodityDelta(cmd);
    setDelayShockDelta(d);
    setCurrencyShockDelta(curr);
  };

  // =========================================================================
  // FRESH APPLICATION STATE: When No Shipment Has Been Analyzed Yet
  // =========================================================================
  if (!activePrediction) {
    return (
      <div className="page-container" style={{ paddingBottom: '3.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Simulator Engine • Standby Mode
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5', margin: 0 }}>
            Supply Chain Scenario Simulator
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
            Stress-test operational disruption variables. ML re-evaluates Disruption, Delay, Freight Cost, and ETA deltas.
          </p>
        </div>

        <div
          className="card"
          style={{
            margin: '2rem 0',
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'rgba(10, 10, 10, 0.5)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: 2
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}
          >
            <Sliders size={26} style={{ color: '#ffffff' }} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f5f5f5', marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>
            NO ACTIVE SHIPMENT LOADED FOR SIMULATION
          </h2>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              margin: '0.4rem 0 1.5rem 0',
              padding: '0.25rem 0.85rem',
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-muted)'
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
            <span className="mono">AWAITING SHIPMENT TELEMETRY CONTEXT</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            The Scenario Simulator operates deterministically on your analyzed shipment baseline.
            Configure and run an analysis from the Overview workspace to evaluate shock parameters.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            {onNavigate && (
              <button
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.6rem', fontSize: '0.8rem', fontWeight: 600 }}
                onClick={() => onNavigate('overview')}
              >
                <PlusCircle size={14} style={{ marginRight: '0.4rem' }} />
                <span>CONFIGURE SHIPMENT</span>
              </button>
            )}

            <button
              className="btn btn-secondary"
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.8rem' }}
              onClick={handleLoadDemoShipment}
              disabled={loadingSample}
            >
              <Database size={14} style={{ marginRight: '0.4rem' }} />
              <span>Ingest Enterprise Demo Data</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE SHIPMENT SIMULATION VIEW
  // =========================================================================
  const rawShipment = activePrediction.raw_shipment || {};
  const supplier = shipment?.supplier_company || activePrediction.supplier_company || rawShipment.supplier_company || '—';
  const customer = shipment?.receiving_company || shipment?.customer_company || activePrediction.receiving_company || activePrediction.customer_company || rawShipment.receiving_company || '—';
  const product = shipment?.product_name || activePrediction.product_name || rawShipment.product_name || '—';
  const qtyVal = shipment?.quantity ?? activePrediction.quantity ?? rawShipment.quantity;
  const qty = qtyVal != null ? Number(qtyVal).toLocaleString() : '—';
  const qtyUnit = shipment?.quantity_unit || activePrediction.quantity_unit || rawShipment.quantity_unit || '';
  const weightVal = shipment?.shipment_weight ?? activePrediction.shipment_weight ?? rawShipment.shipment_weight;
  const weight = weightVal != null ? Number(weightVal).toLocaleString() : '—';
  const weightUnit = shipment?.weight_unit || activePrediction.weight_unit || rawShipment.weight_unit || '';
  const originPort = shipment?.origin_port || activePrediction.origin_port || (activePrediction.origin_city ? `${activePrediction.origin_city} Port` : '—');
  const destPort = shipment?.destination_port || activePrediction.destination_port || (activePrediction.destination_city ? `${activePrediction.destination_city} Port` : '—');
  const departureFmt = activePrediction.departure_formatted || activePrediction.route_timeline?.departure_local?.formatted || (activePrediction.departure_date ? `${activePrediction.departure_date} • ${activePrediction.departure_time || ''}` : '—');
  const baselineTransit = activePrediction.baseline_transit_days ?? activePrediction.estimated_transit_days ?? 0;
  const transitSource = activePrediction.transit_source || 'trade_routes.csv';
  const routeType = activePrediction.route_type || (activePrediction.is_known_route ? 'Historical Route (trade_routes.csv)' : 'Estimated Route (Physics)');
  const displayCurrency = activePrediction.currency || activePrediction.display_currency || 'USD';

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              STRESS-TEST ENGINE • DETERMINISTIC LIGHTGBM PIPELINE
            </span>
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5' }}>
            Supply Chain Scenario Simulator
          </h1>
          <p className="page-subtitle" style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Stress-test port congestion, weather severity, and geopolitical bottlenecks with deterministic feature vector re-inference.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {onNavigate && (
            <button
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.75rem' }}
              onClick={() => onNavigate('overview')}
            >
              <PlusCircle size={13} style={{ marginRight: '0.35rem' }} />
              <span>EDIT SHIPMENT</span>
            </button>
          )}

          <button
            className="btn btn-primary"
            style={{
              padding: '0.6rem 1.4rem',
              fontSize: '0.78rem',
              fontWeight: 600
            }}
            onClick={executeSimulation}
            disabled={loading}
          >
            {loading ? <Activity className="spin" size={14} style={{ marginRight: '0.35rem' }} /> : <Play size={14} style={{ marginRight: '0.35rem' }} />}
            <span>{loading ? 'RE-INFERRING MODELS...' : 'RUN SIMULATION'}</span>
          </button>
        </div>
      </div>

      {/* SECTION: EXACT SHIPMENT UNDER TEST */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(10, 10, 10, 0.5)',
          borderRadius: 2
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 2, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={14} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                BASELINE SHIPMENT TRUTH
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f5f5f5' }}>
                {supplier} → {customer}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              className="mono"
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '0.2rem 0.5rem',
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#d4d4d4',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {routeType}
            </span>
            <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              CURRENCY: {displayCurrency}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product / Cargo</div>
            <div style={{ fontWeight: 600, color: '#f5f5f5', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              {product}
            </div>
            <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              {qty} {qtyUnit} • {weight} {weightUnit}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Maritime Corridor</div>
            <div style={{ fontWeight: 600, color: '#f5f5f5', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              {originPort}, {activePrediction.origin_country}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              ↓ {destPort}, {activePrediction.destination_country}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Departure Schedule</div>
            <div className="mono" style={{ fontWeight: 600, color: '#f5f5f5', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              {departureFmt}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
              Origin Port Local Time ({activePrediction.origin_tz_abbr || 'JST'})
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Baseline Ocean Transit</div>
            <div className="mono" style={{ fontWeight: 600, color: '#f5f5f5', fontSize: '1rem', marginTop: '0.2rem' }}>
              {baselineTransit} <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 400 }}>days</span>
            </div>
            <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
              SOURCE: {transitSource}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK PRESET BUTTONS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Scenario Presets:
        </span>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: 2 }}
          onClick={() => applyPreset(20, 0, 0, 0, 0, 0)}
        >
          Port Congestion +20%
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: 2 }}
          onClick={() => applyPreset(0, 25, 0, 0, 0, 0)}
        >
          Weather Risk +25%
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: 2 }}
          onClick={() => applyPreset(0, 0, 25, 0, 0, 0)}
        >
          Geopolitical Risk +25%
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: 2 }}
          onClick={() => applyPreset(0, 0, 0, -25, 0, 0)}
        >
          Container Avail -25%
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: 2 }}
          onClick={() => applyPreset(0, 0, 0, 0, 20, 15)}
        >
          Fuel &amp; Commodity Surge
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: 2, borderColor: 'rgba(255,255,255,0.2)' }}
          onClick={() => applyPreset(20, 28, 25, -15, 15, 10)}
        >
          Combined Severe Shock
        </button>
        <button
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', borderRadius: 2, color: 'var(--text-dim)' }}
          onClick={handleResetAll}
        >
          <RotateCcw size={11} style={{ marginRight: '0.3rem' }} /> Reset
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: VISUAL SCENARIO CONTROLS (Port Congestion, Weather, Geo, etc.)    */}
      {/* ========================================================================= */}
      <div
        className="card"
        style={{
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(10, 10, 10, 0.5)',
          borderRadius: 2,
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
              <h2 style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0, color: '#f5f5f5', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                SCENARIO STRESS-TEST CONTROLS
              </h2>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Adjust variable offsets. Tick markers on track indicate baseline calibration.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.75rem', borderRadius: 2 }}
              onClick={handleResetAll}
            >
              <RotateCcw size={12} style={{ marginRight: '0.3rem' }} />
              <span>RESET ALL</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.45rem 1.15rem', borderRadius: 2 }}
              onClick={executeSimulation}
              disabled={loading}
            >
              {loading ? <Activity className="spin" size={13} style={{ marginRight: '0.3rem' }} /> : <Play size={13} style={{ marginRight: '0.3rem' }} />}
              <span>{loading ? 'RE-INFERRING...' : 'RE-RUN SIMULATION'}</span>
            </button>
          </div>
        </div>

        {/* 8 Visual Slider Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          <VisualSliderControl
            label="PORT CONGESTION"
            subtext="Queue depth & dwell times"
            icon={<Truck size={15} />}
            min={0}
            max={100}
            baseValue={baseCongestion}
            scenarioValue={simCongestion}
            delta={congestionDelta}
            onChangeDelta={(d) => setCongestionDelta(Math.round(d))}
            color="#e2e8f0"
          />

          <VisualSliderControl
            label="WEATHER DISRUPTION"
            subtext="Severe storm & typhoon risk"
            icon={<Wind size={15} />}
            min={0}
            max={100}
            baseValue={baseWeather}
            scenarioValue={simWeather}
            delta={weatherDelta}
            onChangeDelta={(d) => setWeatherDelta(Math.round(d))}
            color="#e2e8f0"
          />

          <VisualSliderControl
            label="GEOPOLITICAL TENSION"
            subtext="Sanctions & maritime security"
            icon={<Globe2 size={15} />}
            min={0}
            max={100}
            baseValue={baseGeo}
            scenarioValue={simGeo}
            delta={geoDelta}
            onChangeDelta={(d) => setGeoDelta(Math.round(d))}
            color="#e2e8f0"
          />

          <VisualSliderControl
            label="CONTAINER AVAILABILITY"
            subtext="Equipment repositioning index"
            icon={<Package size={15} />}
            min={0}
            max={100}
            baseValue={baseContainer}
            scenarioValue={simContainer}
            delta={containerDelta}
            onChangeDelta={(d) => setContainerDelta(Math.round(d))}
            color="#e2e8f0"
          />

          <VisualSliderControl
            label="BUNKER FUEL INDEX"
            subtext="VLSFO & MGO price benchmark"
            icon={<Fuel size={15} />}
            min={20}
            max={120}
            baseValue={baseFuel}
            scenarioValue={simFuel}
            delta={fuelDelta}
            onChangeDelta={(d) => setFuelDelta(Math.round(d))}
            color="#e2e8f0"
          />

          <VisualSliderControl
            label="COMMODITY PRICE INDEX"
            subtext="Raw materials spot index"
            icon={<DollarSign size={15} />}
            min={20}
            max={120}
            baseValue={baseCommodity}
            scenarioValue={simCommodity}
            delta={commodityDelta}
            onChangeDelta={(d) => setCommodityDelta(Math.round(d))}
            color="#e2e8f0"
          />

          <VisualSliderControl
            label="SHIPMENT DELAY SHOCK"
            subtext="Port dwell or customs hold (+days)"
            icon={<Clock size={15} />}
            min={0}
            max={10}
            baseValue={0}
            scenarioValue={delayShockDelta}
            delta={delayShockDelta}
            onChangeDelta={(d) => setDelayShockDelta(Math.round(d))}
            color="#e2e8f0"
          />

          <VisualSliderControl
            label="CURRENCY EXCHANGE SHOCK"
            subtext="FX cross-rate volatility (+/-% shift)"
            icon={<TrendingUp size={15} />}
            min={-25}
            max={25}
            baseValue={0}
            scenarioValue={currencyShockDelta}
            delta={currencyShockDelta}
            onChangeDelta={(d) => setCurrencyShockDelta(Math.round(d))}
            color="#e2e8f0"
          />
        </div>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', fontSize: '0.78rem', borderRadius: 2 }}>
          {errorMsg}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BASELINE VS SCENARIO COMPARISON VISUAL POD                                */}
      {/* ========================================================================= */}
      {simResult && (
        <div style={{ marginBottom: '1.5rem' }}>
          <SimulatorComparisonVisual
            baseline={simResult.baseline || {}}
            scenario={simResult.scenario || {}}
            changes={simResult.changes || {}}
            baselineTransitDays={baselineTransit}
            displayCurrency={displayCurrency}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* STRUCTURED COMPARISON TABLE WITH DELTA BADGES                            */}
      {/* ========================================================================= */}
      {simResult && (
        <div className="card" style={{ border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(10,10,10,0.5)', borderRadius: 2, marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                  DETERMINISTIC INFERENCE COMPARISON MATRIX
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                <span className="mono" style={{ padding: '0.15rem 0.45rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  LIGHTGBM RE-EXECUTION
                </span>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: '0.8rem', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>METRIC</th>
                  <th style={{ color: 'var(--text-muted)', textAlign: 'left', padding: '0.65rem 0.85rem' }}>BASELINE</th>
                  <th style={{ color: '#ffffff', textAlign: 'left', padding: '0.65rem 0.85rem' }}>SCENARIO</th>
                  <th style={{ textAlign: 'left', padding: '0.65rem 0.85rem' }}>VARIANCE / DELTA</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Supply Guard Score */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Supply Guard Score
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Compound weighted enterprise risk rating</div>
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {simResult.baseline?.supply_guard_score}
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    {simResult.scenario?.supply_guard_score}
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem' }}>
                    <DeltaBadge
                      delta={Number(simResult.changes?.supply_guard_score_change || simResult.delta?.risk_score_delta || 0)}
                      unit=" pts"
                      decimals={1}
                    />
                  </td>
                </tr>

                {/* 2. Disruption Probability */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Disruption Probability
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Calibrated classification probability</div>
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {simResult.baseline?.disruption_probability_percent}%
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    {simResult.scenario?.disruption_probability_percent}%
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem' }}>
                    <DeltaBadge
                      delta={Number(simResult.changes?.disruption_probability_change_pp || simResult.delta?.disruption_delta_percent || 0)}
                      unit=" pts"
                      decimals={2}
                    />
                  </td>
                </tr>

                {/* 3. Predicted Delay */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Predicted Delay
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Baseline transit: {baselineTransit} days</div>
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {simResult.baseline?.predicted_delay_days} days
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    {simResult.scenario?.predicted_delay_days} days
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem' }}>
                    <DeltaBadge
                      delta={Number(simResult.changes?.predicted_delay_change_days || simResult.delta?.delay_delta_days || 0)}
                      unit=" days"
                      decimals={2}
                    />
                  </td>
                </tr>

                {/* 4. Freight Cost */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Freight Cost
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                      USD Model Prediction &amp; Converted ({displayCurrency})
                    </div>
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    ${Number(simResult.baseline?.predicted_freight_cost_usd || 0).toLocaleString()} USD
                    {simResult.baseline?.display_freight_cost && simResult.baseline?.display_freight_cost !== `$${Number(simResult.baseline?.predicted_freight_cost_usd || 0).toLocaleString()}` && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: '0.4rem' }}>
                        ({simResult.baseline?.display_freight_cost})
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    ${Number(simResult.scenario?.predicted_freight_cost_usd || 0).toLocaleString()} USD
                    {simResult.scenario?.display_freight_cost && simResult.scenario?.display_freight_cost !== `$${Number(simResult.scenario?.predicted_freight_cost_usd || 0).toLocaleString()}` && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: '0.4rem' }}>
                        ({simResult.scenario?.display_freight_cost})
                      </span>
                    )}
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem' }}>
                    <DeltaBadge
                      delta={Number(simResult.changes?.predicted_freight_cost_change_usd || simResult.delta?.freight_delta_usd || 0)}
                      prefix="$"
                      unit=" USD"
                      decimals={0}
                    />
                  </td>
                </tr>

                {/* 5. Estimated Arrival */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Estimated Arrival
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Destination Local Timezone</div>
                  </td>
                  <td className="mono" style={{ color: 'var(--text-muted)', padding: '0.65rem 0.85rem' }}>
                    {simResult.baseline?.estimated_arrival || simResult.baseline?.timeline?.arrival_local?.formatted || 'Calculated'}
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    {simResult.scenario?.estimated_arrival || simResult.scenario?.timeline?.arrival_local?.formatted || 'Calculated'}
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem' }}>
                    {(simResult.changes?.predicted_delay_change_days || 0) > 0
                      ? <span style={{ color: '#f87171' }}>+{simResult.changes?.predicted_delay_change_days}d arrival shift</span>
                      : <span style={{ color: 'var(--text-muted)' }}>On schedule</span>}
                  </td>
                </tr>

                {/* 6. Volume at Risk */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Volume at Risk
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Trade volume × Disruption probability</div>
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {Number(simResult.baseline?.estimated_volume_at_risk_tonnes || 0).toLocaleString()} tonnes
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    {Number(simResult.scenario?.estimated_volume_at_risk_tonnes || 0).toLocaleString()} tonnes
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem' }}>
                    <DeltaBadge
                      delta={Number(simResult.changes?.volume_at_risk_delta_tonnes || 0)}
                      unit=" t"
                      decimals={0}
                    />
                  </td>
                </tr>

                {/* 7. Freight Exposure */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Freight Exposure
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Predicted freight × Disruption probability</div>
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    ${Number(simResult.baseline?.estimated_freight_cost_exposure_usd || 0).toLocaleString()} USD
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    ${Number(simResult.scenario?.estimated_freight_cost_exposure_usd || 0).toLocaleString()} USD
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem' }}>
                    <DeltaBadge
                      delta={Number(simResult.scenario?.estimated_freight_cost_exposure_usd || 0) - Number(simResult.baseline?.estimated_freight_cost_exposure_usd || 0)}
                      prefix="$"
                      unit=" USD"
                      decimals={0}
                    />
                  </td>
                </tr>

                {/* 8. Ripple Risk */}
                <tr>
                  <td style={{ fontWeight: 500, padding: '0.65rem 0.85rem', color: '#f5f5f5' }}>
                    Ripple Risk Score
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Multi-order network connectivity score</div>
                  </td>
                  <td className="mono" style={{ padding: '0.65rem 0.85rem', color: 'var(--text-muted)' }}>
                    {simResult.baseline?.ripple_risk_score !== null && simResult.baseline?.ripple_risk_score !== undefined
                      ? `${simResult.baseline?.ripple_risk_score} / 100`
                      : 'N/A (Custom Route)'}
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem', color: '#ffffff' }}>
                    {simResult.scenario?.ripple_risk_score !== null && simResult.scenario?.ripple_risk_score !== undefined
                      ? `${simResult.scenario?.ripple_risk_score} / 100`
                      : 'N/A (Custom Route)'}
                  </td>
                  <td className="mono" style={{ fontWeight: 600, padding: '0.65rem 0.85rem' }}>
                    {simResult.changes?.ripple_risk_change
                      ? <DeltaBadge delta={simResult.changes.ripple_risk_change} unit=" pts" decimals={1} />
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENARIO EXPLANATION — WHAT CHANGED?                                      */}
      {/* ========================================================================= */}
      {simResult && (
        <div
          className="card"
          style={{
            background: 'rgba(10, 10, 10, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 2,
            padding: '1.25rem 1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
            <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#f5f5f5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Scenario Explanation &amp; ML Variance Summary
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
            {simResult.explanation_lines && simResult.explanation_lines.length > 0 ? (
              simResult.explanation_lines.map((line: string, idx: number) => {
                const isSummary = line.includes('Under this scenario');
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.6rem',
                      background: isSummary ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.015)',
                      padding: isSummary ? '0.65rem 0.85rem' : '0.4rem 0.65rem',
                      borderRadius: 2,
                      border: isSummary ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.03)',
                      marginTop: isSummary ? '0.35rem' : '0'
                    }}
                  >
                    <span style={{ color: isSummary ? '#ffffff' : 'var(--text-dim)', fontWeight: 600, marginTop: '0.1rem' }}>
                      {isSummary ? '•' : '—'}
                    </span>
                    <span style={{ fontWeight: isSummary ? 500 : 400, color: isSummary ? '#ffffff' : 'var(--text-muted)' }}>
                      {line}
                    </span>
                  </div>
                );
              })
            ) : (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                {simResult.explanation || 'Under this scenario, the machine learning models recalculated disruption probability, transit delay, and freight exposure.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
