/**
 * GoldenHour Ranking Engine
 * Pure and deterministic ranking algorithm for emergency dispatch.
 * Filters hospitals by clinical capability, bed availability, and 24x7 status.
 *
 * For all candidates that pass clinical filters:
 * Fetches consistent road ETAs in a single batch using OSRM Table Service.
 * If OSRM is unavailable, falls back to straight-line for ALL candidates (never a mix).
 * Scores by travel ETA, ICU capacity risk, and specialist presence.
 */

import { getRules } from '../data/emergencyRules.js';
import { RANKING_WEIGHTS } from '../config/constants.js';
import { haversineDistanceKm, estimateDriveTimeMinutes } from '../utils/geo.js';
import { getTableEtas } from './routingService.js';

const ETA_DISCLAIMER = 'Estimated drive time without live traffic';

/**
 * Checks clinical capability requirements for a given emergency type.
 * @param {Object} hospital
 * @param {Object} rule
 * @returns {{ passed: boolean, reasons: string[] }}
 */
function evaluateCapability(hospital, rule) {
  const missing = [];

  if (!hospital.emergency_24x7) {
    missing.push('Not 24x7 emergency');
  }

  if (rule && rule.requiredCapabilities) {
    for (const cap of rule.requiredCapabilities) {
      if (!hospital[cap]) {
        if (cap === 'has_cath_lab') missing.push('No cath lab');
        else if (cap === 'has_stroke_unit') missing.push('No stroke unit');
        else if (cap === 'has_trauma_center') missing.push('No trauma center');
        else if (cap === 'has_blood_bank') missing.push('No blood bank');
        else if (cap === 'has_maternity') missing.push('No maternity unit');
        else if (cap === 'has_burn_unit') missing.push('No burn unit');
        else missing.push(`Missing ${cap}`);
      }
    }
  }

  const beds = Number(hospital.icu_beds_available ?? 0);
  if (beds <= 0) {
    missing.push('ICU full (0 beds)');
  }

  return {
    passed: missing.length === 0,
    reasons: missing,
  };
}

/**
 * Checks if any of the preferred specialists for the emergency are on duty.
 * @param {Object} hospital
 * @param {Object} rule
 * @returns {{ hasSpecialist: boolean, matchedSpecialist: string|null }}
 */
function checkSpecialistOnDuty(hospital, rule) {
  if (!rule || !rule.preferredSpecialists || !Array.isArray(hospital.specialists_on_duty)) {
    return { hasSpecialist: false, matchedSpecialist: null };
  }

  const dutyList = hospital.specialists_on_duty.map((s) => s.toLowerCase());
  for (const preferred of rule.preferredSpecialists) {
    const found = dutyList.find((s) => s.includes(preferred.toLowerCase()));
    if (found) {
      const formatted = found.charAt(0).toUpperCase() + found.slice(1);
      return { hasSpecialist: true, matchedSpecialist: formatted };
    }
  }

  return { hasSpecialist: false, matchedSpecialist: null };
}

/**
 * Pure ranking function for hospitals.
 * @param {Object} params
 * @param {string} params.emergencyType - e.g. 'heart_attack', 'stroke', 'trauma'
 * @param {{ lat?: number, lng?: number, latitude?: number, longitude?: number }} params.patientLocation
 * @param {Array<Object>} params.hospitals - List of candidate hospitals
 * @param {Function} [params.etaProvider] - Optional injected ETA provider: (from, hospital) => { etaMinutes, distanceKm }
 * @returns {Object|Promise<Object>} { recommended, excluded, nearestOverall, etaSource, etaDisclaimer }
 */
export function rankHospitals({ emergencyType, patientLocation, hospitals = [], etaProvider }) {
  if (!patientLocation) {
    throw new Error('patientLocation is required for ranking.');
  }

  const pLat = patientLocation.latitude ?? patientLocation.lat;
  const pLng = patientLocation.longitude ?? patientLocation.lng;

  if (typeof pLat !== 'number' || typeof pLng !== 'number') {
    throw new Error('Valid patientLocation with latitude and longitude is required.');
  }

  const rule = getRules(emergencyType);

  // 1. Filter hospitals by clinical capabilities & find geographically nearest hospital
  const excluded = [];
  const qualifiedHospitals = [];
  let nearestHospital = null;
  let minDistance = Infinity;

  hospitals.forEach((hospital) => {
    const dist = haversineDistanceKm(pLat, pLng, hospital.latitude, hospital.longitude);
    const capabilityEval = evaluateCapability(hospital, rule);

    if (dist < minDistance) {
      minDistance = dist;
      nearestHospital = {
        hospital,
        distanceKm: dist,
        canTreat: capabilityEval.passed,
        reason: capabilityEval.passed
          ? 'Equipped and ready for emergency'
          : capabilityEval.reasons.join(', '),
      };
    }

    if (!capabilityEval.passed) {
      excluded.push({
        hospital,
        distanceKm: dist,
        etaMinutes: estimateDriveTimeMinutes(dist),
        reason: capabilityEval.reasons.join(', '),
      });
    } else {
      qualifiedHospitals.push(hospital);
    }
  });

  // Helper to score and format qualified candidates given an ETA resolver map
  const scoreAndRank = (getEtaData, etaSource, distanceLabel) => {
    const qualifiedCandidates = [];

    qualifiedHospitals.forEach((hospital) => {
      const etaData = getEtaData(hospital);
      const etaMinutes = etaData.etaMinutes;
      const distanceKm = etaData.distanceKm;
      const source = etaData.source || etaSource;
      const distLabel = etaData.distanceLabel || distanceLabel;

      const beds = Number(hospital.icu_beds_available ?? 0);
      const specialistInfo = checkSpecialistOnDuty(hospital, rule);

      let score = etaMinutes * RANKING_WEIGHTS.ETA_WEIGHT;
      if (beds === 1) {
        score += RANKING_WEIGHTS.LOW_BED_PENALTY;
      }
      if (specialistInfo.hasSpecialist) {
        score -= RANKING_WEIGHTS.SPECIALIST_ON_DUTY_BONUS;
      }
      score = Number(score.toFixed(2));

      const reasons = [];
      if (rule && rule.requiredCapabilities) {
        const caps = rule.requiredCapabilities
          .map((c) => rule.capabilityLabels?.[c] || c)
          .join(' & ');
        reasons.push(`${caps} available`);
      }
      reasons.push(`${beds} ICU bed${beds > 1 ? 's' : ''} free`);
      if (specialistInfo.hasSpecialist) {
        reasons.push(`${specialistInfo.matchedSpecialist} on duty`);
      }
      if (beds === 1) {
        reasons.push('Low ICU capacity (1 bed left)');
      }
      reasons.push(`${etaMinutes} min away`);

      qualifiedCandidates.push({
        hospital,
        etaMinutes,
        distanceKm,
        score,
        reasons,
        source,
        distanceLabel: distLabel,
      });
    });

    // Sort ascending by score; tie-break by ETA
    qualifiedCandidates.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.etaMinutes - b.etaMinutes;
    });

    const recommended = qualifiedCandidates.slice(0, 3);

    let nearestOverall = null;
    if (nearestHospital) {
      const nearestEtaData = getEtaData(nearestHospital.hospital);
      nearestOverall = {
        ...nearestHospital,
        distanceKm: nearestEtaData.distanceKm ?? nearestHospital.distanceKm,
        etaMinutes: nearestEtaData.etaMinutes,
        source: nearestEtaData.source || etaSource,
        distanceLabel: nearestEtaData.distanceLabel || distanceLabel,
      };
    }

    return {
      recommended,
      excluded,
      nearestOverall,
      etaSource,
      etaDisclaimer: ETA_DISCLAIMER,
    };
  };

  // 2. If a custom etaProvider was injected:
  if (typeof etaProvider === 'function') {
    const sample = hospitals.length > 0 ? etaProvider(patientLocation, hospitals[0]) : null;
    const isAsync = sample && typeof sample.then === 'function';

    if (isAsync) {
      return Promise.all(
        [nearestHospital?.hospital, ...qualifiedHospitals].filter(Boolean).map(async (h) => {
          const res = await etaProvider(patientLocation, h);
          return [h.id || `${h.latitude},${h.longitude}`, res];
        })
      ).then((entries) => {
        const map = new Map(entries);
        return scoreAndRank(
          (h) => map.get(h.id || `${h.latitude},${h.longitude}`) || { etaMinutes: 1, distanceKm: 1 },
          'custom',
          'road'
        );
      });
    }

    // Synchronous etaProvider
    return scoreAndRank(
      (h) => etaProvider(patientLocation, h),
      'custom',
      'road'
    );
  }

  // 3. Default path: Fetch road ETAs for ALL candidates in a single OSRM Table request
  const tableDestinations = [nearestHospital?.hospital, ...qualifiedHospitals].filter(Boolean);

  return getTableEtas(patientLocation, tableDestinations).then((tableRes) => {
    return scoreAndRank(
      (h) => {
        const id = h.id || `${h.latitude ?? h.lat},${h.longitude ?? h.lng}`;
        return (
          tableRes.results.get(id) || {
            etaMinutes: estimateDriveTimeMinutes(
              haversineDistanceKm(pLat, pLng, h.latitude, h.longitude)
            ),
            distanceKm: haversineDistanceKm(pLat, pLng, h.latitude, h.longitude),
            source: tableRes.source,
            distanceLabel: tableRes.distanceLabel,
          }
        );
      },
      tableRes.source,
      tableRes.distanceLabel
    );
  });
}

export default rankHospitals;
