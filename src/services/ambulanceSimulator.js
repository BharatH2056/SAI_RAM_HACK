/**
 * GoldenHour Ambulance Simulator
 * Simulates real-time ambulance GPS movement along a route geometry polyline,
 * broadcasting periodic coordinates to Firestore and invoking markArrived upon completion.
 */

import { SIMULATOR_CONFIG } from '../config/constants.js';
import { updateAmbulancePosition, markArrived } from './incidentService.js';

// Map of currently active simulation timers: incidentId -> { timerId, isRunning }
const activeSimulations = new Map();

/**
 * Starts virtual ambulance tracking simulation along a route geometry.
 * @param {string} incidentId 
 * @param {Array<[number, number]>} routeGeometry - Array of [lat, lng] points
 * @param {number} [speedMultiplier=8] - Simulation speedup factor
 * @param {Object} [options]
 * @param {Function} [options.onPositionUpdate] - Optional local callback per tick
 * @param {Function} [options.onComplete] - Optional completion callback
 * @returns {{ stop: Function }} Controller to abort simulation early
 */
export function startSimulation(
  incidentId,
  routeGeometry = [],
  speedMultiplier = SIMULATOR_CONFIG.DEFAULT_SPEED_MULTIPLIER,
  options = {}
) {
  if (!incidentId) {
    throw new Error('incidentId is required to start ambulance simulation.');
  }

  // Stop any existing simulation for this incident
  stopSimulation(incidentId);

  if (!Array.isArray(routeGeometry) || routeGeometry.length === 0) {
    console.warn(`[AmbulanceSimulator] Empty route geometry for incident ${incidentId}.`);
    return { stop: () => {} };
  }

  let currentIndex = 0;
  const totalPoints = routeGeometry.length;

  // Calculate step progression per tick based on multiplier
  // Higher multiplier traverses more points per 2-second interval
  const stepPerTick = Math.max(1, Math.round(speedMultiplier / 2));

  console.log(
    `[AmbulanceSimulator] Starting simulation for ${incidentId}: ${totalPoints} points at ${speedMultiplier}x speed.`
  );

  const timerId = setInterval(async () => {
    try {
      const point = routeGeometry[currentIndex];
      const position = { lat: point[0], lng: point[1] };

      // Push position update
      await updateAmbulancePosition(incidentId, position);
      if (typeof options.onPositionUpdate === 'function') {
        options.onPositionUpdate(position, currentIndex, totalPoints);
      }

      currentIndex += stepPerTick;

      // Completed route
      if (currentIndex >= totalPoints) {
        // Ensure final destination point is written
        const finalPoint = routeGeometry[totalPoints - 1];
        await updateAmbulancePosition(incidentId, { lat: finalPoint[0], lng: finalPoint[1] });

        stopSimulation(incidentId);
        console.log(`[AmbulanceSimulator] Incident ${incidentId} arrived at hospital!`);

        await markArrived(incidentId);
        if (typeof options.onComplete === 'function') {
          options.onComplete();
        }
      }
    } catch (err) {
      console.error(`[AmbulanceSimulator] Error during tick for ${incidentId}:`, err.message);
    }
  }, SIMULATOR_CONFIG.TICK_INTERVAL_MS);

  activeSimulations.set(incidentId, { timerId, isRunning: true });

  return {
    stop: () => stopSimulation(incidentId),
  };
}

/**
 * Stops an ongoing ambulance simulation for an incident and clears its timer.
 * @param {string} incidentId 
 * @returns {boolean} Whether an active simulation was found and cleared
 */
export function stopSimulation(incidentId) {
  if (!incidentId) return false;

  const sim = activeSimulations.get(incidentId);
  if (sim) {
    clearInterval(sim.timerId);
    activeSimulations.delete(incidentId);
    console.log(`[AmbulanceSimulator] Stopped simulation for ${incidentId}.`);
    return true;
  }
  return false;
}

/**
 * Checks if a simulation is currently active for an incident.
 * @param {string} incidentId 
 * @returns {boolean}
 */
export function isSimulationActive(incidentId) {
  return activeSimulations.has(incidentId);
}

/**
 * Clears all active simulations (useful during tests and app unmount).
 */
export function stopAllSimulations() {
  for (const [incidentId] of activeSimulations) {
    stopSimulation(incidentId);
  }
}
