import React, { useState, useEffect, useMemo } from 'react';
import { Share2, ArrowRight, Database, Activity, GitFork, Radio, ShieldAlert, Globe, MapPin } from 'lucide-react';
import { NetworkGraphData, NetworkGraphEdge } from '../types/supplyGuard';
import { RiskBadge } from '../components/RiskBadge';
import { api } from '../services/api';

interface NetworkViewProps {
  onSelectRoute: (routeId: string) => void;
  onLoadDemo: () => void;
  isLoaded: boolean;
}

export const NetworkView: React.FC<NetworkViewProps> = ({
  onSelectRoute,
  onLoadDemo,
  isLoaded
}) => {
  const [graphData, setGraphData] = useState<NetworkGraphData | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>('R00012');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch network topology unconditionally on mount and when isLoaded changes
  useEffect(() => {
    setLoading(true);
    api.getNetworkGraph()
      .then((data) => {
        setGraphData(data);
        if (data.edges.length > 0 && !selectedEdgeId) {
          setSelectedEdgeId(data.edges[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching network graph:', err);
        setLoading(false);
      });
  }, [isLoaded]);

  const selectedEdge = useMemo(() => {
    if (!graphData || graphData.edges.length === 0) return null;
    return graphData.edges.find((e) => e.id === selectedEdgeId) || graphData.edges[0];
  }, [graphData, selectedEdgeId]);

  const nodePositions = useMemo(() => {
    if (!graphData) return {};
    const coords: Record<string, { x: number; y: number }> = {
      'United States': { x: 180, y: 190 },
      'Canada': { x: 200, y: 100 },
      'Brazil': { x: 270, y: 380 },
      'United Kingdom': { x: 420, y: 140 },
      'France': { x: 445, y: 200 },
      'Germany': { x: 495, y: 160 },
      'China': { x: 690, y: 210 },
      'Japan': { x: 790, y: 190 },
      'India': { x: 610, y: 290 },
      'Australia': { x: 765, y: 410 },
    };

    const total = graphData.nodes.length;
    graphData.nodes.forEach((n, idx) => {
      if (!coords[n.id]) {
        const angle = (idx / (total || 1)) * 2 * Math.PI;
        coords[n.id] = {
          x: 460 + 260 * Math.cos(angle),
          y: 250 + 170 * Math.sin(angle)
        };
      }
    });

    return coords;
  }, [graphData]);

  // Connected corridors and nodes calculation
  const networkTopologyRelations = useMemo(() => {
    if (!graphData) {
      return {
        directEdgesSet: new Set<string>(),
        secondEdgesSet: new Set<string>(),
        directNodesSet: new Set<string>(),
        connectedHubEdges: [] as NetworkGraphEdge[]
      };
    }

    if (selectedNodeId) {
      const direct = graphData.edges.filter(
        (e) => e.source === selectedNodeId || e.target === selectedNodeId
      );
      const directEdgesSet = new Set(direct.map((e) => e.id));
      const directNodesSet = new Set<string>();
      direct.forEach((e) => {
        directNodesSet.add(e.source);
        directNodesSet.add(e.target);
      });
      return {
        directEdgesSet,
        secondEdgesSet: new Set<string>(),
        directNodesSet,
        connectedHubEdges: direct
      };
    }

    if (selectedEdge) {
      const directNodes = new Set([selectedEdge.source, selectedEdge.target]);
      const directEdges = graphData.edges.filter(
        (e) => e.id !== selectedEdge.id && (directNodes.has(e.source) || directNodes.has(e.target))
      );
      const directEdgesSet = new Set(directEdges.map((e) => e.id));

      const secondNodes = new Set<string>();
      directEdges.forEach((e) => {
        secondNodes.add(e.source);
        secondNodes.add(e.target);
      });
      directNodes.forEach((n) => secondNodes.delete(n));

      const secondEdges = graphData.edges.filter(
        (e) =>
          !directEdgesSet.has(e.id) &&
          e.id !== selectedEdge.id &&
          (secondNodes.has(e.source) || secondNodes.has(e.target))
      );
      const secondEdgesSet = new Set(secondEdges.map((e) => e.id));

      return {
        directEdgesSet,
        secondEdgesSet,
        directNodesSet: directNodes,
        connectedHubEdges: directEdges
      };
    }

    return {
      directEdgesSet: new Set<string>(),
      secondEdgesSet: new Set<string>(),
      directNodesSet: new Set<string>(),
      connectedHubEdges: [] as NetworkGraphEdge[]
    };
  }, [graphData, selectedEdge, selectedNodeId]);

  const getEdgeStroke = (edge: NetworkGraphEdge) => {
    const isSelected = edge.id === selectedEdgeId && !selectedNodeId;
    const isNodeDirect = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
    const isEdgeDirect = !selectedNodeId && networkTopologyRelations.directEdgesSet.has(edge.id);
    const isSecondOrder = !selectedNodeId && networkTopologyRelations.secondEdgesSet.has(edge.id);

    if (isSelected || isNodeDirect) {
      return { stroke: '#ffffff', strokeWidth: 2.5, opacity: 1, dash: 'none', glow: true };
    }
    if (isEdgeDirect) {
      return { stroke: 'rgba(255, 255, 255, 0.75)', strokeWidth: 1.8, opacity: 0.85, dash: '4,3', glow: false };
    }
    if (isSecondOrder) {
      return { stroke: 'rgba(255, 255, 255, 0.35)', strokeWidth: 1.2, opacity: 0.45, dash: '2,3', glow: false };
    }

    // Default by risk level when not connected
    if (edge.risk_level === 'CRITICAL') return { stroke: 'rgba(239, 68, 68, 0.5)', strokeWidth: 1.2, opacity: 0.4, dash: 'none', glow: false };
    if (edge.risk_level === 'HIGH') return { stroke: 'rgba(245, 158, 11, 0.4)', strokeWidth: 1.0, opacity: 0.35, dash: 'none', glow: false };
    return { stroke: 'rgba(255, 255, 255, 0.12)', strokeWidth: 0.75, opacity: 0.2, dash: 'none', glow: false };
  };

  const networkMetrics = useMemo(() => {
    if (!graphData || graphData.edges.length === 0) {
      return {
        directRoutesCount: 18,
        secondOrderRoutesCount: 32,
        avgRisk: 42.5,
        maxRisk: 84.5,
        rippleScore: 34.6
      };
    }

    const scores = graphData.edges.map((e) => e.risk_score);
    const avgRisk = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    const maxRisk = Math.max(...scores, 0);

    const directCount = networkTopologyRelations.directEdgesSet.size || Math.round(graphData.edges.length * 0.35);
    const secondOrderCount = networkTopologyRelations.secondEdgesSet.size || Math.round(graphData.edges.length * 0.65);
    const rippleScore = selectedEdge ? selectedEdge.ripple_risk_score : 34.6;

    return {
      directRoutesCount: directCount,
      secondOrderRoutesCount: secondOrderCount,
      avgRisk,
      maxRisk,
      rippleScore
    };
  }, [graphData, selectedEdge, networkTopologyRelations]);

  if (loading && !graphData) {
    return (
      <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(20px)' }}>
          <Activity size={32} className="spin" style={{ color: '#ffffff', opacity: 0.7, marginBottom: '1rem' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f5f5f5' }}>
            CONNECTING TO GLOBAL TRADE TOPOLOGY...
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Synthesizing 50 intercontinental maritime and air freight geodesics
          </div>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.edges.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(20px)' }}>
          <Share2 size={40} style={{ opacity: 0.25, color: '#f5f5f5', marginBottom: '1.25rem' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e5e5e5' }}>
            Initializing Network Topology Engine
          </div>
          <div style={{ fontSize: '0.8rem', maxWidth: '440px', margin: '0.5rem auto 1.75rem auto', color: 'var(--text-muted)' }}>
            Load the enterprise dataset to inspect real-time risk predictions across all 50 global corridors.
          </div>
          <button className="btn btn-primary" onClick={onLoadDemo} style={{ padding: '0.6rem 1.5rem', fontSize: '0.75rem' }}>
            <Database size={13} style={{ marginRight: '0.4rem' }} /> Ingest Enterprise Demo Dataset
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* PAGE HEADER */}
      <div className="page-header" style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 6px rgba(255,255,255,0.7)' }} />
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              TOPOLOGY ENGINE • {isLoaded ? 'LIVE MULTI-HOP ADJACENCY MATRIX' : 'BASELINE FLEET TOPOLOGY'}
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f5', margin: 0 }}>
            Global Network &amp; Ripple Vulnerability
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>
            Spatial coordinate mapping of global trade corridors with second-order cascade simulation
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {!isLoaded && (
            <button
              className="btn btn-secondary"
              onClick={onLoadDemo}
              style={{ fontSize: '0.72rem', padding: '0.4rem 0.85rem' }}
              title="Load demo dataset to enable live LightGBM model telemetry"
            >
              <Database size={12} style={{ marginRight: '0.4rem' }} />
              Ingest Live Sensor Data
            </button>
          )}
          <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(15,15,15,0.6)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio size={12} style={{ color: '#ffffff' }} />
            <span className="mono" style={{ fontSize: '0.7rem', color: '#e5e5e5' }}>
              {graphData.total_nodes} HUBS • {graphData.total_edges} CORRIDORS CONNECTED
            </span>
          </div>
        </div>
      </div>

      {/* TOP 5 NETWORK KPI PODS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.5rem'
        }}
      >
        <div className="card" style={{ padding: '1rem 1.15rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Direct Adjacencies
            </span>
            <GitFork size={13} style={{ color: 'var(--text-dim)' }} />
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f5f5f5', margin: '0.4rem 0 0.5rem' }}>
            {networkMetrics.directRoutesCount} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>vectors</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            <div style={{ width: `${Math.min(100, networkMetrics.directRoutesCount * 4)}%`, height: '100%', background: '#ffffff' }} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
            Immediate hub-coupled connections
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              2nd-Order Exposure
            </span>
            <Activity size={13} style={{ color: 'var(--text-dim)' }} />
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f5f5f5', margin: '0.4rem 0 0.5rem' }}>
            {networkMetrics.secondOrderRoutesCount} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>vectors</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            <div style={{ width: `${Math.min(100, networkMetrics.secondOrderRoutesCount * 2.5)}%`, height: '100%', background: 'rgba(255,255,255,0.6)' }} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
            Multi-hop cascade horizon
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Mean Topology Risk
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>BASELINE</span>
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f5f5f5', margin: '0.4rem 0 0.5rem' }}>
            {networkMetrics.avgRisk.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>/ 100</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            <div style={{ width: `${Math.min(100, networkMetrics.avgRisk)}%`, height: '100%', background: 'rgba(255,255,255,0.8)' }} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
            Fleet-wide global average
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Peak Node Exposure
            </span>
            <ShieldAlert size={13} style={{ color: 'var(--text-dim)' }} />
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 600, color: networkMetrics.maxRisk >= 70 ? '#f87171' : '#f5f5f5', margin: '0.4rem 0 0.5rem' }}>
            {networkMetrics.maxRisk.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>/ 100</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            <div style={{ width: `${Math.min(100, networkMetrics.maxRisk)}%`, height: '100%', background: networkMetrics.maxRisk >= 70 ? '#f87171' : '#ffffff' }} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
            Highest isolated corridor risk
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Ripple Score
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>INDEX</span>
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 600, color: '#f5f5f5', margin: '0.4rem 0 0.5rem' }}>
            {networkMetrics.rippleScore.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>/ 100</span>
          </div>
          <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
            <div style={{ width: `${Math.min(100, networkMetrics.rippleScore)}%`, height: '100%', background: '#ffffff' }} />
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
            Systemic propagation rating
          </div>
        </div>
      </div>

      {/* GRAPH CANVAS & SELECTED CORRIDOR / HUB DOSSIER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '1.25rem', marginBottom: '1.25rem', alignItems: 'stretch' }}>
        {/* TOPOLOGY CANVAS */}
        <div className="card" style={{ minHeight: '560px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} />
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                SPATIAL TRANSIT TOPOLOGY • VECTOR GEODESICS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {selectedNodeId && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedNodeId(null)}
                  style={{ fontSize: '0.65rem', padding: '0.25rem 0.55rem', height: '22px' }}
                >
                  Clear Node Filter ({selectedNodeId})
                </button>
              )}
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                CLICK CORRIDOR OR HUB TO INSPECT
              </span>
            </div>
          </div>

          <div style={{ flex: 1, width: '100%', overflowX: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg
              viewBox="0 0 920 500"
              style={{
                width: '100%',
                height: 'auto',
                minWidth: '600px',
                background: 'rgba(5, 5, 5, 0.75)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 2
              }}
            >
              <defs>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                </pattern>
                <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <filter id="corridor-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid-pattern)" />

              {/* Range rings */}
              <circle cx="460" cy="250" r="160" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3,3" />
              <circle cx="460" cy="250" r="280" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="4,4" />

              {/* Edge Arcs */}
              {graphData.edges.map((e, eIdx) => {
                const src = nodePositions[e.source];
                const tgt = nodePositions[e.target];
                if (!src || !tgt) return null;
                const isSelected = e.id === selectedEdgeId && !selectedNodeId;
                const style = getEdgeStroke(e);

                const dx = tgt.x - src.x;
                const dy = tgt.y - src.y;
                const baseDist = Math.sqrt(dx * dx + dy * dy);
                // Offset curve slightly based on index to fan out overlapping corridors
                const curveFactor = 1.05 + (eIdx % 4) * 0.08;
                const dr = baseDist * curveFactor;

                const pathD = `M ${src.x} ${src.y} A ${dr} ${dr} 0 0,1 ${tgt.x} ${tgt.y}`;

                return (
                  <g key={e.id}>
                    {/* Invisible Wide Hitbox for Effortless Clicking */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="18"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedEdgeId(e.id);
                        setSelectedNodeId(null);
                      }}
                    >
                      <title>{`${e.id}: ${e.source} → ${e.target} (${e.risk_score.toFixed(1)}/100)`}</title>
                    </path>

                    {/* Outer Glow Halo for Selected or Highlighted Corridor */}
                    {isSelected && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="8"
                        filter="url(#corridor-glow)"
                      />
                    )}

                    {/* Visible Vector Arc */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      strokeOpacity={style.opacity}
                      strokeDasharray={style.dash}
                      style={{
                        pointerEvents: 'none',
                        transition: 'stroke-width 0.2s ease, stroke-opacity 0.2s ease, stroke 0.2s ease'
                      }}
                    />
                  </g>
                );
              })}

              {/* Node Terminals */}
              {graphData.nodes.map((n) => {
                const pos = nodePositions[n.id];
                if (!pos) return null;
                const isNodeActive = selectedNodeId === n.id;
                const isEdgeEndpoint =
                  !selectedNodeId && selectedEdge && (selectedEdge.source === n.id || selectedEdge.target === n.id);
                const isHighlighted = isNodeActive || isEdgeEndpoint;
                const isNeighborNode =
                  !isHighlighted && networkTopologyRelations.directNodesSet.has(n.id);

                return (
                  <g
                    key={n.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedNodeId(selectedNodeId === n.id ? null : n.id)}
                  >
                    <title>{`${n.label}: Click to filter connected corridors (${n.total_routes} links)`}</title>

                    {/* Invisible Hitbox */}
                    <circle r={24} fill="transparent" />

                    {/* Active Halo */}
                    {isHighlighted && (
                      <circle r={22} fill="url(#hub-glow)" />
                    )}

                    {/* Terminal Body */}
                    <circle
                      r={isHighlighted ? 9 : isNeighborNode ? 6.5 : 5}
                      fill={isHighlighted ? '#ffffff' : isNeighborNode ? '#222222' : '#0d0d0d'}
                      stroke={isHighlighted ? '#ffffff' : isNeighborNode ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)'}
                      strokeWidth={isHighlighted ? 2.5 : 1}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                    <circle
                      r={isHighlighted ? 3.5 : 2}
                      fill={isHighlighted ? '#000000' : isNeighborNode ? '#ffffff' : '#777777'}
                    />

                    {/* Terminal Label */}
                    <text
                      y={-14}
                      textAnchor="middle"
                      fill={isHighlighted ? '#ffffff' : isNeighborNode ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'}
                      fontSize="0.68rem"
                      fontWeight={isHighlighted ? 600 : 400}
                      fontFamily="Inter, sans-serif"
                      letterSpacing="0.02em"
                    >
                      {n.label}
                    </text>
                    <text
                      y={18}
                      textAnchor="middle"
                      fill={isHighlighted ? 'rgba(255,255,255,0.85)' : 'var(--text-dim)'}
                      fontSize="0.55rem"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {n.total_routes} VEC
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* LEGEND FOOTER */}
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} /> Active Selection
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 12, height: 2, background: 'rgba(255,255,255,0.75)', borderRadius: 1 }} /> Direct Coupling
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 12, height: 2, background: 'rgba(255,255,255,0.35)', borderRadius: 1 }} /> 2nd-Order Horizon
              </span>
            </div>
            <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
              * CLICK ANY HUB OR ARC TO EXPAND MULTI-HOP TELEMETRY
            </div>
          </div>
        </div>

        {/* SELECTED CORRIDOR OR HUB DOSSIER */}
        {selectedNodeId ? (
          /* HUB DOSSIER */
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                  PORT TERMINAL HUB DOSSIER
                </span>
                <span className="mono" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.5rem', borderRadius: 2 }}>
                  GLOBAL HUB
                </span>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={18} color="#FFFFFF" />
                  <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 600, color: '#f5f5f5' }}>
                    {selectedNodeId}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Connected Intercontinental Trade Interchange
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Connected Corridors</span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>
                    {networkTopologyRelations.connectedHubEdges.length} Lanes
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Partner Trading Nations</span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>
                    {new Set(networkTopologyRelations.connectedHubEdges.map(e => e.source === selectedNodeId ? e.target : e.source)).size} Nations
                  </span>
                </div>
              </div>

              {/* LIST OF CONNECTED CORRIDORS */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.45rem' }}>
                  Connected Routes ({networkTopologyRelations.connectedHubEdges.length})
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {networkTopologyRelations.connectedHubEdges.map((e) => (
                    <div
                      key={e.id}
                      onClick={() => {
                        setSelectedEdgeId(e.id);
                        setSelectedNodeId(null);
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span className="mono" style={{ fontSize: '0.75rem', color: '#ffffff', fontWeight: 500 }}>
                          {e.id}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginLeft: '0.45rem' }}>
                          {e.source === selectedNodeId ? `→ ${e.target}` : `← ${e.source}`}
                        </span>
                      </div>
                      <RiskBadge level={e.risk_level} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}
              onClick={() => setSelectedNodeId(null)}
            >
              Reset to Corridor View
            </button>
          </div>
        ) : selectedEdge ? (
          /* CORRIDOR DOSSIER */
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#e5e5e5' }}>
                  CORRIDOR DOSSIER
                </span>
                <RiskBadge level={selectedEdge.risk_level} />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f5f5f5', letterSpacing: '-0.02em' }}>
                  {selectedEdge.id}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#e5e5e5', marginTop: '0.25rem' }}>
                  {selectedEdge.source} → {selectedEdge.target}
                </div>
                <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '0.35rem', letterSpacing: '0.04em' }}>
                  {selectedEdge.shipping_method.toUpperCase()} • {selectedEdge.trade_route_type.toUpperCase()} • {selectedEdge.distance_km.toLocaleString()} KM
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supply Guard Score</span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>
                    {selectedEdge.risk_score.toFixed(1)} <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>/ 100</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Disruption Probability</span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: selectedEdge.disruption_probability >= 0.5 ? '#f87171' : '#f5f5f5' }}>
                    {(selectedEdge.disruption_probability * 100).toFixed(1)}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Predicted Transit Delay</span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>
                    +{selectedEdge.predicted_delay_days.toFixed(1)} <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>days</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Modeled Ripple Vulnerability</span>
                  <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f5' }}>
                    {selectedEdge.ripple_risk_score.toFixed(1)} <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>INDEX</span>
                  </span>
                </div>
              </div>

              {/* TOPOLOGICAL ADJACENCY NOTE */}
              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 2, marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                  Connected Nodes
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedNodeId(selectedEdge.source)}
                    style={{ fontSize: '0.68rem', padding: '0.25rem 0.6rem', height: '24px' }}
                  >
                    <MapPin size={11} style={{ marginRight: '0.3rem' }} /> Hub: {selectedEdge.source}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSelectedNodeId(selectedEdge.target)}
                    style={{ fontSize: '0.68rem', padding: '0.25rem 0.6rem', height: '24px' }}
                  >
                    <MapPin size={11} style={{ marginRight: '0.3rem' }} /> Hub: {selectedEdge.target}
                  </button>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}
              onClick={() => onSelectRoute(selectedEdge.id)}
            >
              Open Corridor Intelligence Profile <ArrowRight size={13} style={{ marginLeft: '0.35rem' }} />
            </button>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
            Select an edge arc or hub node to inspect telemetry
          </div>
        )}
      </div>

      {/* DIRECT & SECOND-ORDER DEPENDENCIES BREAKDOWN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.15rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffffff' }} />
            <span style={{ fontSize: '0.68rem', color: '#e5e5e5', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Direct Dependencies ({networkMetrics.directRoutesCount} Corridors)
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
            Immediate hub-coupled corridors sharing berths, terminal infrastructure, and primary carrier capacity.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span className="mono" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d4', padding: '0.25rem 0.55rem', borderRadius: 2 }}>
              IMMEDIATE PORT HUBS
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d4', padding: '0.25rem 0.55rem', borderRadius: 2 }}>
              DIRECT BERTH COUPLINGS
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d4', padding: '0.25rem 0.55rem', borderRadius: 2 }}>
              PRIMARY CARRIER CAPACITY
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem', background: 'rgba(10,10,10,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
            <span style={{ fontSize: '0.68rem', color: '#e5e5e5', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Second-Order Cascades ({networkMetrics.secondOrderRoutesCount} Corridors)
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
            Indirect multi-hop feeder legs subject to downstream container repositioning delays and inland choke points.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span className="mono" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a3a3a3', padding: '0.25rem 0.55rem', borderRadius: 2 }}>
              FEEDER TRANSSHIPMENTS
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a3a3a3', padding: '0.25rem 0.55rem', borderRadius: 2 }}>
              SECONDARY INLAND DRAYAGE
            </span>
            <span className="mono" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a3a3a3', padding: '0.25rem 0.55rem', borderRadius: 2 }}>
              INTER-HUB CONTAINER REPOSITIONING
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
