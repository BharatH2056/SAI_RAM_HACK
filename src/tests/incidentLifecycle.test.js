import { describe, it, expect } from 'vitest';
import { isTransitionAllowed } from '../services/incidentService.js';
import { INCIDENT_STATUSES } from '../config/constants.js';

describe('Incident Lifecycle & State Transitions', () => {
  it('allows valid linear lifecycle transitions', () => {
    expect(isTransitionAllowed(INCIDENT_STATUSES.CREATED, INCIDENT_STATUSES.CONFIRMED)).toBe(true);
    expect(isTransitionAllowed(INCIDENT_STATUSES.CONFIRMED, INCIDENT_STATUSES.DISPATCHED)).toBe(true);
    expect(isTransitionAllowed(INCIDENT_STATUSES.DISPATCHED, INCIDENT_STATUSES.ACCEPTED)).toBe(true);
    expect(isTransitionAllowed(INCIDENT_STATUSES.ACCEPTED, INCIDENT_STATUSES.ENROUTE)).toBe(true);
    expect(isTransitionAllowed(INCIDENT_STATUSES.ENROUTE, INCIDENT_STATUSES.ARRIVED)).toBe(true);
  });

  it('allows cancellation from created, confirmed, or dispatched states', () => {
    expect(isTransitionAllowed(INCIDENT_STATUSES.CREATED, INCIDENT_STATUSES.CANCELLED)).toBe(true);
    expect(isTransitionAllowed(INCIDENT_STATUSES.CONFIRMED, INCIDENT_STATUSES.CANCELLED)).toBe(true);
    expect(isTransitionAllowed(INCIDENT_STATUSES.DISPATCHED, INCIDENT_STATUSES.CANCELLED)).toBe(true);
  });

  it('rejects invalid or out-of-order state transitions', () => {
    // Skipping stages
    expect(isTransitionAllowed(INCIDENT_STATUSES.CREATED, INCIDENT_STATUSES.ARRIVED)).toBe(false);
    expect(isTransitionAllowed(INCIDENT_STATUSES.CONFIRMED, INCIDENT_STATUSES.ENROUTE)).toBe(false);
    expect(isTransitionAllowed(INCIDENT_STATUSES.CREATED, INCIDENT_STATUSES.ACCEPTED)).toBe(false);

    // Reversing states
    expect(isTransitionAllowed(INCIDENT_STATUSES.ARRIVED, INCIDENT_STATUSES.ENROUTE)).toBe(false);
    expect(isTransitionAllowed(INCIDENT_STATUSES.ENROUTE, INCIDENT_STATUSES.DISPATCHED)).toBe(false);

    // Transitions from terminal states
    expect(isTransitionAllowed(INCIDENT_STATUSES.ARRIVED, INCIDENT_STATUSES.CREATED)).toBe(false);
    expect(isTransitionAllowed(INCIDENT_STATUSES.CANCELLED, INCIDENT_STATUSES.CONFIRMED)).toBe(false);

    // Disallowing cancellation once en route or arrived
    expect(isTransitionAllowed(INCIDENT_STATUSES.ENROUTE, INCIDENT_STATUSES.CANCELLED)).toBe(false);
    expect(isTransitionAllowed(INCIDENT_STATUSES.ARRIVED, INCIDENT_STATUSES.CANCELLED)).toBe(false);
  });
});
