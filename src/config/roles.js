// src/config/roles.js
// Single source of truth for email → role and hospitalId mapping.
// Used by: src/auth/AuthContext.jsx (browser) and firestore.rules (server).
// DO NOT import Node-only or Firebase-server modules here.

/**
 * @type {Record<string, { role: 'dispatcher'|'hospital'|'driver'|'admin', hospitalId?: string }>}
 */
export const EMAIL_ROLE_MAP = {
  'dispatcher@goldenhour.demo': { role: 'dispatcher' },
  'driver@goldenhour.demo':     { role: 'driver' },
  'admin@goldenhour.demo':      { role: 'admin' },

  // Hospital accounts — IDs sourced from data/goldenhour_hospitals_bangalore.json
  'ramaiah@goldenhour.demo':         { role: 'hospital', hospitalId: 'H23' }, // Ramaiah Memorial Hospital
  'fortis.cunningham@goldenhour.demo': { role: 'hospital', hospitalId: 'H08' }, // Fortis Hospital (Cunningham Road)
  'aster@goldenhour.demo':           { role: 'hospital', hospitalId: 'H11' }, // Aster CMI Hospital
};

/**
 * Resolve role and hospitalId from a Firebase Auth user email.
 * Returns { role: 'unknown', hospitalId: null } for unmapped emails.
 * @param {string|null|undefined} email
 * @returns {{ role: string, hospitalId: string|null }}
 */
export function getRoleForEmail(email) {
  if (!email) return { role: 'unknown', hospitalId: null };
  const entry = EMAIL_ROLE_MAP[email.toLowerCase().trim()];
  if (!entry) return { role: 'unknown', hospitalId: null };
  return { role: entry.role, hospitalId: entry.hospitalId || null };
}

/**
 * All demo account emails in display order.
 * Used by Login page one-click buttons.
 */
export const DEMO_ACCOUNTS = [
  { email: 'dispatcher@goldenhour.demo', label: 'Login as Dispatcher',       role: 'dispatcher' },
  { email: 'ramaiah@goldenhour.demo',    label: 'Login as Ramaiah ER',        role: 'hospital',   hospitalId: 'H23' },
  { email: 'fortis.cunningham@goldenhour.demo', label: 'Login as Fortis ER', role: 'hospital',   hospitalId: 'H08' },
  { email: 'aster@goldenhour.demo',      label: 'Login as Aster ER',          role: 'hospital',   hospitalId: 'H11' },
  { email: 'driver@goldenhour.demo',     label: 'Login as Ambulance Driver',  role: 'driver' },
];

/**
 * Redirect path for a given role after successful login.
 * @param {string} role
 * @returns {string}
 */
export function getHomeForRole(role) {
  switch (role) {
    case 'dispatcher': return '/dispatcher';
    case 'hospital':   return '/hospital';
    case 'driver':     return '/driver';
    case 'admin':      return '/dispatcher'; // admins default to dispatcher view
    default:           return '/';
  }
}
