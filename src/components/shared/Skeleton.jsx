// src/components/shared/Skeleton.jsx - Shimmer loading skeleton
import React from 'react';

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--gh-radius-sm)',
  className = '',
  style = {},
}) {
  return (
    <div
      className={`gh-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--gh-surface-2)',
        backgroundImage: 'linear-gradient(90deg, var(--gh-surface-2) 0%, var(--gh-border) 50%, var(--gh-surface-2) 100%)',
        backgroundSize: '200% 100%',
        animation: 'gh-shimmer 1.5s infinite linear',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

// Global keyframe can also be in tokens.css or inline style tag
if (typeof document !== 'undefined' && !document.getElementById('gh-skeleton-style')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'gh-skeleton-style';
  styleEl.textContent = `
    @keyframes gh-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(styleEl);
}

export default Skeleton;
