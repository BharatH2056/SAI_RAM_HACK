/**
 * GoldenHour Time Saved Service
 *
 * Models the travel time difference between two dispatch strategies:
 *
 *  OLD WAY (blind nearest-hospital dispatch):
 *    Patient → Nearest Hospital (cannot treat)
 *      + transfer triage delay (assumed 10 min)
 *      + inter-hospital ambulance ride to equipped hospital
 *    Total = nearestEta + transferDelay + etaNearestToRecommended
 *
 *  NEW WAY (GoldenHour intelligent dispatch):
 *    Patient → Equipped Hospital directly
 *    Total = recommendedEta  ← this is the OSRM road ETA, unchanged
 *
 *  saved = oldWayMinutes − newWayMinutes
 *
 * NOTE: We model *travel time only*. "Time to reach a hospital that can treat" is
 * the metric — not treatment time, which we cannot measure.
 *
 * Honesty rule: if the nearest hospital CAN treat (nearestCanTreat=true),
 * savedMinutes = 0.  We never inflate the number.
 */

import { TIME_SAVED_CONFIG } from '../config/constants.js';

/**
 * @param {Object} params
 * @param {number} params.nearestEta               - Drive minutes: patient → nearest hospital
 * @param {number} params.recommendedEta           - Drive minutes: patient → recommended hospital
 *                                                   (must equal the OSRM route ETA exactly)
 * @param {number} params.etaNearestToRecommended  - Drive minutes: nearest → recommended (transfer leg)
 * @param {number} [params.transferDelayMinutes=10]- Triage/admin delay at the wrong hospital
 * @param {boolean}[params.nearestCanTreat=false]  - True → nearest is capable, no transfer needed
 *
 * @returns {{
 *   nearestEta: number,
 *   transferDelay: number,
 *   etaNearestToRecommended: number,
 *   oldWayMinutes: number,
 *   newWayMinutes: number,
 *   savedMinutes: number,
 *   assumptions: Object
 * }}
 */
export function calculateTimeSaved({
  nearestEta = 0,
  recommendedEta = 0,
  etaNearestToRecommended = 0,
  transferDelayMinutes = TIME_SAVED_CONFIG.DEFAULT_TRANSFER_DELAY_MINUTES,
  nearestCanTreat = false,
}) {
  const n   = Math.max(0, Number(nearestEta));
  const rec = Math.max(0, Number(recommendedEta));
  const td  = Math.max(0, Number(transferDelayMinutes));
  const tr  = Math.max(0, Number(etaNearestToRecommended));

  // Case 1: Nearest can treat — no diversion, no time saved.
  if (nearestCanTreat) {
    return {
      nearestEta: n,
      transferDelay: 0,
      etaNearestToRecommended: 0,
      oldWayMinutes: Number(n.toFixed(1)),
      newWayMinutes: Number(rec.toFixed(1)),
      savedMinutes: 0,
      assumptions: {
        nearestCanTreat: true,
        transferDelayMinutes: 0,
        isTransferDelayAssumed: false,
        note: 'The nearest hospital has all required clinical capabilities. No diversion needed. Time saved = 0.',
      },
    };
  }

  // Case 2: Old way requires a secondary transfer.
  //   oldWayMinutes = nearestEta + transferDelay + etaNearestToRecommended
  const oldWayMinutes = Number((n + td + tr).toFixed(1));
  // newWayMinutes = recommendedEta (the OSRM road ETA passed in — not the ranking score)
  const newWayMinutes = Number(rec.toFixed(1));
  const savedMinutes  = Number(Math.max(0, oldWayMinutes - newWayMinutes).toFixed(1));

  return {
    // Full breakdown — every input is echoed so callers can audit the math
    nearestEta: Number(n.toFixed(1)),
    transferDelay: Number(td.toFixed(1)),
    etaNearestToRecommended: Number(tr.toFixed(1)),
    oldWayMinutes,
    newWayMinutes,
    savedMinutes,
    assumptions: {
      nearestCanTreat: false,
      transferDelayMinutes: td,
      isTransferDelayAssumed: true,
      note:
        'transferDelay is a conservative clinical assumption covering ER triage at the incapable ' +
        'hospital, realising it cannot treat, locating an alternative, and re-dispatching. ' +
        'It is NOT measured from live data.',
    },
  };
}

export default calculateTimeSaved;
