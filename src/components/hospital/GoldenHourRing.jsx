// src/components/hospital/GoldenHourRing.jsx - Signature Touch #1: Circular countdown ring
import React, { useState, useEffect } from 'react';
import './GoldenHourRing.css';

export function GoldenHourRing({
  initialMinutes = 10,
  size = 150,
  strokeWidth = 8,
  label = 'Golden Hour ETA',
  className = '',
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(
    Math.max(1, Math.round(Number(initialMinutes || 10) * 60))
  );

  // Sync if initialMinutes changes
  useEffect(() => {
    setSecondsRemaining(Math.max(1, Math.round(Number(initialMinutes || 10) * 60)));
  }, [initialMinutes]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalSeconds = Math.max(1, Math.round(Number(initialMinutes || 10) * 60));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / totalSeconds));
  const strokeDashoffset = circumference * (1 - progressRatio);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  const isUrgent = mins < 3;

  return (
    <div className={`gh-timer-ring-container ${className}`} style={{ width: size, height: size }}>
      <svg className="gh-timer-ring-svg" width={size} height={size}>
        <circle
          className="gh-timer-ring-circle-bg"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={`gh-timer-ring-circle-progress ${isUrgent ? 'gh-timer-ring-circle-progress--urgent' : ''}`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
      </svg>

      <div className="gh-timer-ring-content">
        <span className="gh-timer-ring-digits">{timeFormatted}</span>
        <span className="gh-timer-ring-label">{label}</span>
      </div>
    </div>
  );
}

export default GoldenHourRing;
