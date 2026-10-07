// src/config/env.js - Safe environment variable reader for Vite and Node.js

/**
 * Reads an environment variable safely in both Vite (browser) and Node.js environments.
 * @param {string} name - The environment variable key (e.g. 'VITE_FIREBASE_API_KEY')
 * @param {string} [defaultValue=''] - Optional fallback value
 * @returns {string} The environment variable value or defaultValue
 */
export function getEnv(name, defaultValue = '') {
  // 1. Browser under Vite: import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name] !== undefined) {
    return import.meta.env[name];
  }

  // 2. Node.js environment: process.env (guarded with typeof process !== 'undefined')
  if (typeof process !== 'undefined' && process && process.env && process.env[name] !== undefined) {
    return process.env[name];
  }

  return defaultValue;
}

export default getEnv;
