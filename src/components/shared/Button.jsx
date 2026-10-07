// src/components/shared/Button.jsx - Accessible button primitive
import React from 'react';
import './Button.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  icon = null,
  ...rest
}) {
  const classes = [
    'gh-btn',
    `gh-btn--${variant}`,
    `gh-btn--${size}`,
    fullWidth ? 'gh-btn--full' : '',
    loading ? 'gh-btn--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <span className="gh-btn__spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="gh-btn__icon" aria-hidden="true">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}

export default Button;
