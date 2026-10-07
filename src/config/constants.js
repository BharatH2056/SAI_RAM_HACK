/**
 * GoldenHour System Constants & Configuration Parameters
 */

// Demo Scenario Configuration (Hebbal, Bangalore)
export const DEMO_LOCATION = {
  latitude: 13.0358,
  longitude: 77.5970,
  label: 'Hebbal, Bangalore',
};

// Ranking Engine Scoring Weights
export const RANKING_WEIGHTS = {
  // Base metric: ETA in drive minutes (1 minute = 1.0 score point)
  ETA_WEIGHT: 1.0,

  // Penalty if only 1 ICU bed is remaining.
  // When a hospital has just 1 ICU bed, there is a risk it may be filled before arrival,
  // so we add a modest penalty of +2 minutes equivalent to prefer safer capacity.
  LOW_BED_PENALTY: 2.0,

  // Bonus (reduction in score) if a preferred specialist for the emergency is currently on duty.
  // Immediate availability of a specialist saves crucial door-to-treatment minutes (-1.5 score points).
  SPECIALIST_ON_DUTY_BONUS: 1.5,
};

// Routing Service Parameters
export const ROUTING_CONFIG = {
  OSRM_API_URL: 'https://router.project-osrm.org',
  // 8-second timeout: OSRM public server from India can take 1–6 s on busy requests.
  // The test confirmed the API responds in ~1.1s; we set 8s to absorb network jitter
  // while still failing fast enough to fallback before a user notices.
  OSRM_TIMEOUT_MS: 8000,
  FALLBACK_AVERAGE_SPEED_KMH: 25, // Bangalore average traffic speed (25 km/h)
  FALLBACK_ROAD_CURVATURE_FACTOR: 1.4, // Urban road distance = straight line * 1.4
  CONCURRENCY_LIMIT: 5, // Max concurrent requests to public OSRM API
};

// Incident Status Lifecycle
export const INCIDENT_STATUSES = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  DISPATCHED: 'dispatched',
  ACCEPTED: 'accepted',
  ENROUTE: 'enroute',
  ARRIVED: 'arrived',
  CANCELLED: 'cancelled',
};

// Valid transitions between incident statuses
export const ALLOWED_STATUS_TRANSITIONS = {
  [INCIDENT_STATUSES.CREATED]: [INCIDENT_STATUSES.CONFIRMED, INCIDENT_STATUSES.CANCELLED],
  [INCIDENT_STATUSES.CONFIRMED]: [INCIDENT_STATUSES.DISPATCHED, INCIDENT_STATUSES.CANCELLED],
  [INCIDENT_STATUSES.DISPATCHED]: [INCIDENT_STATUSES.ACCEPTED, INCIDENT_STATUSES.CANCELLED],
  [INCIDENT_STATUSES.ACCEPTED]: [INCIDENT_STATUSES.ENROUTE],
  [INCIDENT_STATUSES.ENROUTE]: [INCIDENT_STATUSES.ARRIVED],
  [INCIDENT_STATUSES.ARRIVED]: [], // Terminal state
  [INCIDENT_STATUSES.CANCELLED]: [], // Terminal state
};

// Time Saved Service Defaults
export const TIME_SAVED_CONFIG = {
  // Estimated inter-hospital transfer delay when the initial nearest hospital cannot treat
  // (includes triage, realizing lack of capability, finding alternate, preparing ambulance transfer)
  DEFAULT_TRANSFER_DELAY_MINUTES: 10,
};

// Ambulance Simulator Defaults
export const SIMULATOR_CONFIG = {
  TICK_INTERVAL_MS: 2000, // Position update broadcast every 2 seconds
  DEFAULT_SPEED_MULTIPLIER: 8, // 8x speed for hackathon demo playback
};
