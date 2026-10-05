import React, { useState, useMemo } from 'react';
import { Route as RouteIcon, Search, Download, ChevronLeft, ChevronRight, Database, ArrowRight, LayoutGrid, List } from 'lucide-react';
import { RouteItem } from '../types/supplyGuard';
import { RiskBadge } from '../components/RiskBadge';

interface RoutesProps {
  routes: RouteItem[];
  onSelectRoute: (routeId: string) => void;
  onLoadDemo: () => void;
  isLoaded: boolean;
}

export const Routes: React.FC<RoutesProps> = ({
  routes,
  onSelectRoute,
  onLoadDemo,
  isLoaded
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [basinFilter, setBasinFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortField, setSortField] = useState<'score' | 'distance' | 'transit' | 'disruption'>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const basins = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (r.trade_route_type) set.add(r.trade_route_type);
    });
    return Array.from(set);
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    if (!isLoaded || routes.length === 0) return [];
    let result = [...routes];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.route_id.toLowerCase().includes(q) ||
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q) ||
          r.trade_route_type.toLowerCase().includes(q)
      );
    }

    if (riskFilter !== 'ALL') {
      result = result.filter((r) => r.risk_level === riskFilter);
    }

    if (basinFilter !== 'ALL') {
      result = result.filter((r) => r.trade_route_type === basinFilter);
    }

    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'score') {
        valA = a.supply_guard_score;
        valB = b.supply_guard_score;
      } else if (sortField === 'distance') {
        valA = a.distance_km;
        valB = b.distance_km;
      } else if (sortField === 'transit') {
        valA = a.estimated_transit_days;
        valB = b.estimated_transit_days;
      } else if (sortField === 'disruption') {
        valA = a.disruption_probability_percent;
        valB = b.disruption_probability_percent;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [isLoaded, routes, searchTerm, riskFilter, basinFilter, sortField, sortAsc]);

  const meanRisk = useMemo(() => {
    if (routes.length === 0) return 0;
    const sum = routes.reduce((acc, r) => acc + (r.disruption_probability_percent || 0), 0);
    return (sum / routes.length).toFixed(1);
  }, [routes]);

  const handleExportCsv = () => {
    if (filteredRoutes.length === 0) return;
    const headers = ['route_id', 'origin', 'destination', 'sector', 'distance_km', 'transit_days', 'disruption_percent', 'supply_guard_score', 'risk_tier'];
    const rows = filteredRoutes.map((r) => [
      r.route_id,
      `"${r.origin}"`,
      `"${r.destination}"`,
      `"${r.trade_route_type}"`,
      r.distance_km,
      r.estimated_transit_days,
      r.disruption_probability_percent,
      r.supply_guard_score,
      r.risk_level
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `supply_guard_routes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoaded || routes.length === 0) {
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
            <RouteIcon size={26} />
          </div>
          <div style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '0.35rem' }}>
            CORRIDOR DIRECTORY // STANDBY
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 400, color: '#FFFFFF', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
            No Corridors Synchronized
          </h2>
          <p style={{ fontSize: '0.80rem', color: 'var(--text-body)', maxWidth: '520px', margin: '0 auto 2rem auto', lineHeight: 1.6 }}>
            Initialize the 50 global corridors benchmark dataset to access route distance, transit telemetry, disruption risk metrics, and Supply Guard Scores.
          </p>
          <button type="button" className="btn btn-primary" onClick={onLoadDemo}>
            <Database size={13} />
            <span>LOAD DEMO DATASET</span>
          </button>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredRoutes.length / pageSize) || 1;
  const paginatedRoutes = filteredRoutes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ========================================================================= */}
      {/* 1. DIRECTORY HEADER & TELEMETRY POD (Stitch Screen 2)                     */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                SYSTEM DIRECTORY // MATRIX TELEMETRY
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: '10px' }}>•</span>
              <span className="live-indicator-chip" style={{ fontSize: '9px', padding: '1px 5px' }}>
                V2.4 LIVE
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 300, color: '#FFFFFF', letterSpacing: '-0.03em', margin: 0 }}>
              Trade Route Directory
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginTop: '2px' }}>
              Global transit telemetry, chokepoint threat vectors, and deterministic maritime corridor monitoring.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                ACTIVE VECTORS
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '1px' }}>
                <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 300, color: '#FFFFFF' }}>{routes.length}</span>
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>Lanes Synced</span>
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.08)' }} />

            <div>
              <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                MEAN RISK INDEX
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '1px' }}>
                <span className="mono" style={{ fontSize: '1.35rem', fontWeight: 300, color: '#FFFFFF' }}>{meanRisk}%</span>
                <span className="risk-badge LOW" style={{ height: '16px', fontSize: '9px', padding: '0 4px' }}>Nominal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER & SEARCH CONTROLS BAR (Stitch Screen 2)                         */}
      {/* ========================================================================= */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '280px', maxWidth: '780px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter route ID, origin, destination..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: '32px', paddingLeft: '2rem' }}
            />
          </div>

          {/* Risk Level Filter */}
          <div style={{ width: '150px' }}>
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: '32px' }}
            >
              <option value="ALL">All Risk Vectors</option>
              <option value="LOW">Low (Nominal)</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>

          {/* Basin Sector Filter */}
          <div style={{ width: '170px' }}>
            <select
              value={basinFilter}
              onChange={(e) => {
                setBasinFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: '32px' }}
            >
              <option value="ALL">All Global Basins</option>
              {basins.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode & Export Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
          >
            <Download size={13} />
            <span>Export Log</span>
          </button>

          <div style={{ display: 'flex', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-xs)' }}>
            <button
              type="button"
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: '30px', padding: '0 8px', borderRadius: 0, border: 'none' }}
              onClick={() => setViewMode('table')}
              title="Dense Tabular View"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: '30px', padding: '0 8px', borderRadius: 0, border: 'none' }}
              onClick={() => setViewMode('cards')}
              title="Corridor Bento Cards"
            >
              <LayoutGrid size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DENSE TABULAR VIEW MATRIX (Stitch Screen 2)                            */}
      {/* ========================================================================= */}
      {viewMode === 'table' ? (
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              <span>MATRIX INDEX:</span>
              <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>SEC_TELEMETRY_05</strong>
            </div>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
              VIEW MODE: DENSE TABULAR ({filteredRoutes.length} RESULTS)
            </span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => { setSortField('score'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>
                  CORRIDOR LANE / ROUTE ID
                </th>
                <th>BASIN SECTOR</th>
                <th onClick={() => { setSortField('distance'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>
                  DISTANCE
                </th>
                <th onClick={() => { setSortField('transit'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>
                  EST. TRANSIT
                </th>
                <th onClick={() => { setSortField('disruption'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>
                  DISRUPTION RISK
                </th>
                <th onClick={() => { setSortField('score'); setSortAsc(!sortAsc); }} style={{ cursor: 'pointer' }}>
                  GUARD SCORE
                </th>
                <th>TELEMETRY STATUS</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoutes.length > 0 ? (
                paginatedRoutes.map((r) => {
                  const disruptPct = Math.min(100, Math.max(0, r.disruption_probability_percent || 0));

                  return (
                    <tr key={r.route_id} onClick={() => onSelectRoute(r.route_id)}>
                      <td style={{ padding: '0.75rem 0.85rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '0.82rem' }}>
                            {r.origin} → {r.destination}
                          </span>
                          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {r.route_id}
                          </span>
                        </div>
                      </td>

                      <td style={{ color: 'var(--text-secondary)' }}>
                        {r.trade_route_type || 'Maritime Direct'}
                      </td>

                      <td className="mono" style={{ color: 'var(--text-primary)' }}>
                        {r.distance_km ? `${r.distance_km.toLocaleString()} km` : '—'}
                      </td>

                      <td className="mono" style={{ color: 'var(--text-primary)' }}>
                        {r.estimated_transit_days} days
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '1px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${disruptPct}%`,
                                height: '100%',
                                background: disruptPct >= 30 ? '#EF4444' : disruptPct >= 20 ? '#F59E0B' : '#FFFFFF'
                              }}
                            />
                          </div>
                          <span className="mono" style={{ fontSize: '0.74rem', color: '#FFFFFF' }}>
                            {disruptPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                          <span className="mono" style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '0.85rem' }}>
                            {r.supply_guard_score.toFixed(0)}
                          </span>
                          <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/ 100</span>
                        </div>
                      </td>

                      <td>
                        <RiskBadge level={r.risk_level} />
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ width: '24px', height: '24px' }}
                          title="Open Route Dossier"
                        >
                          →
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No corridors match the search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Bento Cards View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {paginatedRoutes.map((r) => (
            <div
              key={r.route_id}
              className="card"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}
              onClick={() => onSelectRoute(r.route_id)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.route_id}</span>
                  <RiskBadge level={r.risk_level} />
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 500, color: '#FFFFFF' }}>
                  {r.origin} → {r.destination}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {r.trade_route_type}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', fontSize: '0.72rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.62rem' }}>GUARD SCORE</span>
                  <span className="mono" style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>{r.supply_guard_score.toFixed(1)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.62rem' }}>TRANSIT</span>
                  <span className="mono" style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>{r.estimated_transit_days}d</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            PAGE {currentPage} OF {totalPages} ({filteredRoutes.length} TOTAL CORRIDORS)
          </span>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
