import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Route,
  Share2,
  Sliders,
  DollarSign,
  CheckSquare,
  TrendingUp,
  FileText,
  Shield,
  Terminal,
  Lock
} from 'lucide-react';

import { BrandLogo } from './BrandLogo';

export type PageId =
  | 'overview'
  | 'risk'
  | 'routes'
  | 'route_detail'
  | 'network'
  | 'simulator'
  | 'impact'
  | 'recommendations'
  | 'trends'
  | 'reports';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  isOpen,
  onCloseMobile
}) => {
  const navItems: { id: PageId; label: string; icon: React.ReactNode; code: string }[] = [
    { id: 'overview', label: 'Overview Telemetry', icon: <LayoutDashboard size={16} />, code: '01' },
    { id: 'risk', label: 'Risk Analysis', icon: <ShieldAlert size={16} />, code: '02' },
    { id: 'routes', label: 'Trade Routes', icon: <Route size={16} />, code: '03' },
    { id: 'network', label: 'Network Topology', icon: <Share2 size={16} />, code: '04' },
    { id: 'simulator', label: 'What-If Simulator', icon: <Sliders size={16} />, code: '05' },
    { id: 'impact', label: 'Business Impact', icon: <DollarSign size={16} />, code: '06' },
    { id: 'recommendations', label: 'Recommendations', icon: <CheckSquare size={16} />, code: '07' },
    { id: 'trends', label: 'Historical Trends', icon: <TrendingUp size={16} />, code: '08' },
    { id: 'reports', label: 'Executive Reports', icon: <FileText size={16} />, code: '09' },
  ];

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onCloseMobile}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-left">
            <div className="brand-badge" title="Supply Guard 2.0 Autonomous Control Tower">
              <BrandLogo size={19} color="#FFFFFF" />
            </div>
            <div className="brand-title-wrap">
              <span className="brand-name">SUPPLY GUARD</span>
              <span className="brand-sub">TOWER 2.0</span>
            </div>
          </div>
          <div className="live-indicator-chip">
            <span className="pulse-dot" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Section: Operational Matrix */}
        <div className="sidebar-section-title">Operational Matrix</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = currentPage === item.id || (item.id === 'routes' && currentPage === 'route_detail');
            return (
              <div
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectPage(item.id);
                  onCloseMobile();
                }}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                <span className="mono" style={{ fontSize: '10px', opacity: 0.45 }}>{item.code}</span>
              </div>
            );
          })}
        </nav>

        {/* Section: System Diagnostics */}
        <div className="sidebar-section-title">System Diagnostics</div>
        <div className="sidebar-diagnostics">
          <div className="diag-row">
            <span>Latency</span>
            <span className="diag-val">14ms</span>
          </div>
          <div className="diag-row">
            <span>Pipeline</span>
            <span className="diag-val">Nominal</span>
          </div>
          <div className="diag-row">
            <span>Nodes</span>
            <span className="diag-val">1,048 sync</span>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="sidebar-footer">
          <div className="node-signature">
            <div className="node-icon-box">
              <Terminal size={13} />
            </div>
            <div className="node-meta">
              <span className="node-id">TOWER_CORE_01</span>
              <span className="node-version">v2.0.4-prod</span>
            </div>
          </div>
          <Lock size={13} style={{ color: 'var(--text-muted)' }} />
        </div>
      </aside>
    </>
  );
};
