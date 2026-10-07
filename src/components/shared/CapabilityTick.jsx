// src/components/shared/CapabilityTick.jsx - Clinical capability check icon + text
import React from 'react';
import { Check, X } from 'lucide-react';

export function CapabilityTick({ label, present, className = '' }) {
  return (
    <span
      className={`gh-capability-tick ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.82rem',
        fontWeight: present ? 600 : 400,
        color: present ? 'var(--gh-success)' : 'var(--gh-muted)',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: present ? 'var(--gh-success-light)' : 'var(--gh-surface-2)',
          border: `1px solid ${present ? 'var(--gh-success-border)' : 'var(--gh-border)'}`,
        }}
      >
        {present ? (
          <Check size={11} strokeWidth={3} color="var(--gh-success)" aria-hidden="true" />
        ) : (
          <X size={11} strokeWidth={2.5} color="var(--gh-muted)" aria-hidden="true" />
        )}
      </span>
      <span>{label}</span>
      <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {present ? '(Available)' : '(Unavailable)'}
      </span>
    </span>
  );
}

export default CapabilityTick;
