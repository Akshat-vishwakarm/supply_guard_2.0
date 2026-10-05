import React from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface VisualSliderControlProps {
  label: string;
  icon?: React.ReactNode;
  min?: number;
  max?: number;
  step?: number;
  baseValue: number;
  scenarioValue: number;
  delta: number;
  onChangeDelta: (newDelta: number) => void;
  color?: string;
  unit?: string;
  subtext?: string;
}

export const VisualSliderControl: React.FC<VisualSliderControlProps> = ({
  label,
  icon,
  min = 0,
  max = 100,
  baseValue,
  scenarioValue,
  delta,
  onChangeDelta,
  unit = '',
  subtext
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = Number(e.target.value);
    onChangeDelta(rawVal - baseValue);
  };

  const handleStep = (stepAmount: number) => {
    const newSim = Math.max(min, Math.min(max, scenarioValue + stepAmount));
    onChangeDelta(newSim - baseValue);
  };

  const handleReset = () => {
    onChangeDelta(0);
  };

  const isShifted = delta !== 0;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 'var(--radius-xs)',
        padding: '0.75rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {icon && <span style={{ color: '#FFFFFF', opacity: 0.8 }}>{icon}</span>}
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 500, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
              {label}
            </div>
            {subtext && <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{subtext}</div>}
          </div>
        </div>

        {/* Values readout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            BASE {baseValue}{unit}
          </span>
          <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#FFFFFF', fontWeight: 500 }}>
            {scenarioValue}{unit}
          </span>
          {isShifted && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
                background: delta > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                color: delta > 0 ? '#EF4444' : '#FFFFFF'
              }}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
      </div>

      {/* Slider & Stepper Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <button
          type="button"
          onClick={() => handleStep(-5)}
          className="btn-icon"
          style={{ width: '24px', height: '24px' }}
          title="-5 units"
        >
          <Minus size={11} />
        </button>

        <input
          type="range"
          min={min}
          max={max}
          value={scenarioValue}
          onChange={handleSliderChange}
          style={{ flex: 1 }}
        />

        <button
          type="button"
          onClick={() => handleStep(5)}
          className="btn-icon"
          style={{ width: '24px', height: '24px' }}
          title="+5 units"
        >
          <Plus size={11} />
        </button>

        {isShifted && (
          <button
            type="button"
            onClick={handleReset}
            className="btn-icon"
            style={{ width: '24px', height: '24px' }}
            title="Reset to baseline"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>
    </div>
  );
};
