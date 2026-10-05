import React, { useState, useEffect } from 'react';
import { Sidebar, PageId } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { BackgroundVideoLayer, VideoFlipMode } from './components/BackgroundVideoLayer';
import { Overview } from './pages/Overview';
import { RiskAnalysis } from './pages/RiskAnalysis';
import { Routes } from './pages/Routes';
import { RouteDetail } from './pages/RouteDetail';
import { NetworkView } from './pages/NetworkView';
import { SimulatorView } from './pages/SimulatorView';
import { BusinessImpactView } from './pages/BusinessImpactView';
import { RecommendationsView } from './pages/RecommendationsView';
import { TrendsView } from './pages/TrendsView';
import { ReportsView } from './pages/ReportsView';
import { DashboardKpis, RouteItem, DataSessionStatus, PredictResponse } from './types/supplyGuard';
import { api } from './services/api';

const PATH_TO_PAGE_MAP: Record<string, PageId> = {
  '/': 'overview',
  '/overview': 'overview',
  '/risk': 'risk',
  '/risk-analysis': 'risk',
  '/routes': 'routes',
  '/route-detail': 'route_detail',
  '/route_detail': 'route_detail',
  '/network': 'network',
  '/simulator': 'simulator',
  '/impact': 'impact',
  '/business-impact': 'impact',
  '/recommendations': 'recommendations',
  '/trends': 'trends',
  '/historical-trends': 'trends',
  '/reports': 'reports'
};

const PAGE_TO_PATH_MAP: Record<PageId, string> = {
  overview: '/',
  risk: '/risk-analysis',
  routes: '/routes',
  route_detail: '/route-detail',
  network: '/network',
  simulator: '/simulator',
  impact: '/business-impact',
  recommendations: '/recommendations',
  trends: '/historical-trends',
  reports: '/reports'
};

const getInitialPage = (): PageId => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return PATH_TO_PAGE_MAP[path] || 'overview';
  }
  return 'overview';
};

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(getInitialPage);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activePrediction, setActivePrediction] = useState<PredictResponse | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string>('/background.mp4');
  const [videoFlipMode, setVideoFlipMode] = useState<VideoFlipMode>('none');
  const [videoOpacity, setVideoOpacity] = useState<number>(0.72);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);

  const [sessionStatus, setSessionStatus] = useState<DataSessionStatus | null>(null);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Synchronize URL and SPA navigation history
  const navigateToPage = (p: PageId) => {
    setCurrentPage(p);
    if (typeof window !== 'undefined') {
      const targetPath = PAGE_TO_PATH_MAP[p] || (p === 'overview' ? '/' : `/${p}`);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const page = getInitialPage();
      setCurrentPage(page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const loadSessionAndData = async () => {
    try {
      const [status, kpiRes, routeRes] = await Promise.all([
        api.getDataStatus(),
        api.getDashboard(),
        api.getRoutes()
      ]);
      setSessionStatus(status);
      setKpis(kpiRes);
      setRoutes(routeRes.routes);
      if (routeRes.routes.length > 0 && (!selectedRouteId || !routeRes.routes.some(r => r.route_id === selectedRouteId))) {
        setSelectedRouteId(routeRes.routes[0].route_id);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load initial session data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessionAndData();
  }, []);

  const handleUploadCsv = async (file: File) => {
    setIsProcessing(true);
    try {
      const result = await api.uploadCsv(file);
      await loadSessionAndData();
      showToast(`Success: Loaded '${result.filename}' with ${result.records.toLocaleString()} records across ${result.routes} routes.`);
    } catch (err: any) {
      console.error(err);
      alert(`CSV Upload & Validation Error:\n\n${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsProcessing(true);
    try {
      const result = await api.loadDemoDataset();
      await loadSessionAndData();
      showToast(`Demo dataset loaded (${result.records.toLocaleString()} records, ${result.routes} routes). Status: DEMO DATASET.`);
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to load demo dataset: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearData = async () => {
    setIsProcessing(true);
    try {
      await api.clearDataset();
      await loadSessionAndData();
      setActivePrediction(null);
      setSelectedRouteId('');
      setCurrentPage('overview');
      showToast('Dataset cleared. Application returned to empty startup state.');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to clear dataset: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId);
    setCurrentPage('route_detail');
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    const match = routes.find(
      (r) =>
        r.route_id.toLowerCase() === searchQuery.toLowerCase() ||
        r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.destination.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (match) {
      setSelectedRouteId(match.route_id);
      setCurrentPage('route_detail');
      showToast(`Located corridor ${match.route_id}`);
    } else {
      setSelectedRouteId(searchQuery.trim().toUpperCase());
      setCurrentPage('risk');
      showToast(`Switched to Risk Analysis for ${searchQuery.trim().toUpperCase()}`);
    }
  };

  const isLoaded = Boolean(sessionStatus?.is_loaded && kpis?.is_loaded);
  const activeRoute = routes.find((r) => r.route_id === selectedRouteId) || routes[0];

  return (
    <div className="app-container">
      <BackgroundVideoLayer
        videoUrl={backgroundVideoUrl}
        flipMode={videoFlipMode}
        opacity={videoOpacity}
      />

      <Sidebar
        currentPage={currentPage}
        onSelectPage={(p) => navigateToPage(p)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      <div className="main-wrapper">
        <Topbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          sessionStatus={sessionStatus}
          onUploadCsv={handleUploadCsv}
          onLoadDemo={handleLoadDemo}
          onClearData={handleClearData}
          onNavigateToPredict={() => navigateToPage('overview')}
          isProcessing={isProcessing}
          onToggleVideoPrompt={() => setShowVideoModal(true)}
        />

        <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
          {currentPage === 'overview' && (
            <Overview
              kpis={kpis}
              loading={loading}
              onSelectRoute={handleSelectRoute}
              onNavigate={(p) => navigateToPage(p)}
              onUploadCsv={handleUploadCsv}
              onLoadDemo={handleLoadDemo}
              isProcessing={isProcessing}
              activePrediction={activePrediction}
              onPredictionChange={(pred) => setActivePrediction(pred)}
            />
          )}

          {currentPage === 'risk' && (
            <RiskAnalysis
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRouteId={setSelectedRouteId}
              onNavigate={(p) => navigateToPage(p)}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
              activePrediction={activePrediction}
              onPredictionChange={(pred) => setActivePrediction(pred)}
            />
          )}

          {currentPage === 'routes' && (
            <Routes
              routes={routes}
              onSelectRoute={handleSelectRoute}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
            />
          )}

          {currentPage === 'route_detail' && activeRoute && (
            <RouteDetail
              route={activeRoute}
              onNavigate={(p) => navigateToPage(p)}
              onSelectRouteId={setSelectedRouteId}
            />
          )}

          {currentPage === 'network' && (
            <NetworkView
              onSelectRoute={handleSelectRoute}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
            />
          )}

          {currentPage === 'simulator' && (
            <SimulatorView
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRouteId={setSelectedRouteId}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
              activePrediction={activePrediction}
              onNavigate={(p) => navigateToPage(p)}
              onPredictionChange={(pred) => setActivePrediction(pred)}
            />
          )}

          {currentPage === 'impact' && (
            <BusinessImpactView
              onSelectRoute={handleSelectRoute}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
              activePrediction={activePrediction}
              onNavigate={(p) => navigateToPage(p)}
            />
          )}

          {currentPage === 'recommendations' && (
            <RecommendationsView
              onSelectRoute={handleSelectRoute}
              onShowToast={showToast}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
              activePrediction={activePrediction}
              onNavigate={(p) => navigateToPage(p)}
            />
          )}

          {currentPage === 'trends' && (
            <TrendsView
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRouteId={setSelectedRouteId}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
            />
          )}

          {currentPage === 'reports' && (
            <ReportsView
              kpis={kpis}
              onShowToast={showToast}
              onNavigate={(p) => navigateToPage(p)}
              onLoadDemo={handleLoadDemo}
              isLoaded={isLoaded}
              activePrediction={activePrediction}
            />
          )}
        </main>
      </div>

      {/* Background Video Stream Modal */}
      {showVideoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(16px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '520px', width: '100%', background: 'rgba(12, 14, 18, 0.96)', border: '1px solid rgba(255, 255, 255, 0.16)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-title">
              <span>BACKGROUND VIDEO SETTINGS // UNDERLAY</span>
              <button
                className="btn-icon"
                onClick={() => setShowVideoModal(false)}
                style={{ width: '22px', height: '22px' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-body)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Supply Guard 2.0 features a continuous, zero-scroll cinematic background video floating behind smoked-glass panels. The custom crystal chain video has been processed and flipped to balance the viewport.
            </p>

            {/* Video Presets */}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.06em' }}>
                VIDEO ORIENTATION PRESET
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${backgroundVideoUrl === '/background.mp4' && videoFlipMode === 'none' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.68rem', padding: '0.45rem 0.5rem', textAlign: 'center' }}
                  onClick={() => {
                    setBackgroundVideoUrl('/background.mp4');
                    setVideoFlipMode('none');
                    showToast('Preset: Flipped Horizontal (Right Chain)');
                  }}
                >
                  Flipped (Right) ★
                </button>
                <button
                  type="button"
                  className={`btn ${backgroundVideoUrl === '/background_vflip.mp4' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.68rem', padding: '0.45rem 0.5rem', textAlign: 'center' }}
                  onClick={() => {
                    setBackgroundVideoUrl('/background_vflip.mp4');
                    setVideoFlipMode('none');
                    showToast('Preset: Vertical Invert');
                  }}
                >
                  Flipped (Vertical)
                </button>
                <button
                  type="button"
                  className={`btn ${backgroundVideoUrl === '/background_orig.mp4' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.68rem', padding: '0.45rem 0.5rem', textAlign: 'center' }}
                  onClick={() => {
                    setBackgroundVideoUrl('/background_orig.mp4');
                    setVideoFlipMode('none');
                    showToast('Preset: Original (Left)');
                  }}
                >
                  Original (Left)
                </button>
              </div>
            </div>

            {/* Live GPU Flip Overrides */}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.06em' }}>
                LIVE GPU FLIP TRANSFORM
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {(['none', 'horizontal', 'vertical', 'both'] as VideoFlipMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`btn ${videoFlipMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.68rem', padding: '0.35rem 0.4rem', textTransform: 'uppercase' }}
                    onClick={() => {
                      setVideoFlipMode(mode);
                      showToast(`Transform: ${mode.toUpperCase()}`);
                    }}
                  >
                    {mode === 'none' ? 'Standard' : mode === 'horizontal' ? 'Flip X' : mode === 'vertical' ? 'Flip Y' : 'Both (180°)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Setting */}
            <div style={{ marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  BACKGROUND VIDEO OPACITY
                </label>
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#FFFFFF' }}>
                  {Math.round(videoOpacity * 100)}%
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                {[0.40, 0.60, 0.72, 0.95].map((op) => (
                  <button
                    key={op}
                    type="button"
                    className={`btn ${videoOpacity === op ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.68rem', padding: '0.35rem 0.4rem' }}
                    onClick={() => {
                      setVideoOpacity(op);
                      showToast(`Opacity: ${Math.round(op * 100)}%`);
                    }}
                  >
                    {Math.round(op * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem', letterSpacing: '0.06em' }}>
                  CUSTOM VIDEO STREAM URL (.MP4 / .WEBM)
                </label>
                <input
                  type="text"
                  placeholder="https://.../satellite_ambient.mp4 or /background.mp4"
                  defaultValue={backgroundVideoUrl || ''}
                  id="modal-video-url-input"
                  style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setBackgroundVideoUrl('/background.mp4');
                    setVideoFlipMode('none');
                    setVideoOpacity(0.72);
                    setShowVideoModal(false);
                    showToast('Reset to default flipped background video');
                  }}
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const input = document.getElementById('modal-video-url-input') as HTMLInputElement;
                    if (input && input.value) {
                      setBackgroundVideoUrl(input.value);
                      showToast(`Background stream updated: ${input.value}`);
                    }
                    setShowVideoModal(false);
                  }}
                >
                  Save & Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="toast-msg">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}

export default App;
