/**
 * GoldenHour Routing Service
 * Connects to the public OSRM Routing API with an automatic 8-second timeout and one retry,
 * an in-memory rounded-coordinate cache, parallel concurrency throttling,
 * OSRM Table Service for multi-destination batch routing,
 * and an automatic Haversine + road factor fallback.
 * Guaranteed never to throw to the caller.
 */

import { ROUTING_CONFIG } from '../config/constants.js';
import {
  haversineDistanceKm,
  estimateDriveTimeMinutes,
  generateStraightLineGeometry,
} from '../utils/geo.js';

// In-memory caches for route and table calculations
const routeCache = new Map();
const tableCache = new Map();

const ETA_DISCLAIMER = 'Estimated drive time without live traffic';

/**
 * Extracts numeric latitude and longitude from coordinate or hospital object.
 * @param {Object} pt
 * @returns {{ lat: number, lng: number }}
 */
function extractCoords(pt) {
  if (!pt) return { lat: 0, lng: 0 };
  const lat = pt.latitude ?? pt.lat ?? 0;
  const lng = pt.longitude ?? pt.lng ?? 0;
  return { lat: Number(lat), lng: Number(lng) };
}

/**
 * Generates cache key using coordinates rounded to 4 decimal places (~11 meters).
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @returns {string}
 */
function getCacheKey(from, to) {
  return `${from.lat.toFixed(4)},${from.lng.toFixed(4)}->${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
}

/**
 * Generates fallback route using Haversine calculation and road curvature.
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @returns {{ etaMinutes: number, distanceKm: number, distanceLabel: string, geometry: Array<[number, number]>, source: 'fallback' }}
 */
export function getFallbackRoute(from, to) {
  const distanceKm = haversineDistanceKm(from.lat, from.lng, to.lat, to.lng);
  const etaMinutes = estimateDriveTimeMinutes(
    distanceKm,
    ROUTING_CONFIG.FALLBACK_ROAD_CURVATURE_FACTOR,
    ROUTING_CONFIG.FALLBACK_AVERAGE_SPEED_KMH
  );
  const geometry = generateStraightLineGeometry(from, to, 10);

  return {
    etaMinutes,
    distanceKm,
    distanceLabel: 'straight-line',
    geometry,
    source: 'fallback',
  };
}

/**
 * Attempts a single OSRM fetch with a given timeout signal.
 * Returns a result object on success, throws on failure.
 */
async function attemptOsrmFetch(fromCoords, toCoords, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // OSRM requires coordinates as: {longitude},{latitude}
    const url = `${ROUTING_CONFIG.OSRM_API_URL}/route/v1/driving/${fromCoords.lng},${fromCoords.lat};${toCoords.lng},${toCoords.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GoldenHour/1.0 (Bangalore Emergency Dispatch)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM bad response: code=${data?.code || 'empty'}`);
    }

    const route = data.routes[0];
    const etaMinutes = Number(Math.max(1.0, route.duration / 60).toFixed(1));
    const distanceKm = Number((route.distance / 1000).toFixed(2));

    // OSRM GeoJSON coordinates are [lng, lat] → convert to [lat, lng]
    const geometry = (route.geometry?.coordinates || []).map(([lng, lat]) => [
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
    ]);

    return {
      etaMinutes,
      distanceKm,
      distanceLabel: 'road',
      geometry: geometry.length > 0 ? geometry : generateStraightLineGeometry(fromCoords, toCoords),
      source: 'osrm',
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err; // re-throw so caller decides whether to retry
  }
}

/**
 * Retrieves driving route and ETA between two locations.
 * Tries OSRM once, retries once on failure, then falls back to Haversine.
 * Never throws to the caller.
 *
 * @param {Object} from - { latitude, longitude } or { lat, lng }
 * @param {Object} to   - { latitude, longitude } or { lat, lng }
 * @returns {Promise<{ etaMinutes, distanceKm, distanceLabel, geometry, source }>}
 */
export async function getRoute(from, to) {
  const fromCoords = extractCoords(from);
  const toCoords = extractCoords(to);

  // Cache check
  const cacheKey = getCacheKey(fromCoords, toCoords);
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // Same-location edge case
  if (fromCoords.lat === toCoords.lat && fromCoords.lng === toCoords.lng) {
    const zeroResult = {
      etaMinutes: 0.5,
      distanceKm: 0.1,
      distanceLabel: 'straight-line',
      geometry: [[fromCoords.lat, fromCoords.lng]],
      source: 'fallback',
    };
    routeCache.set(cacheKey, zeroResult);
    return zeroResult;
  }

  // Try OSRM with one retry
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await attemptOsrmFetch(fromCoords, toCoords, ROUTING_CONFIG.OSRM_TIMEOUT_MS);
      routeCache.set(cacheKey, result);
      return result;
    } catch (err) {
      if (attempt === 1) {
        console.warn(`[Routing] OSRM attempt ${attempt} failed (${err.message}), retrying...`);
      }
    }
  }

  // Haversine fallback
  const fallbackResult = getFallbackRoute(fromCoords, toCoords);
  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Fetches ETAs and distances for multiple destinations in a single OSRM Table Service request.
 * If OSRM succeeds, returns road ETAs for ALL destinations with source: 'osrm'.
 * If OSRM fails (after 1 retry), returns straight-line fallback for ALL destinations with source: 'fallback'.
 * Never returns a mix of sources for the same batch.
 *
 * @param {Object} from - Patient location { lat, lng }
 * @param {Array<Object>} destinations - Array of hospital destinations
 * @returns {Promise<{
 *   source: 'osrm' | 'fallback',
 *   distanceLabel: 'road' | 'straight-line',
 *   etaDisclaimer: string,
 *   results: Map<string, { etaMinutes: number, distanceKm: number, source: string, distanceLabel: string }>
 * }>}
 */
export async function getTableEtas(from, destinations = []) {
  const fromCoords = extractCoords(from);

  if (!destinations || destinations.length === 0) {
    return {
      source: 'osrm',
      distanceLabel: 'road',
      etaDisclaimer: ETA_DISCLAIMER,
      results: new Map(),
    };
  }

  // Deduplicate destinations
  const uniqueDestinations = [];
  const seenIds = new Set();
  for (const d of destinations) {
    const coords = extractCoords(d);
    const id = d.id || `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
    if (!seenIds.has(id)) {
      seenIds.add(id);
      uniqueDestinations.push(d);
    }
  }

  // Cache key
  const cacheKey = `table:${fromCoords.lat.toFixed(4)},${fromCoords.lng.toFixed(4)}->${uniqueDestinations
    .map((d) => d.id || `${extractCoords(d).lat.toFixed(4)},${extractCoords(d).lng.toFixed(4)}`)
    .sort()
    .join(';')}`;

  if (tableCache.has(cacheKey)) {
    return tableCache.get(cacheKey);
  }

  // Build OSRM Table API request: source is index 0
  const coordsList = [fromCoords, ...uniqueDestinations.map(extractCoords)];
  const coordsParam = coordsList.map((c) => `${c.lng},${c.lat}`).join(';');
  const url = `${ROUTING_CONFIG.OSRM_API_URL}/table/v1/driving/${coordsParam}?sources=0&annotations=duration,distance`;

  let tableData = null;
  const timeoutMs = 5000;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GoldenHour/1.0 (Bangalore Emergency Dispatch)',
          Accept: 'application/json',
        },
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`OSRM Table HTTP status ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      if (!json || json.code !== 'Ok' || !Array.isArray(json.durations) || !Array.isArray(json.distances)) {
        throw new Error(`OSRM Table bad response: code=${json?.code || 'empty'}`);
      }

      tableData = json;
      break;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === 1) {
        console.warn(`[Routing] OSRM Table attempt 1 failed (${err.message}), retrying...`);
      } else {
        console.warn(`[Routing] OSRM Table attempt 2 failed (${err.message}). Using fallback for ALL candidates.`);
      }
    }
  }

  // If OSRM table succeeded:
  if (tableData) {
    const results = new Map();
    uniqueDestinations.forEach((dest, idx) => {
      // duration from source (0) to destination (idx + 1)
      const durationSec = tableData.durations[0]?.[idx + 1];
      const distanceMeters = tableData.distances[0]?.[idx + 1];
      const coords = extractCoords(dest);
      const id = dest.id || `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;

      if (typeof durationSec === 'number' && typeof distanceMeters === 'number') {
        results.set(id, {
          etaMinutes: Number(Math.max(1.0, durationSec / 60).toFixed(1)),
          distanceKm: Number((distanceMeters / 1000).toFixed(2)),
          source: 'osrm',
          distanceLabel: 'road',
        });
      } else {
        const fb = getFallbackRoute(fromCoords, coords);
        results.set(id, {
          etaMinutes: fb.etaMinutes,
          distanceKm: fb.distanceKm,
          source: 'osrm',
          distanceLabel: 'road',
        });
      }
    });

    const response = {
      source: 'osrm',
      distanceLabel: 'road',
      etaDisclaimer: ETA_DISCLAIMER,
      results,
    };
    tableCache.set(cacheKey, response);
    return response;
  }

  // Fallback for ALL candidates (never a mix!)
  const results = new Map();
  uniqueDestinations.forEach((dest) => {
    const coords = extractCoords(dest);
    const fb = getFallbackRoute(fromCoords, coords);
    const id = dest.id || `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
    results.set(id, {
      etaMinutes: fb.etaMinutes,
      distanceKm: fb.distanceKm,
      source: 'fallback',
      distanceLabel: 'straight-line',
    });
  });

  const response = {
    source: 'fallback',
    distanceLabel: 'straight-line',
    etaDisclaimer: ETA_DISCLAIMER,
    results,
  };
  tableCache.set(cacheKey, response);
  return response;
}

/**
 * Calculates ETAs for an array of candidate hospitals with concurrency control.
 * @param {Object} from - Patient location
 * @param {Array<Object>} hospitals - Target hospitals
 * @returns {Promise<Array<Object>>} Array of route results in the same order as input
 */
export async function getEtasForMany(from, hospitals = []) {
  if (!hospitals || hospitals.length === 0) {
    return [];
  }

  const results = new Array(hospitals.length);
  const concurrency = ROUTING_CONFIG.CONCURRENCY_LIMIT || 5;

  let currentIndex = 0;
  async function worker() {
    while (currentIndex < hospitals.length) {
      const idx = currentIndex++;
      const hospital = hospitals[idx];
      try {
        const route = await getRoute(from, hospital);
        results[idx] = { hospitalId: hospital.id, hospital, ...route };
      } catch {
        const fallback = getFallbackRoute(extractCoords(from), extractCoords(hospital));
        results[idx] = { hospitalId: hospital.id, hospital, ...fallback };
      }
    }
  }

  const workers = [];
  const workerCount = Math.min(concurrency, hospitals.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

/**
 * Clears in-memory caches (for testing/resetting).
 */
export function clearRouteCache() {
  routeCache.clear();
  tableCache.clear();
}
