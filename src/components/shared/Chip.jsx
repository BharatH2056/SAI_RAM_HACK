// src/components/shared/Chip.jsx - Selectable category chip
import React from 'react';

export function Chip({
  label,
  icon: Icon,
  selected = false,
  onClick,
  disabled = false,
  className = '',
}) {
  return (
    <button
      type="button"
      className={`gh-chip ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: 'var(--gh-radius-full)',
        border: selected ? '2px solid var(--gh-accent)' : '1px solid var(--gh-border)',
        backgroundColor: selected ? 'var(--gh-accent-light)' : 'var(--gh-surface)',
        color: selected ? 'var(--gh-accent)' : 'var(--gh-text)',
        fontWeight: selected ? 700 : 500,
        fontSize: '0.88rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--gh-transition)',
        minHeight: '40px',
      }}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
}

export default Chip;
