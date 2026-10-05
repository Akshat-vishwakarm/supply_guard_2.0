import React, { useRef } from 'react';
import { Menu, Search, Upload, Database, Trash2, Plus, Video } from 'lucide-react';
import { DataSessionStatus } from '../types/supplyGuard';
import { BrandLogo } from './BrandLogo';

interface TopbarProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit?: () => void;
  sessionStatus: DataSessionStatus | null;
  onUploadCsv: (file: File) => void;
  onLoadDemo: () => void;
  onClearData: () => void;
  onNavigateToPredict?: () => void;
  isProcessing: boolean;
  onToggleVideoPrompt?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  sessionStatus,
  onUploadCsv,
  onLoadDemo,
  onClearData,
  onNavigateToPredict,
  isProcessing,
  onToggleVideoPrompt
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadCsv(e.target.files[0]);
      e.target.value = '';
    }
  };

  const isLoaded = Boolean(sessionStatus?.is_loaded);
  const isDemo = Boolean(sessionStatus?.is_demo);

  return (
    <header className="topbar">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        style={{ display: 'none' }}
      />

      <div className="topbar-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <Menu size={16} />
        </button>

        <div className="mobile-brand-mark" style={{ display: 'none', alignItems: 'center', gap: '0.45rem', marginRight: '0.5rem' }}>
          <div style={{ width: 26, height: 26, borderRadius: 3, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrandLogo size={16} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', color: '#FFF' }}>SUPPLY GUARD</span>
        </div>

        <div className="search-box-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={isLoaded ? "Query shipments, nodes, threats (e.g. R00012, Yokohama, Los Angeles)..." : "Query corridors or enter Route ID..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSearchSubmit) {
                onSearchSubmit();
              }
            }}
          />
        </div>
      </div>

      <div className="topbar-right">
        {/* Session Status Pill */}
        {!isLoaded ? (
          <div className="date-pill">
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF', opacity: 0.6 }} />
            <span>STANDBY // NO DATASET</span>
          </div>
        ) : isDemo ? (
          <div className="date-pill" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF' }} />
            <span>DEMO MATRIX // {sessionStatus?.routes || 50} CORRIDORS</span>
          </div>
        ) : (
          <div className="date-pill" style={{ borderColor: 'rgba(255, 255, 255, 0.25)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
            <span>LIVE OPS // {sessionStatus?.routes} ROUTES</span>
          </div>
        )}

        {/* Data Actions */}
        {!isLoaded ? (
          <>
            <button
              className="btn btn-secondary"
              onClick={onLoadDemo}
              disabled={isProcessing}
              title="Initialize benchmark 31,300 record dataset"
            >
              <Database size={13} />
              <span>Load Demo Dataset</span>
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload size={13} />
              <span>{isProcessing ? 'Processing...' : 'Upload Data'}</span>
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              title="Upload new CSV to replace current dataset"
            >
              <Upload size={13} />
              <span>Upload CSV</span>
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={onClearData}
              disabled={isProcessing}
              title="Reset data session"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          </>
        )}

        {/* Ambient Video Stream Selector Trigger */}
        {onToggleVideoPrompt && (
          <button
            className="btn btn-icon"
            onClick={onToggleVideoPrompt}
            title="Configure Background Video Stream"
            aria-label="Background Video"
          >
            <Video size={14} />
          </button>
        )}

        {/* Primary Stark Call to Action */}
        {onNavigateToPredict && (
          <button
            className="btn btn-primary"
            onClick={onNavigateToPredict}
          >
            <Plus size={14} />
            <span>NEW RISK ANALYSIS</span>
          </button>
        )}
      </div>
    </header>
  );
};
