// src/components/shared/StatusBadge.jsx - Accessible state pill
import React from 'react';
import { Clock, CheckCircle, Navigation, AlertCircle, ShieldAlert, Check } from 'lucide-react';
import './StatusBadge.css';

const STATUS_CONFIG = {
  created: { label: 'Created', icon: Clock },
  confirmed: { label: 'Confirmed', icon: Check },
  dispatched: { label: 'Dispatched', icon: Navigation },
  accepted: { label: 'ER Ready', icon: CheckCircle },
  enroute: { label: 'En Route', icon: Navigation },
  arrived: { label: 'Arrived', icon: CheckCircle },
  cancelled: { label: 'Cancelled', icon: AlertCircle },
};

export function StatusBadge({ status = 'created', className = '' }) {
  const normStatus = (status || 'created').toLowerCase();
  const config = STATUS_CONFIG[normStatus] || { label: normStatus, icon: ShieldAlert };
  const Icon = config.icon;

  return (
    <span
      className={`gh-status-badge gh-status-badge--${normStatus} ${className}`}
      role="status"
    >
      <span className="gh-status-badge__dot" aria-hidden="true" />
      <Icon size={12} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

export default StatusBadge;
