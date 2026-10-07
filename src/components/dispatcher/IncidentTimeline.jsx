// src/components/dispatcher/IncidentTimeline.jsx - Real-time incident lifecycle progress
import React from 'react';
import { Check, Clock, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';

const STEPS = [
  { key: 'created', label: 'Created' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'accepted', label: 'ER Ready' },
  { key: 'enroute', label: 'En Route' },
  { key: 'arrived', label: 'Arrived' },
];

export function IncidentTimeline({ status = 'created', className = '' }) {
  const normStatus = (status || 'created').toLowerCase();

  if (normStatus === 'cancelled') {
    return (
      <div
        className={`gh-timeline-cancelled ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: 'var(--gh-radius)',
          backgroundColor: 'var(--gh-surface-2)',
          color: 'var(--gh-danger)',
          border: '1px solid var(--gh-danger-border)',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <AlertCircle size={18} />
        <span>This incident was cancelled.</span>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === normStatus);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div
      className={`gh-incident-timeline ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        backgroundColor: 'var(--gh-surface-2)',
        borderRadius: 'var(--gh-radius)',
        border: '1px solid var(--gh-border)',
        overflowX: 'auto',
      }}
      role="progressbar"
      aria-label="Incident Lifecycle Progress"
      aria-valuenow={activeIdx + 1}
      aria-valuemin={1}
      aria-valuemax={6}
    >
      {STEPS.map((step, idx) => {
        const isDone = idx < activeIdx;
        const isCurrent = idx === activeIdx;

        return (
          <React.Fragment key={step.key}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                minWidth: '55px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDone
                    ? 'var(--gh-success)'
                    : isCurrent
                    ? 'var(--gh-accent)'
                    : 'var(--gh-surface)',
                  color: isDone || isCurrent ? '#ffffff' : 'var(--gh-text-muted)',
                  border: isDone || isCurrent ? 'none' : '1px solid var(--gh-border)',
                  boxShadow: isCurrent ? 'var(--gh-shadow-glow)' : 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  transition: 'all var(--gh-transition)',
                }}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : idx + 1}
              </div>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--gh-accent)' : isDone ? 'var(--gh-text)' : 'var(--gh-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: idx < activeIdx ? 'var(--gh-success)' : 'var(--gh-border)',
                  minWidth: '16px',
                  margin: '0 4px',
                  marginTop: '-16px',
                }}
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default IncidentTimeline;
