/**
 * GoldenHour Demo Scenario Runner
 *
 * Narrative:
 *  1. Caller SOS in Hebbal with heart attack symptoms → voice classified.
 *  2. Ranking engine filters hospitals by clinical capability & bed availability.
 *  3. Nearest hospital (Baptist / Columbia Asia) has NO cath lab — the "old way" failure.
 *  4. Apollo Bannerghatta and Mallya have 0 ICU beds → safely excluded.
 *  5. Equipped hospitals recommended; routes fetched via OSRM (road ETA) or Haversine fallback.
 *  6. Time saved = oldWay − newWay.
 *     oldWayMinutes = nearestEta + transferDelay + etaNearestToRecommended  (inter-hospital transfer)
 *     newWayMinutes = recommended hospital's OSRM route ETA  (must match exactly)
 */

import { DEMO_LOCATION } from '../config/constants.js';
import { rankHospitals } from './rankingEngine.js';
import { classifyEmergency } from './voiceClassifier.js';
import { calculateTimeSaved } from './timeSavedService.js';
import { getRoute } from './routingService.js';
import hospitalsSeedData from '../../data/goldenhour_hospitals_bangalore.json' with { type: 'json' };

function getSeedData() {
  return hospitalsSeedData.hospitals || hospitalsSeedData;
}

export async function runDemoScenario(options = {}) {
  const patientLocation = options.patientLocation || {
    lat: DEMO_LOCATION.latitude,
    lng: DEMO_LOCATION.longitude,
    label: DEMO_LOCATION.label,
  };

  const rawTranscript =
    options.transcript ||
    'Emergency! My father has severe chest pain, left arm pain and trouble breathing!';

  // 1. Voice Classification
  const classification = classifyEmergency(rawTranscript);
  const emergencyType = options.emergencyType || classification.type || 'heart_attack';

  // 2. Hospitals pool
  const hospitals = options.hospitals || getSeedData();

  // 3. Hospital Ranking (uses Haversine internally for scoring — no network)
  const ranking = await rankHospitals({
    emergencyType,
    patientLocation,
    hospitals,
  });

  const topRecommended = ranking.recommended[0];
  const nearest = ranking.nearestOverall;

  // 4. Fetch real road routes concurrently via OSRM (or Haversine fallback)
  let timeSavedResult = null;
  let recommendedRoute = null;
  let nearestRoute = null;
  let transferRoute = null;

  if (topRecommended && nearest) {
    [recommendedRoute, nearestRoute, transferRoute] = await Promise.all([
      // Route: patient → recommended hospital (the "new way" journey)
      getRoute(patientLocation, topRecommended.hospital),
      // Route: patient → nearest hospital (first leg of the "old way")
      getRoute(patientLocation, nearest.hospital),
      // Route: nearest hospital → recommended hospital (inter-hospital transfer leg)
      getRoute(nearest.hospital, topRecommended.hospital),
    ]);

    // Align the recommended hospital and nearest hospital ETAs/distances with their actual routes
    topRecommended.etaMinutes = recommendedRoute.etaMinutes;
    topRecommended.distanceKm = recommendedRoute.distanceKm;
    topRecommended.route = recommendedRoute;

    nearest.etaMinutes = nearestRoute.etaMinutes;
    nearest.distanceKm = nearestRoute.distanceKm;
    nearest.route = nearestRoute;

    // Synchronize reasons so string ETA matches the route ETA
    topRecommended.reasons = topRecommended.reasons.map((r) =>
      r.includes('min away') ? `${recommendedRoute.etaMinutes} min away` : r
    );

    // newWayMinutes MUST equal the recommended hospital's actual route ETA.
    // We pass recommendedRoute.etaMinutes directly — never the ranking score.
    timeSavedResult = calculateTimeSaved({
      nearestEta: nearestRoute.etaMinutes,
      recommendedEta: recommendedRoute.etaMinutes,
      etaNearestToRecommended: transferRoute.etaMinutes,
      nearestCanTreat: nearest.canTreat,
    });
  }

  return {
    scenario: 'Heart attack at Hebbal, Bangalore',
    patientLocation,
    transcript: rawTranscript,
    classification,
    emergencyType,
    ranking,
    recommendedHospital: topRecommended?.hospital || null,
    nearestHospital: nearest?.hospital || null,
    // Full route details (includes source: 'osrm'|'fallback' and distanceLabel)
    recommendedRoute,
    nearestRoute,
    transferRoute,
    timeSaved: timeSavedResult,
    etaSource: ranking.etaSource,
    etaDisclaimer: ranking.etaDisclaimer,
  };
}

export default runDemoScenario;
