// src/components/ConnectionStatus.jsx - Live / Reconnecting dot indicator
import React from 'react';
import useConnectionStatus from '../hooks/useConnectionStatus.js';

export function ConnectionStatus() {
  const { status, isLive } = useConnectionStatus();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '4px 10px',
        borderRadius: 'var(--gh-radius-full)',
        backgroundColor: 'var(--gh-surface-2)',
        border: '1px solid var(--gh-border)',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: isLive ? 'var(--gh-success)' : 'var(--gh-warning)',
      }}
      title={isLive ? 'Realtime Firestore connection active' : 'Attempting to reconnect…'}
      role="status"
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isLive ? 'var(--gh-success)' : 'var(--gh-warning)',
          boxShadow: isLive ? '0 0 8px var(--gh-success)' : '0 0 8px var(--gh-warning)',
          display: 'inline-block',
          animation: isLive ? 'none' : 'gh-pulse 1.2s infinite',
        }}
        aria-hidden="true"
      />
      <span>{isLive ? 'Live' : 'Reconnecting'}</span>
      <span className="sr-only">Connection status: {status}</span>
    </div>
  );
}

export default ConnectionStatus;
