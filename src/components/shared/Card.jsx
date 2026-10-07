// src/components/shared/Card.jsx - Surface card container
import React from 'react';
import './Card.css';

export function Card({
  children,
  className = '',
  interactive = false,
  recommended = false,
  selected = false,
  excluded = false,
  elevated = false,
  onClick,
  ...rest
}) {
  const classes = [
    'gh-card',
    interactive ? 'gh-card--interactive' : '',
    recommended ? 'gh-card--recommended' : '',
    selected ? 'gh-card--selected' : '',
    excluded ? 'gh-card--excluded' : '',
    elevated ? 'gh-card--elevated' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive && onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
