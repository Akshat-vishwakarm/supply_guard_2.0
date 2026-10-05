import React from 'react';
import { Building, Anchor, Navigation, Users, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface SupplyChainFlowProps {
  supplier: string;
  customer: string;
  originPort: string;
  originCountry: string;
  destPort: string;
  destCountry: string;
  transitDays: number;
  shipmentStatus: string;
  predictedDelay: number;
  productName?: string;
}

export const SupplyChainFlow: React.FC<SupplyChainFlowProps> = ({
  supplier,
  customer,
  originPort,
  originCountry,
  destPort,
  destCountry,
  transitDays,
  shipmentStatus,
  predictedDelay,
  productName
}) => {
  const isDelayed = shipmentStatus === 'Delayed' || predictedDelay > 2.0;
  const isDisrupted = shipmentStatus === 'Disrupted';

  const getStatusBadge = (stage: string) => {
    if (stage === 'transit' && isDisrupted) {
      return (
        <span className="risk-badge CRITICAL">
          Disrupted
        </span>
      );
    }
    if ((stage === 'transit' || stage === 'dest') && isDelayed) {
      return (
        <span className="risk-badge MEDIUM">
          Delayed
        </span>
      );
    }
    return (
      <span className="risk-badge LOW">
        Nominal
      </span>
    );
  };

  const stages = [
    { id: 'supplier', label: 'ORIGIN CONSIGNOR', name: supplier || 'Supplier', sub: 'Production Facility', icon: Building, status: getStatusBadge('supplier') },
    { id: 'origin', label: 'PORT OF DEPARTURE', name: originPort, sub: originCountry, icon: Anchor, status: getStatusBadge('origin') },
    { id: 'transit', label: 'MARITIME PASSAGE', name: 'Open Ocean Transit', sub: `${transitDays}d baseline slot`, icon: Navigation, status: getStatusBadge('transit') },
    { id: 'dest', label: 'PORT OF ENTRY', name: destPort, sub: destCountry, icon: Anchor, status: getStatusBadge('dest') },
    { id: 'customer', label: 'RECEIVING ENTERPRISE', name: customer || 'Customer', sub: 'Delivery Bay', icon: Users, status: getStatusBadge('customer') }
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.65rem' }}>
        <span style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          END-TO-END SUPPLY CHAIN PIPELINE FLOW
        </span>
        {productName && (
          <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            MANIFEST: <strong style={{ color: '#FFFFFF', fontWeight: 400 }}>{productName}</strong>
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '0.65rem'
        }}
      >
        {stages.map((st) => {
          const IconComponent = st.icon;
          return (
            <div
              key={st.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '100px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 'var(--radius-xs)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                    <IconComponent size={12} />
                  </div>
                  {st.status}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {st.label}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#FFFFFF', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {st.name}
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {st.sub}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
