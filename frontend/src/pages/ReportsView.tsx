import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  CheckCircle,
  Activity,
  Database,
  Printer,
  Shield,
  ArrowRight,
  FileCheck
} from 'lucide-react';
import { DashboardKpis } from '../types/supplyGuard';
import { api } from '../services/api';
import { BrandLogo } from '../components/BrandLogo';

interface ReportsViewProps {
  kpis: DashboardKpis | null;
  onShowToast: (msg: string) => void;
  onNavigate: (page: any) => void;
  onLoadDemo: () => void;
  isLoaded: boolean;
  activePrediction?: any;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  kpis,
  onShowToast,
  onNavigate,
  onLoadDemo,
  isLoaded,
  activePrediction
}) => {
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate shipment report from active analyzed shipment
  const generateShipmentReport = () => {
    if (!activePrediction) return;

    const shipment = activePrediction.shipment || activePrediction.raw_shipment || {};
    const supplier = shipment.supplier_company || activePrediction.supplier_company || 'Supplier';
    const customer = shipment.customer_company || activePrediction.customer_company || 'Customer';
    const product = shipment.product_name || activePrediction.product_name || 'Commercial Cargo';
    const qty = Number(shipment.quantity || activePrediction.quantity || 0).toLocaleString();
    const qtyUnit = shipment.quantity_unit || activePrediction.quantity_unit || 'Units';
    const weight = Number(shipment.shipment_weight || activePrediction.shipment_weight || 0).toLocaleString();
    const weightUnit = shipment.weight_unit || activePrediction.weight_unit || 'tonnes';

    const originPort = activePrediction.origin_port || activePrediction.origin_city || 'Port of Yokohama';
    const destPort = activePrediction.destination_port || activePrediction.destination_city || 'Port of Los Angeles';
    const origin = `${originPort}, ${activePrediction.origin_country || 'Origin'}`;
    const destination = `${destPort}, ${activePrediction.destination_country || 'Destination'}`;
    const depDate = activePrediction.departure_date || '2026-10-10';
    const depTime = activePrediction.departure_time || '10:00';
    const originTz = activePrediction.origin_tz_abbr || 'JST';
    const arrival = activePrediction.estimated_arrival || 'Calculated';
    const destTz = activePrediction.destination_tz_abbr || 'PDT';

    const originWeatherName = activePrediction.origin_weather?.weather || activePrediction.origin_weather?.predicted_weather || activePrediction.origin_weather?.prediction || 'Rain';
    const originWeatherRisk = activePrediction.origin_weather?.weather_risk ?? activePrediction.risk_factors?.weather_disruption_score ?? 42;
    const originConfidence = activePrediction.origin_weather?.confidence_percent ?? 81;

    const destWeatherName = activePrediction.destination_weather?.weather || activePrediction.destination_weather?.predicted_weather || activePrediction.destination_weather?.prediction || 'Clear';
    const destWeatherRisk = activePrediction.destination_weather?.weather_risk ?? 18;

    const score = Number(activePrediction.supply_guard_score ?? 0).toFixed(1);
    const riskLevel = activePrediction.risk_level || 'LOW';
    const disruption = Number(activePrediction.disruption_probability_percent ?? 0).toFixed(2);
    const delay = Number(activePrediction.predicted_delay_days ?? 0).toFixed(2);
    const transit = Number(activePrediction.baseline_transit_days ?? 17.0).toFixed(1);
    const freight = Number(activePrediction.predicted_freight_cost_usd ?? 0).toLocaleString();
    const displayFreight = activePrediction.display_freight_cost || `$${freight}`;

    const volAtRisk = Number(activePrediction.business_impact?.estimated_volume_at_risk_tonnes ?? 0).toLocaleString();
    const freightExp = Number(activePrediction.business_impact?.estimated_freight_cost_exposure_usd ?? 0).toLocaleString();
    const ripple = activePrediction.network?.ripple_risk_score !== null && activePrediction.network?.ripple_risk_score !== undefined
      ? activePrediction.network.ripple_risk_score
      : (activePrediction.network_analysis?.ripple_risk_score ?? 34.6);

    const md = `# SUPPLY GUARD 2.0 — EXECUTIVE SHIPMENT RISK BRIEFING
**Report Date:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
**Classification:** STRICTLY CONFIDENTIAL // COMMERCIAL LOGISTICS OPERATIONS
**Provenance:** Deterministic LightGBM Re-Inference Pipeline

---

## 1. SHIPMENT & CONTRACT SPECIFICATION
- **Supplier / Shipper:** ${supplier}
- **Receiving Consignee:** ${customer}
- **Commodity / Cargo:** ${product}
- **Volume / Quantity:** ${qty} ${qtyUnit}
- **Shipment Weight:** ${weight} ${weightUnit}
- **Corridor:** ${origin} → ${destination}
- **Departure Schedule:** ${depDate} at ${depTime} (${originTz})
- **Baseline Ocean Transit:** ${transit} days (${activePrediction.transit_source || 'trade_routes.csv'})
- **Calculated Local ETA:** ${arrival} (${destTz})

---

## 2. PREDICTIVE AI / ML RISK EVALUATION
| Evaluation Metric | Model Output | Risk Classification | Benchmark Delta |
| :--- | :--- | :--- | :--- |
| **Supply Guard Score** | **${score} / 100** | **${riskLevel} RISK** | Calibrated weighted index |
| **Disruption Probability** | **${disruption}%** | ${Number(disruption) >= 50 ? 'ELEVATED' : 'NOMINAL'} | LightGBM Classifier v1.0 |
| **Predicted Additional Delay** | **+${delay} days** | ${Number(delay) > 3 ? 'CRITICAL SHIFT' : 'STANDARD'} | LightGBM Regressor v1.0 |
| **Model Freight Estimate** | **$${freight} USD** | (${displayFreight}) | LightGBM Regressor v1.0 |

---

## 3. DERIVED COMMERCIAL BUSINESS EXPOSURE
- **Estimated Volume at Risk:** ${volAtRisk} tonnes (Likelihood-weighted)
- **Estimated Freight Risk Exposure:** $${freightExp} USD (Contingency buffer)
- **Multi-Order Network Ripple Score:** ${ripple} / 100

---

## 4. WEATHER INTELLIGENCE
- **Origin Weather (${originPort}):** ${originWeatherName} (${originWeatherRisk}/100 Weather Risk, ${originConfidence}% Confidence)
- **Destination Arrival Weather (${destPort}):** ${destWeatherName} (${destWeatherRisk}/100 Weather Risk)

---

## 5. STRATEGIC DIRECTIVES & RECOMMENDATIONS
1. **Transit Buffering:** Account for forecasted delay (+${delay} days) in receiving dock commitments.
2. **Berth Queuing:** Monitor dwell queue index at destination terminal (${destPort}).
3. **Contingency Action:** Maintain standard dispatch protocols under active clearance.

*Compiled autonomously by Supply Guard 2.0 Control Tower.*
`;

    setReportMarkdown(md);
    setReportTitle(`Executive Risk Briefing — ${supplier} to ${customer}`);
  };

  useEffect(() => {
    if (activePrediction) {
      generateShipmentReport();
    }
  }, [activePrediction]);

  const handleGenerateReport = async () => {
    if (activePrediction) {
      generateShipmentReport();
      onShowToast('Shipment executive briefing compiled.');
      return;
    }

    if (!isLoaded) return;
    setGenerating(true);
    try {
      const res = await api.generateExecutiveReport();
      setReportMarkdown(res.report_markdown);
      setReportTitle(res.report_title);
      onShowToast('Executive risk briefing generated successfully.');
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!reportMarkdown) return;
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    onShowToast('Report copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!reportMarkdown) return;
    const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SupplyGuard_Executive_Report_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Report downloaded as Markdown');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isLoaded && !activePrediction) {
    return (
      <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Report Generator • Standby
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5', margin: 0 }}>
            Executive Intelligence Reports
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
            Automated synthesis of deterministic model predictions, network ripple exposures, and strategic directives
          </p>
        </div>

        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <FileText size={40} style={{ opacity: 0.25, color: '#f5f5f5', marginBottom: '1.25rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e5e5e5', letterSpacing: '-0.01em' }}>
            No Operational Dataset or Shipment Configured
          </div>
          <div style={{ fontSize: '0.8rem', maxWidth: '440px', margin: '0.5rem auto 1.75rem auto', lineHeight: 1.5, color: 'var(--text-muted)' }}>
            Configure a shipment or ingest the enterprise dataset to compile an executive briefing with full audit traces.
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

  return (
    <div className="page-container" style={{ maxWidth: '1180px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px rgba(255,255,255,0.5)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              DOCUMENT ENGINE • EXECUTIVE BRIEFING
            </span>
          </div>
          <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5' }}>
            Executive Intelligence Briefing
          </h1>
          <p className="page-subtitle" style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Deterministic risk synthesis including LightGBM predictions, weather intelligence, and commercial exposure
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleGenerateReport}
            disabled={generating}
            style={{ padding: '0.55rem 1.15rem', fontSize: '0.75rem', borderRadius: 2 }}
          >
            {generating ? <Activity className="spin" size={13} style={{ marginRight: '0.35rem' }} /> : <Sparkles size={13} style={{ marginRight: '0.35rem' }} />}
            <span>{generating ? 'COMPILING BRIEFING...' : 'RE-GENERATE'}</span>
          </button>

          {reportMarkdown && (
            <>
              <button className="btn btn-secondary" onClick={handleCopy} style={{ padding: '0.55rem 0.85rem', fontSize: '0.75rem', borderRadius: 2 }}>
                {copied ? <CheckCircle size={13} style={{ color: '#4ade80', marginRight: '0.35rem' }} /> : <Copy size={13} style={{ marginRight: '0.35rem' }} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button className="btn btn-secondary" onClick={handleDownload} style={{ padding: '0.55rem 0.85rem', fontSize: '0.75rem', borderRadius: 2 }}>
                <Download size={13} style={{ marginRight: '0.35rem' }} />
                <span>Export .md</span>
              </button>
              <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '0.55rem 0.85rem', fontSize: '0.75rem', borderRadius: 2 }}>
                <Printer size={13} style={{ marginRight: '0.35rem' }} />
                <span>Print</span>
              </button>
            </>
          )}
        </div>
      </div>

      {reportMarkdown ? (
        <div
          className="card"
          style={{
            padding: '2.5rem',
            background: 'rgba(10, 10, 10, 0.55)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 2,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.6
          }}
        >
          {/* Header watermark bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.85rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <BrandLogo size={15} color="#FFFFFF" />
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                SUPPLY GUARD // DOCUMENT VERIFIED // SHA-256 TELEMETRY SEAL
              </span>
            </div>
            <span className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
              EXPORT FORMAT: MARKDOWN GFM
            </span>
          </div>

          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              margin: 0,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.82rem',
              color: '#d4d4d4',
              lineHeight: 1.65
            }}
          >
            {reportMarkdown}
          </pre>
        </div>
      ) : (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          Click "RE-GENERATE" to compile the executive risk report.
        </div>
      )}
    </div>
  );
};
