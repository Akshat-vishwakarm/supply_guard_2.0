import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  PlusCircle,
  Ship,
  Truck,
  Building,
  Package,
  Calendar,
  Clock,
  MapPin,
  Anchor,
  Navigation,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Sliders,
  DollarSign,
  Cloud,
  Shield,
  Upload,
  Database,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck
} from 'lucide-react';
import {
  DashboardKpis,
  PortItem,
  TransitEstimate,
  ShipmentRiskRequest,
  PredictResponse
} from '../types/supplyGuard';
import { KpiCard } from '../components/KpiCard';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';

export const resolvePortFromInput = (search: string, ports: PortItem[]): PortItem | null => {
  if (!search || !search.trim()) return null;
  const q = search.toLowerCase().trim();
  const byCode = ports.find((p) => p.port_code.toLowerCase() === q);
  if (byCode) return byCode;
  const byExactCity = ports.find((p) => p.city.toLowerCase() === q);
  if (byExactCity) return byExactCity;
  const byExactName = ports.find((p) => p.port_name.toLowerCase() === q);
  if (byExactName) return byExactName;
  const byLabel = ports.find(
    (p) => `${p.port_name} (${p.city}, ${p.country})`.toLowerCase() === q
  );
  if (byLabel) return byLabel;
  const byCityCountry = ports.find(
    (p) => q.includes(p.city.toLowerCase()) && q.includes(p.country.toLowerCase())
  );
  if (byCityCountry) return byCityCountry;
  const byCityInQ = ports.find((p) => q.includes(p.city.toLowerCase()));
  if (byCityInQ) return byCityInQ;
  const byPortName = ports.find(
    (p) => p.port_name.toLowerCase().includes(q) || q.includes(p.port_name.toLowerCase())
  );
  if (byPortName) return byPortName;
  const tokens = q.split(/[\s,]+/).filter(Boolean);
  if (tokens.length > 0) {
    const byTokens = ports.find((p) => {
      const full = `${p.port_name} ${p.city} ${p.country} ${p.port_code}`.toLowerCase();
      return tokens.every((t) => full.includes(t));
    });
    if (byTokens) return byTokens;
  }
  return null;
};

export const filterPorts = (search: string, ports: PortItem[]): PortItem[] => {
  if (!search || !search.trim()) return ports;
  const q = search.toLowerCase().trim();
  const tokens = q.split(/[\s,]+/).filter(Boolean);
  return ports.filter((p) => {
    const full = `${p.port_name} ${p.city} ${p.country} ${p.port_code}`.toLowerCase();
    if (full.includes(q) || q.includes(p.city.toLowerCase()) || q.includes(p.port_name.toLowerCase())) {
      return true;
    }
    return tokens.every((t) => full.includes(t));
  });
};

const VALIDATION_SHIPMENT: ShipmentRiskRequest = {
  supplier_company: 'Maersk Line Logix',
  customer_company: 'Apex Advanced Manufacturing',
  receiving_company: 'Apex Advanced Manufacturing',
  product_name: 'Lithium-Ion Polymer Cathode Assemblies (Class 9 HazMat)',
  quantity: 500,
  quantity_unit: 'Units',
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
  departure_date: '2026-10-10',
  departure_time: '10:00',
  shipment_status: 'Normal',
  current_delay_days: 0,
  overrides: {}
};

const DEMO_SHIPMENT: ShipmentRiskRequest = {
  supplier_company: 'ADFS Global Logistics',
  customer_company: 'ASD Industrial Assemblies',
  product_name: 'Industrial Assemblies & Drive Units (HS 8479.89)',
  quantity: 20000,
  quantity_unit: 'Units',
  shipment_weight: 20000,
  weight_unit: 'kg',
  shipment_value: 1250000,
  currency: 'USD',
  origin_port: 'Port of Brisbane',
  destination_port: 'Port of Santos',
  origin_country: 'Australia',
  origin_city: 'Brisbane',
  destination_country: 'Brazil',
  destination_city: 'Santos',
  departure_date: '2026-10-29',
  departure_time: '10:00',
  shipment_status: 'Normal',
  current_delay_days: 0,
  overrides: {}
};

interface OverviewProps {
  kpis: DashboardKpis | null;
  loading: boolean;
  onSelectRoute: (routeId: string) => void;
  onNavigate: (page: any) => void;
  onUploadCsv: (file: File) => void;
  onLoadDemo: () => void;
  isProcessing: boolean;
  activePrediction?: PredictResponse | null;
  onPredictionChange?: (pred: any) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  kpis,
  loading,
  onSelectRoute,
  onNavigate,
  onUploadCsv,
  onLoadDemo,
  isProcessing,
  activePrediction,
  onPredictionChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Registered Ports Directory
  const [registeredPorts, setRegisteredPorts] = useState<PortItem[]>([]);
  const [loadingPorts, setLoadingPorts] = useState<boolean>(true);

  // Section A: Shipment & Company Information (Fresh on startup)
  const [supplierCompany, setSupplierCompany] = useState<string>('');
  const [customerCompany, setCustomerCompany] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [quantityUnit, setQuantityUnit] = useState<string>('Units');
  const [shipmentWeight, setShipmentWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<string>('kg');
  const [shipmentValue, setShipmentValue] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');

  // Section B: Route Information (Fresh on startup)
  const [originSearch, setOriginSearch] = useState<string>('');
  const [selectedOriginPort, setSelectedOriginPort] = useState<PortItem | null>(null);
  const [showOriginDropdown, setShowOriginDropdown] = useState<boolean>(false);

  const [destSearch, setDestSearch] = useState<string>('');
  const [selectedDestPort, setSelectedDestPort] = useState<PortItem | null>(null);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);

  // Auto-derived transit & corridor physics
  const [transitEstimate, setTransitEstimate] = useState<TransitEstimate | null>(null);
  const [loadingTransit, setLoadingTransit] = useState<boolean>(false);

  // Section C: Shipment Schedule
  const [departureDate, setDepartureDate] = useState<string>('2026-10-10');
  const [departureTime, setDepartureTime] = useState<string>('10:00');

  // Section D: Shipment Status
  const [shipmentStatus, setShipmentStatus] = useState<'Normal' | 'Delayed' | 'Disrupted'>('Normal');
  const [currentDelayDays, setCurrentDelayDays] = useState<string>('');
  const [disruptionReason, setDisruptionReason] = useState<string>('');

  // Section E: Optional Advanced Risk Overrides
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [overrideMode, setOverrideMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [overrideCongestion, setOverrideCongestion] = useState<number>(50);
  const [overrideWeather, setOverrideWeather] = useState<number>(35);
  const [overrideGeopolitical, setOverrideGeopolitical] = useState<number>(35);
  const [overrideContainer, setOverrideContainer] = useState<number>(55);
  const [overrideFuel, setOverrideFuel] = useState<number>(65);
  const [overrideCommodity, setOverrideCommodity] = useState<number>(45);

  // Section F: Weather Previews
  const [originWeatherPreview, setOriginWeatherPreview] = useState<any>(null);
  const [destWeatherPreview, setDestWeatherPreview] = useState<any>(null);

  // Action & State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const originRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  // Load registered ports
  useEffect(() => {
    async function loadPorts() {
      try {
        const res = await api.getPorts();
        setRegisteredPorts(res.ports);
      } catch (err) {
        console.error('Failed to load ports directory:', err);
      } finally {
        setLoadingPorts(false);
      }
    }
    loadPorts();
  }, []);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (originRef.current && !originRef.current.contains(e.target as Node)) {
        setShowOriginDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDestDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update transit estimate when origin & dest are selected
  useEffect(() => {
    if (selectedOriginPort && selectedDestPort) {
      setLoadingTransit(true);
      api
        .getTransitEstimate({
          origin_country: selectedOriginPort.country,
          origin_city: selectedOriginPort.city,
          destination_country: selectedDestPort.country,
          destination_city: selectedDestPort.city,
          shipping_method: 'Sea'
        })
        .then((res) => {
          setTransitEstimate(res);
        })
        .catch((err) => console.error('Transit estimate error:', err))
        .finally(() => setLoadingTransit(false));
    } else {
      setTransitEstimate(null);
    }
  }, [selectedOriginPort, selectedDestPort]);

  // Update weather preview when origin/dest and departure date change
  useEffect(() => {
    if (!departureDate) return;

    if (selectedOriginPort) {
      api
        .predictWeather({
          country: selectedOriginPort.country,
          city: selectedOriginPort.city,
          prediction_date: departureDate
        })
        .then((res) => setOriginWeatherPreview(res))
        .catch(() => setOriginWeatherPreview(null));
    } else {
      setOriginWeatherPreview(null);
    }

    if (selectedDestPort) {
      const dep = new Date(`${departureDate}T${departureTime || '10:00'}:00`);
      const transitDays = transitEstimate?.baseline_transit_days || 17.2;
      const arr = new Date(dep.getTime() + transitDays * 24 * 60 * 60 * 1000);
      const arrDateStr = !isNaN(arr.getTime()) ? arr.toISOString().split('T')[0] : departureDate;

      api
        .predictWeather({
          country: selectedDestPort.country,
          city: selectedDestPort.city,
          prediction_date: arrDateStr
        })
        .then((res) => setDestWeatherPreview(res))
        .catch(() => setDestWeatherPreview(null));
    } else {
      setDestWeatherPreview(null);
    }
  }, [selectedOriginPort, selectedDestPort, departureDate, departureTime, transitEstimate]);

  const handleLoadPreset1 = () => {
    setSupplierCompany(VALIDATION_SHIPMENT.supplier_company);
    setCustomerCompany(VALIDATION_SHIPMENT.customer_company);
    setProductName(VALIDATION_SHIPMENT.product_name);
    setQuantity(String(VALIDATION_SHIPMENT.quantity));
    setQuantityUnit(VALIDATION_SHIPMENT.quantity_unit || 'Units');
    setShipmentWeight(String(VALIDATION_SHIPMENT.shipment_weight));
    setWeightUnit(VALIDATION_SHIPMENT.weight_unit || 'kg');
    setShipmentValue(String(VALIDATION_SHIPMENT.shipment_value || 5000000));
    setCurrency(VALIDATION_SHIPMENT.currency || 'USD');
    setDepartureDate('2026-10-10');
    setDepartureTime('10:00');
    setShipmentStatus('Normal');
    const yoko = registeredPorts.find((p) => p.city.toLowerCase() === 'yokohama');
    const la = registeredPorts.find((p) => p.city.toLowerCase() === 'los angeles');
    if (yoko) {
      setSelectedOriginPort(yoko);
      setOriginSearch(`${yoko.port_name} (${yoko.city}, ${yoko.country})`);
    }
    if (la) {
      setSelectedDestPort(la);
      setDestSearch(`${la.port_name} (${la.city}, ${la.country})`);
    }
    setErrorMsg('');
  };

  const handleLoadPreset2 = () => {
    setSupplierCompany(DEMO_SHIPMENT.supplier_company);
    setCustomerCompany(DEMO_SHIPMENT.customer_company);
    setProductName(DEMO_SHIPMENT.product_name);
    setQuantity(String(DEMO_SHIPMENT.quantity));
    setQuantityUnit(DEMO_SHIPMENT.quantity_unit || 'Units');
    setShipmentWeight(String(DEMO_SHIPMENT.shipment_weight));
    setWeightUnit(DEMO_SHIPMENT.weight_unit || 'kg');
    setShipmentValue(String(DEMO_SHIPMENT.shipment_value || 1250000));
    setCurrency(DEMO_SHIPMENT.currency || 'USD');
    setDepartureDate('2026-10-29');
    setDepartureTime('10:00');
    setShipmentStatus('Normal');
    const brisbane = registeredPorts.find((p) => p.city.toLowerCase() === 'brisbane');
    const santos = registeredPorts.find((p) => p.city.toLowerCase() === 'santos');
    if (brisbane) {
      setSelectedOriginPort(brisbane);
      setOriginSearch(`${brisbane.port_name} (${brisbane.city}, ${brisbane.country})`);
    }
    if (santos) {
      setSelectedDestPort(santos);
      setDestSearch(`${santos.port_name} (${santos.city}, ${santos.country})`);
    }
    setErrorMsg('');
  };

  const handleResetForm = () => {
    setSupplierCompany('');
    setCustomerCompany('');
    setProductName('');
    setQuantity('');
    setShipmentWeight('');
    setShipmentValue('');
    setSelectedOriginPort(null);
    setOriginSearch('');
    setSelectedDestPort(null);
    setDestSearch('');
    setErrorMsg('');
  };

  const filteredOriginPorts = filterPorts(originSearch, registeredPorts);
  const filteredDestPorts = filterPorts(destSearch, registeredPorts);

  const handleOriginChange = (val: string) => {
    setOriginSearch(val);
    setShowOriginDropdown(true);
    const matched = resolvePortFromInput(val, registeredPorts);
    setSelectedOriginPort(matched);
  };

  const handleDestChange = (val: string) => {
    setDestSearch(val);
    setShowDestDropdown(true);
    const matched = resolvePortFromInput(val, registeredPorts);
    setSelectedDestPort(matched);
  };

  // Execute Main Action: [ ANALYZE SHIPMENT RISK ]
  const handleAnalyzeShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Auto-resolve port objects from user input or selection
    const originPortObj = selectedOriginPort || resolvePortFromInput(originSearch, registeredPorts);
    const destPortObj = selectedDestPort || resolvePortFromInput(destSearch, registeredPorts);

    if (!supplierCompany.trim()) {
      setErrorMsg('Please enter the origin consignor / supplier company.');
      return;
    }
    if (!customerCompany.trim()) {
      setErrorMsg('Please enter the receiving company / enterprise.');
      return;
    }
    if (!productName.trim()) {
      setErrorMsg('Please enter the commercial product or item description.');
      return;
    }
    const parsedQuantity = parseFloat(quantity);
    if (!quantity || isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMsg('Please enter a valid batch quantity greater than 0.');
      return;
    }
    const parsedWeight = parseFloat(shipmentWeight);
    if (!shipmentWeight || isNaN(parsedWeight) || parsedWeight <= 0) {
      setErrorMsg('Please enter a valid gross payload mass / weight greater than 0.');
      return;
    }
    if (!originSearch.trim() && !originPortObj) {
      setErrorMsg('Please enter or select an origin port of departure.');
      return;
    }
    if (!destSearch.trim() && !destPortObj) {
      setErrorMsg('Please enter or select a destination port of entry.');
      return;
    }
    if (!departureDate) {
      setErrorMsg('Please select a valid departure date.');
      return;
    }

    const resolvedOrigin = originPortObj || {
      port_code: 'CUSTOM',
      port_name: originSearch.trim(),
      city: originSearch.split(',')[0].trim(),
      country: originSearch.split(',')[1]?.trim() || 'Unknown',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      currency: currency || 'USD',
      tz_abbr: 'UTC',
      display_label: originSearch.trim()
    };

    const resolvedDest = destPortObj || {
      port_code: 'CUSTOM',
      port_name: destSearch.trim(),
      city: destSearch.split(',')[0].trim(),
      country: destSearch.split(',')[1]?.trim() || 'Unknown',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      currency: currency || 'USD',
      tz_abbr: 'UTC',
      display_label: destSearch.trim()
    };

    setIsSubmitting(true);

    try {
      const payload: ShipmentRiskRequest = {
        supplier_company: supplierCompany.trim(),
        customer_company: customerCompany.trim(),
        receiving_company: customerCompany.trim(),
        product_name: productName.trim(),
        quantity: parsedQuantity,
        quantity_unit: quantityUnit.trim() || 'Units',
        shipment_weight: parsedWeight,
        weight_unit: weightUnit.trim() || 'kg',
        commercial_value: shipmentValue ? parseFloat(shipmentValue) : undefined,
        shipment_value: shipmentValue ? parseFloat(shipmentValue) : undefined,
        currency: currency || 'USD',
        origin_port: resolvedOrigin.port_name,
        origin_country: resolvedOrigin.country,
        origin_city: resolvedOrigin.city,
        destination_port: resolvedDest.port_name,
        destination_country: resolvedDest.country,
        destination_city: resolvedDest.city,
        origin: {
          port: resolvedOrigin.port_name,
          city: resolvedOrigin.city,
          country: resolvedOrigin.country,
          latitude: resolvedOrigin.latitude,
          longitude: resolvedOrigin.longitude
        },
        destination: {
          port: resolvedDest.port_name,
          city: resolvedDest.city,
          country: resolvedDest.country,
          latitude: resolvedDest.latitude,
          longitude: resolvedDest.longitude
        },
        departure_date: departureDate,
        departure_time: departureTime || '10:00',
        shipment_status: shipmentStatus,
        current_delay_days: shipmentStatus === 'Delayed' ? (parseFloat(currentDelayDays) || 0) : 0,
        disruption_reason: shipmentStatus === 'Disrupted' ? (disruptionReason.trim() || undefined) : undefined,
        overrides: overrideMode === 'MANUAL' ? {
          port_congestion: overrideCongestion,
          port_congestion_index: overrideCongestion,
          weather_risk: overrideWeather,
          weather_disruption_score: overrideWeather,
          geopolitical_risk: overrideGeopolitical,
          geopolitical_risk_score: overrideGeopolitical,
          container_availability: overrideContainer,
          container_availability_index: overrideContainer,
          fuel_cost: overrideFuel,
          fuel_cost_index: overrideFuel,
          commodity_price: overrideCommodity,
          commodity_price_index: overrideCommodity
        } : {}
      };

      const result = await api.analyzeShipment(payload);
      if (onPredictionChange) {
        onPredictionChange(result);
      }
      onNavigate('risk');
    } catch (err: any) {
      console.error('Shipment risk evaluation error:', err);
      setErrorMsg(err.message || 'Failed to complete shipment risk evaluation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoaded = Boolean(kpis?.is_loaded);

  return (
    <div className="page-container">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE TELEMETRY COMMAND BAR (Top 8 KPI Pods)                      */}
      {/* ========================================================================= */}
      <div className="page-header">
        <div className="page-overline">
          <span>OPERATIONAL MATRIX</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span>COMMAND TOWER V2.0</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span style={{ color: '#FFFFFF' }}>EXECUTIVE TELEMETRY</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h1 className="page-title">Executive Command Center</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.70rem', color: 'var(--text-muted)' }}>
            <span>MODEL: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>{kpis?.model_version || 'LightGBM-v1'}</strong></span>
            <span>STATUS: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>{kpis?.system_status || 'READY FOR ANALYSIS'}</strong></span>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label="TOTAL CORRIDORS"
          value={isLoaded ? (kpis?.total_routes || 50) : '—'}
          subtext="Monitored Lanes"
        />
        <KpiCard
          label="CRITICAL THREATS"
          value={isLoaded ? (kpis?.critical_routes ?? 0) : '0'}
          subtext="Score ≥ 70 / 100"
          variant={isLoaded && (kpis?.critical_routes ?? 0) > 0 ? 'critical' : 'default'}
        />
        <KpiCard
          label="HIGH RISK LANES"
          value={isLoaded ? (kpis?.high_risk_routes ?? 3) : '0'}
          subtext="Score ≥ 50 / 100"
          variant={isLoaded && (kpis?.high_risk_routes ?? 0) > 0 ? 'high' : 'default'}
        />
        <KpiCard
          label="MEAN PREDICTED DELAY"
          value={isLoaded ? `+${(kpis?.avg_predicted_delay_days || 7.2).toFixed(1)}` : '—'}
          unit="days"
          subtext="LightGBM Regressor"
        />
        <KpiCard
          label="DISRUPTION PROB"
          value={isLoaded ? `${(kpis?.avg_disruption_probability_percent || 19.2).toFixed(1)}%` : '—'}
          subtext="P(Delay ≥ 12d)"
        />
        <KpiCard
          label="VOLUME AT RISK"
          value={isLoaded ? `${Math.round((kpis?.estimated_volume_at_risk_tonnes || 34210) / 1000)}k` : '—'}
          unit="tonnes"
          subtext="Trade Vol × P(Disrupt)"
        />
        <KpiCard
          label="FREIGHT EXPOSURE"
          value={isLoaded ? `$${((kpis?.estimated_freight_cost_exposure_usd || 1845000) / 1000000).toFixed(2)}M` : '—'}
          subtext="Statistical Exposure"
        />
        <KpiCard
          label="RIPPLE NETWORK RISK"
          value={isLoaded ? (kpis?.avg_ripple_risk || 34.6).toFixed(1) : '—'}
          unit="/ 100"
          subtext="Cascade Vulnerability"
        />
      </div>

      {/* ========================================================================= */}
      {/* 2. CREATE SHIPMENT & CONFIGURE RISK ANALYSIS (Inspired by Stitch Screen 3)*/}
      {/* ========================================================================= */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        {/* Command Header & Breadcrumb Matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div className="page-overline">
            <span>Maritime Logistics Node</span>
            <span style={{ opacity: 0.3 }}>/</span>
            <span>Transit Protocol 88-ALPHA</span>
            <span style={{ opacity: 0.3 }}>/</span>
            <span style={{ color: '#FFFFFF' }}>Risk Profiling Engine</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
                Create Shipment &amp; Configure Risk Analysis
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-body)', marginTop: '2px' }}>
                Precision trajectory modeling, telemetric route profiling, and oceanic predictive threat calculation.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLoadPreset1}
                title="Load Yokohama → Los Angeles manifest"
              >
                <FileCheck size={13} />
                <span>Trans-Pacific Arc</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLoadPreset2}
                title="Load Brisbane → Santos manifest"
              >
                <FileCheck size={13} />
                <span>Oceania-LATAM Arc</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetForm}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.76rem',
              marginBottom: '1rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAnalyzeShipment}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* ----------------------------------------------------------------- */}
            {/* Section A: Entity Manifest & Cargo Specs                          */}
            {/* ----------------------------------------------------------------- */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-xs)',
                padding: '1.15rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
                  SECTION A // ENTITY MANIFEST &amp; CARGO
                </span>
                <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>ID-7729-NEXUS</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label>ORIGIN CONSIGNOR / CARRIER</label>
                    <input
                      type="text"
                      value={supplierCompany}
                      onChange={(e) => setSupplierCompany(e.target.value)}
                      placeholder="e.g. Maersk Line Logix"
                    />
                  </div>
                  <div>
                    <label>RECEIVING ENTERPRISE</label>
                    <input
                      type="text"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      placeholder="e.g. Apex Advanced Mfg"
                    />
                  </div>
                </div>

                <div>
                  <label>COMMERCIAL PRODUCT SPECIFICATION</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Lithium-Ion Cathodes (Class 9)"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label>BATCH QUANTITY</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="50"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={quantityUnit}
                        onChange={(e) => setQuantityUnit(e.target.value)}
                        placeholder="TEU"
                        style={{ width: '80px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label>GROSS PAYLOAD MASS</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="number"
                        value={shipmentWeight}
                        onChange={(e) => setShipmentWeight(e.target.value)}
                        placeholder="15000"
                        style={{ flex: 1 }}
                      />
                      <input
                        type="text"
                        value={weightUnit}
                        onChange={(e) => setWeightUnit(e.target.value)}
                        placeholder="kg"
                        style={{ width: '60px' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label>DECLARED CARGO CAPITALIZATION</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="number"
                      value={shipmentValue}
                      onChange={(e) => setShipmentValue(e.target.value)}
                      placeholder="5000000"
                      style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      style={{ width: '80px', fontFamily: 'var(--font-mono)' }}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="JPY">JPY</option>
                      <option value="GBP">GBP</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* Section B: Maritime Spatial Trajectory                            */}
            {/* ----------------------------------------------------------------- */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-xs)',
                padding: '1.15rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
                  SECTION B // MARITIME SPATIAL TRAJECTORY
                </span>
                <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  {transitEstimate?.trade_route_type || 'TRANSPACIFIC ARC'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Origin Port Search */}
                <div ref={originRef} style={{ position: 'relative' }}>
                  <label>PORT OF DEPARTURE (ORIGIN NODE)</label>
                  <input
                    type="text"
                    value={originSearch}
                    onChange={(e) => handleOriginChange(e.target.value)}
                    onFocus={() => setShowOriginDropdown(true)}
                    placeholder="Search departure port (e.g. Yokohama, Shanghai)..."
                  />
                  {showOriginDropdown && filteredOriginPorts.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 30,
                        background: 'rgba(10, 10, 10, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}
                    >
                      {filteredOriginPorts.map((p) => (
                        <div
                          key={p.port_code}
                          style={{
                            padding: '0.45rem 0.65rem',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                          onClick={() => {
                            setSelectedOriginPort(p);
                            setOriginSearch(`${p.port_name} (${p.city}, ${p.country})`);
                            setShowOriginDropdown(false);
                          }}
                        >
                          <span style={{ color: '#FFFFFF' }}>{p.port_name} ({p.city}, {p.country})</span>
                          <span className="mono" style={{ color: 'var(--text-muted)' }}>{p.port_code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedOriginPort && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      <span>LAT {selectedOriginPort.latitude?.toFixed(3)}°</span>
                      <span>LON {selectedOriginPort.longitude?.toFixed(3)}°</span>
                    </div>
                  )}
                </div>

                {/* Destination Port Search */}
                <div ref={destRef} style={{ position: 'relative' }}>
                  <label>PORT OF ENTRY (ARRIVAL NODE)</label>
                  <input
                    type="text"
                    value={destSearch}
                    onChange={(e) => handleDestChange(e.target.value)}
                    onFocus={() => setShowDestDropdown(true)}
                    placeholder="Search arrival port (e.g. Los Angeles, Santos)..."
                  />
                  {showDestDropdown && filteredDestPorts.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 30,
                        background: 'rgba(10, 10, 10, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        marginTop: '2px'
                      }}
                    >
                      {filteredDestPorts.map((p) => (
                        <div
                          key={p.port_code}
                          style={{
                            padding: '0.45rem 0.65rem',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            display: 'flex',
                            justifyContent: 'space-between'
                          }}
                          onClick={() => {
                            setSelectedDestPort(p);
                            setDestSearch(`${p.port_name} (${p.city}, ${p.country})`);
                            setShowDestDropdown(false);
                          }}
                        >
                          <span style={{ color: '#FFFFFF' }}>{p.port_name} ({p.city}, {p.country})</span>
                          <span className="mono" style={{ color: 'var(--text-muted)' }}>{p.port_code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedDestPort && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      <span>LAT {selectedDestPort.latitude?.toFixed(3)}°</span>
                      <span>LON {selectedDestPort.longitude?.toFixed(3)}°</span>
                    </div>
                  )}
                </div>

                {/* Auto-derived Corridor Parameters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div>
                    <label>GEODESIC DISTANCE</label>
                    <div className="mono" style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>
                      {loadingTransit ? 'Calculating...' : (transitEstimate?.distance_km ? `${Number(transitEstimate.distance_km).toLocaleString()} km` : '—')}
                    </div>
                  </div>
                  <div>
                    <label>BASELINE TRANSIT</label>
                    <div className="mono" style={{ fontSize: '0.95rem', color: '#FFFFFF' }}>
                      {loadingTransit ? 'Calculating...' : (transitEstimate?.baseline_transit_days ? `${transitEstimate.baseline_transit_days} days` : '—')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* Section C: Schedule & Atmospheric Telemetry                      */}
            {/* ----------------------------------------------------------------- */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-xs)',
                padding: '1.15rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', paddingBottom: '0.45rem', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
                  SECTION C // TEMPORAL WINDOW &amp; ATMOSPHERE
                </span>
                <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>UTC RECONCILED</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label>DEPARTURE DATE</label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>DEPARTURE TIME</label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label>OPERATIONAL STATUS PROFILE</label>
                  <select
                    value={shipmentStatus}
                    onChange={(e: any) => setShipmentStatus(e.target.value)}
                  >
                    <option value="Normal">Normal — Slot Verified</option>
                    <option value="Delayed">Delayed — Queueing at Berth</option>
                    <option value="Disrupted">Disrupted — Bottleneck Diverted</option>
                  </select>
                </div>

                {shipmentStatus === 'Delayed' && (
                  <div>
                    <label>CURRENT ACCRUED DELAY (DAYS)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={currentDelayDays}
                      onChange={(e) => setCurrentDelayDays(e.target.value)}
                      placeholder="e.g. 3.5"
                    />
                  </div>
                )}

                {shipmentStatus === 'Disrupted' && (
                  <div>
                    <label>DISRUPTION EVENT REASON</label>
                    <input
                      type="text"
                      value={disruptionReason}
                      onChange={(e) => setDisruptionReason(e.target.value)}
                      placeholder="e.g. Typhoon avoidance route diversion"
                    />
                  </div>
                )}

                {/* Weather Preview readout */}
                <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '0.65rem', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>ORIGIN WEATHER:</span>
                    <span style={{ color: '#FFFFFF' }}>
                      {originWeatherPreview?.prediction
                        ? `${originWeatherPreview.weather_emoji || ''} ${originWeatherPreview.prediction} (Risk: ${originWeatherPreview.weather_disruption_score}/100)`
                        : (selectedOriginPort ? 'Fetching forecast...' : 'Select departure port')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                    <span>DESTINATION WEATHER:</span>
                    <span style={{ color: '#FFFFFF' }}>
                      {destWeatherPreview?.prediction
                        ? `${destWeatherPreview.weather_emoji || ''} ${destWeatherPreview.prediction} (Risk: ${destWeatherPreview.weather_disruption_score}/100)`
                        : (selectedDestPort ? 'Fetching forecast...' : 'Select arrival port')}
                    </span>
                  </div>
                </div>

                {/* Toggle Advanced Override Engine */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                  >
                    <span>{showAdvanced ? '− Hide Environmental Vector Overrides' : '+ Advanced Environmental Vector Overrides'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Advanced Environmental Slider Overrides */}
          {showAdvanced && (
            <div
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-xs)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  FEATURE OVERRIDE ENGINE (LIGHTGBM INFERENCE)
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={`btn ${overrideMode === 'AUTO' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ height: '24px', fontSize: '10px' }}
                    onClick={() => setOverrideMode('AUTO')}
                  >
                    AUTO MODE
                  </button>
                  <button
                    type="button"
                    className={`btn ${overrideMode === 'MANUAL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ height: '24px', fontSize: '10px' }}
                    onClick={() => setOverrideMode('MANUAL')}
                  >
                    MANUAL OVERRIDES
                  </button>
                </div>
              </div>

              {overrideMode === 'MANUAL' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label>CONGESTION: {overrideCongestion}/100</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={overrideCongestion}
                      onChange={(e) => setOverrideCongestion(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label>WEATHER THREAT: {overrideWeather}/100</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={overrideWeather}
                      onChange={(e) => setOverrideWeather(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label>GEOPOLITICAL: {overrideGeopolitical}/100</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={overrideGeopolitical}
                      onChange={(e) => setOverrideGeopolitical(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label>CONTAINER AVAILABILITY: {overrideContainer}/100</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={overrideContainer}
                      onChange={(e) => setOverrideContainer(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Primary Action Submission Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              PIPELINE: LIGHTGBM DISRUPTION + DELAY + FREIGHT REGRESSORS
            </span>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ padding: '0.45rem 1.4rem', height: '36px', fontSize: '0.82rem' }}
            >
              <span>{isSubmitting ? 'EXECUTING INFERENCE...' : 'CALCULATE & PROFILE SHIPMENT RISK →'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 3. GLOBAL CORRIDOR RISK DIRECTORY & DISTRIBUTION                          */}
      {/* ========================================================================= */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.65rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              PORTFOLIO RISK DISTRIBUTION &amp; CRITICAL CORRIDORS
            </span>
            <div style={{ fontSize: '0.92rem', fontWeight: 400, color: '#FFFFFF', marginTop: '2px' }}>
              Top Priority High Risk Corridors
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('routes')}
          >
            <span>View All 50 Corridors →</span>
          </button>
        </div>

        {/* Minimalist Risk Distribution Track */}
        {kpis?.risk_distribution && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1px', overflow: 'hidden' }}>
              <div style={{ width: `${(kpis.risk_distribution.LOW / (kpis.total_routes || 50)) * 100}%`, background: '#10B981' }} title={`Low: ${kpis.risk_distribution.LOW}`} />
              <div style={{ width: `${(kpis.risk_distribution.MEDIUM / (kpis.total_routes || 50)) * 100}%`, background: '#F59E0B' }} title={`Medium: ${kpis.risk_distribution.MEDIUM}`} />
              <div style={{ width: `${(kpis.risk_distribution.HIGH / (kpis.total_routes || 50)) * 100}%`, background: '#F97316' }} title={`High: ${kpis.risk_distribution.HIGH}`} />
              <div style={{ width: `${(kpis.risk_distribution.CRITICAL / (kpis.total_routes || 50)) * 100}%`, background: '#EF4444' }} title={`Critical: ${kpis.risk_distribution.CRITICAL}`} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>LOW: {kpis.risk_distribution.LOW}</span>
              <span>MED: {kpis.risk_distribution.MEDIUM}</span>
              <span>HIGH: {kpis.risk_distribution.HIGH}</span>
              <span>CRIT: {kpis.risk_distribution.CRITICAL}</span>
            </div>
          </div>
        )}

        {/* Top Risk Routes Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>CORRIDOR ROUTE ID</th>
                <th>ORIGIN → DESTINATION</th>
                <th>GUARD SCORE</th>
                <th>P(DISRUPTION)</th>
                <th>PRED. DELAY</th>
                <th>THREAT TIER</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {kpis?.top_risk_routes && kpis.top_risk_routes.length > 0 ? (
                kpis.top_risk_routes.slice(0, 5).map((r) => (
                  <tr key={r.route_id} onClick={() => onSelectRoute(r.route_id)}>
                    <td className="mono" style={{ color: '#FFFFFF', fontWeight: 500 }}>
                      {r.route_id}
                    </td>
                    <td>
                      {r.origin} → {r.destination}
                    </td>
                    <td className="mono" style={{ color: '#FFFFFF', fontWeight: 500 }}>
                      {r.supply_guard_score.toFixed(1)}
                    </td>
                    <td className="mono">
                      {r.disruption_probability_percent.toFixed(1)}%
                    </td>
                    <td className="mono">
                      +{r.predicted_delay_days.toFixed(1)}d
                    </td>
                    <td>
                      <RiskBadge level={r.risk_level} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: '24px', height: '24px' }}
                      >
                        →
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No corridors loaded. Load the demo dataset from the top bar to inspect priority lanes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
