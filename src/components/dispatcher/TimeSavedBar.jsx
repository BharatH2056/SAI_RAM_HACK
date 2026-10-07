// src/components/dispatcher/TimeSavedBar.jsx - Animated Door-to-Treatment comparison
import React from 'react';
import { Zap, Clock, AlertTriangle } from 'lucide-react';
import BigNumber from '../shared/BigNumber.jsx';
import './TimeSavedBar.css';

export function TimeSavedBar({
  timeSaved = null,
  nearestHospital = null,
  recommendedHospital = null,
  className = '',
}) {
  if (!timeSaved) {
    return (
      <div className={`gh-timesaved-panel ${className}`}>
        <div className="gh-timesaved-panel__title">
          <Clock size={16} color="var(--gh-accent)" aria-hidden="true" />
          <span>Time to Reach Capable Hospital</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--gh-text-muted)' }}>
          Select an emergency incident to calculate clinical time saved vs default routing.
        </p>
      </div>
    );
  }

  const {
    oldWayMinutes = 0,
    newWayMinutes = 0,
    savedMinutes = 0,
    nearestEta = 0,
    transferDelay = 10,
    etaNearestToRecommended = 0,
    assumptions,
  } = timeSaved;

  // Maximum scale for timeline bar normalization (at least 25 min)
  const maxMins = Math.max(oldWayMinutes, newWayMinutes, 25);

  const nearestCanTreat = savedMinutes === 0 && oldWayMinutes === newWayMinutes;

  return (
    <div className={`gh-timesaved-panel ${className}`} aria-labelledby="time-saved-title">
      <div className="gh-timesaved-panel__header">
        <div id="time-saved-title" className="gh-timesaved-panel__title">
          <Zap size={18} color="var(--gh-accent)" aria-hidden="true" />
          <span>Time to Reach Hospital That Can Treat</span>
        </div>
        <BigNumber
          value={savedMinutes > 0 ? `+${savedMinutes}` : '0'}
          unit="min"
          label={savedMinutes > 0 ? 'Saved' : 'Direct'}
          colorRole={savedMinutes > 0 ? 'accent' : 'muted'}
          size="sm"
        />
      </div>

      <div className="gh-timesaved-panel__bars">
        {/* Old Way Bar */}
        <div className="gh-timeline-row">
          <div className="gh-timeline-label-row">
            <span>
              Old Way: Default Nearest ({nearestHospital?.name || 'Nearest'})
            </span>
            <strong>{oldWayMinutes} min</strong>
          </div>
          <div className="gh-timeline-track" title={`Old Way total: ${oldWayMinutes} min`}>
            {nearestCanTreat ? (
              <div
                className="gh-timeline-segment"
                style={{
                  width: `${(oldWayMinutes / maxMins) * 100}%`,
                  backgroundColor: 'var(--gh-success)',
                }}
              >
                Direct ({oldWayMinutes}m)
              </div>
            ) : (
              <>
                <div
                  className="gh-timeline-segment gh-timeline-segment--old-leg1"
                  style={{ width: `${(nearestEta / maxMins) * 100}%` }}
                  title={`Leg 1 (to nearest): ${nearestEta}m`}
                >
                  Leg 1 ({nearestEta}m)
                </div>
                <div
                  className="gh-timeline-segment gh-timeline-segment--old-delay"
                  style={{ width: `${(transferDelay / maxMins) * 100}%` }}
                  title={`Transfer Decision Delay: ${transferDelay}m`}
                >
                  Transfer Delay ({transferDelay}m)
                </div>
                <div
                  className="gh-timeline-segment gh-timeline-segment--old-leg2"
                  style={{ width: `${(etaNearestToRecommended / maxMins) * 100}%` }}
                  title={`Inter-hospital Transit: ${etaNearestToRecommended}m`}
                >
                  Leg 2 ({etaNearestToRecommended}m)
                </div>
              </>
            )}
          </div>
        </div>

        {/* GoldenHour Bar */}
        <div className="gh-timeline-row">
          <div className="gh-timeline-label-row">
            <span style={{ color: 'var(--gh-accent)', fontWeight: 700 }}>
              GoldenHour: Direct Qualified ({recommendedHospital?.name || 'Recommended'})
            </span>
            <strong style={{ color: 'var(--gh-accent)' }}>{newWayMinutes} min</strong>
          </div>
          <div className="gh-timeline-track" title={`GoldenHour Direct Route: ${newWayMinutes} min`}>
            <div
              className="gh-timeline-segment gh-timeline-segment--golden"
              style={{ width: `${(newWayMinutes / maxMins) * 100}%` }}
            >
              Direct Journey ({newWayMinutes} min)
            </div>
          </div>
        </div>
      </div>

      {/* Numerical breakdown */}
      {!nearestCanTreat && (
        <div className="gh-timesaved-breakdown">
          <div className="gh-timesaved-breakdown-item">
            <span>Nearest ETA</span>
            <strong>{nearestEta} min</strong>
          </div>
          <div className="gh-timesaved-breakdown-item">
            <span>Transfer Delay</span>
            <strong>+{transferDelay} min</strong>
          </div>
          <div className="gh-timesaved-breakdown-item">
            <span>Transfer Transit</span>
            <strong>+{etaNearestToRecommended} min</strong>
          </div>
        </div>
      )}

      <div className="gh-timesaved-disclaimer">
        <em>Note:</em> The 10-minute inter-hospital transfer delay is an evidence-based clinical planning assumption.
        Calculations model travel and transfer triage delay only, not inside-hospital door-to-balloon time.
      </div>
    </div>
  );
}

export default TimeSavedBar;
