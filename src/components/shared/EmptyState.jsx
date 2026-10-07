// src/components/shared/EmptyState.jsx - Friendly empty state container
import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no active records in this view right now.',
  action = null,
  className = '',
}) {
  return (
    <div
      className={`gh-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        borderRadius: 'var(--gh-radius)',
        border: '1px dashed var(--gh-border)',
        backgroundColor: 'var(--gh-surface-2)',
        color: 'var(--gh-text-muted)',
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: 'var(--gh-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '14px',
          border: '1px solid var(--gh-border)',
        }}
      >
        <Icon size={26} color="var(--gh-text-muted)" aria-hidden="true" />
      </div>
      <h3
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--gh-text)',
          marginBottom: '6px',
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: '0.88rem', maxWidth: '380px', marginBottom: action ? '16px' : 0 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
