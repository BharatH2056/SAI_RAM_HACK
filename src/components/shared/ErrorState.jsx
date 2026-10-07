// src/components/shared/ErrorState.jsx - Graceful error presentation
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button.jsx';

export function ErrorState({
  title = 'Something went wrong',
  message = 'We encountered an error loading this data.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`gh-error-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        textAlign: 'center',
        borderRadius: 'var(--gh-radius)',
        border: '1px solid var(--gh-danger-border)',
        backgroundColor: 'var(--gh-danger-light)',
        color: 'var(--gh-text)',
      }}
      role="alert"
    >
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'var(--gh-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          border: '1px solid var(--gh-danger-border)',
        }}
      >
        <AlertTriangle size={24} color="var(--gh-danger)" aria-hidden="true" />
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{title}</h3>
      <p style={{ fontSize: '0.88rem', color: 'var(--gh-text-muted)', maxWidth: '420px', marginBottom: onRetry ? '16px' : 0 }}>
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw size={14} />}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
