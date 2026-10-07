// src/components/shared/BigNumber.jsx - Prominent metric display
import React from 'react';
import './BigNumber.css';

export function BigNumber({
  value,
  unit,
  label,
  colorRole = 'default',
  size = 'md',
  className = '',
}) {
  const classes = [
    'gh-bignumber',
    `gh-bignumber--${size}`,
    colorRole !== 'default' ? `gh-bignumber--${colorRole}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="gh-bignumber__value-wrap">
        <span className="gh-bignumber__value">{value}</span>
        {unit && <span className="gh-bignumber__unit">{unit}</span>}
      </div>
      {label && <span className="gh-bignumber__label">{label}</span>}
    </div>
  );
}

export default BigNumber;
