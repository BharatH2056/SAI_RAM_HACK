#!/usr/bin/env node
/**
 * GoldenHour Realtime Check
 *
 * Verifies the full round-trip of:
 *   1. Firebase subscription → live hospital snapshot
 *   2. OSRM ranking using live Firestore data
 *   3. updateHospitalStatus → subscription detects change in N ms
 *   4. Re-ranking with changed data confirms exclusion
 *   5. Restore → re-ranking confirms Ramaiah is back
 *
 * Always restores original values even on error.
 * Prints PASS / FAIL per step at the end.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db }                                     from '../src/config/firebase.js';
import { subscribeToHospitals, updateHospitalStatus } from '../src/services/hospitalService.js';
import { rankHospitals }                           from '../src/services/rankingEngine.js';
import { clearRouteCache }                         from '../src/services/routingService.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const RAMAIAH_ID      = 'H23';
const RAMAIAH_NAME    = 'Ramaiah Memorial Hospital';
const ORIGINAL_BEDS   = 5;
const PATIENT_LOCATION = { lat: 13.0358, lng: 77.5970 };

// ── Helpers ────────────────────────────────────────────────────────────────────
function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function log(msg) {
  console.log(`[${now()}] ${msg}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a heart-attack ranking with the given hospital list and return
 * a concise summary: top-1 name + Ramaiah's status.
 */
async function runRanking(hospitals) {
  clearRouteCache();
  const result = await rankHospitals({
    emergencyType:   'heart_attack',
    patientLocation: PATIENT_LOCATION,
    hospitals,
  });

  const topOne       = result.recommended[0];
  const ramaiahRec   = result.recommended.find(
    (r) => r.hospital.id === RAMAIAH_ID || r.hospital.name === RAMAIAH_NAME
  );
  const ramaiahExcl  = result.excluded.find(
    (e) => e.hospital.id === RAMAIAH_ID || e.hospital.name === RAMAIAH_NAME
  );

  return {
    topOne,
    ramaiahStatus: ramaiahRec
      ? { where: 'recommended', entry: ramaiahRec }
      : ramaiahExcl
        ? { where: 'excluded',    entry: ramaiahExcl }
        : { where: 'missing',     entry: null },
    etaSource: result.etaSource,
    result,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('              GOLDENHOUR REALTIME CHECK                         ');
  console.log('════════════════════════════════════════════════════════════════');

  // ── Step 0: authenticate as admin & print projectId ─────────────────────
  const { ensureAdminAuth } = await import('./authHelper.js');
  await ensureAdminAuth();

  const projectId = db.app.options.projectId;
  log(`Firebase projectId: ${projectId}`);


  // ── State tracking ────────────────────────────────────────────────────────
  const stepResults = {
    step1_subscription_receives_data:         null, // PASS / FAIL
    step2_initial_ranking:                    null,
    step3_update_propagation_ms:              null,
    step3_update_detected_in_time:            null,
    step4_ranking_after_set_to_zero:          null,
    step5_restore_detected:                   null,
    step5_ranking_after_restore:              null,
  };

  let latestHospitals     = [];
  let unsubscribe         = null;
  let updateWrittenAt     = null;
  let updateDetectedAt    = null;
  let restoreWrittenAt    = null;
  let restoreDetectedAt   = null;
  let snapshotCount       = 0;

  // Promises that resolve when the subscription reports specific changes
  let resolveUpdateDetected  = null;
  let resolveRestoreDetected = null;
  const updateDetectedP  = new Promise((res) => { resolveUpdateDetected  = res; });
  const restoreDetectedP = new Promise((res) => { resolveRestoreDetected = res; });

  // Flags so we don't resolve the same promise twice
  let updateResolved  = false;
  let restoreResolved = false;

  // ── Step 1: Subscribe ─────────────────────────────────────────────────────
  log('Step 1 · Subscribing to "hospitals" collection…');

  const firstSnapshotP = new Promise((resolveFirst) => {
    unsubscribe = subscribeToHospitals(
      (hospitals) => {
        snapshotCount++;
        const ts = now();

        // Always keep the latest list
        latestHospitals = hospitals;

        // Log every snapshot concisely (name + beds for hospitals that changed)
        const ramaiah = hospitals.find(
          (h) => h.id === RAMAIAH_ID || h.name === RAMAIAH_NAME
        );
        const bedsStr = ramaiah ? `${ramaiah.icu_beds_available} ICU beds` : 'not found';
        log(
          `  📡 Snapshot #${snapshotCount}  |  ${hospitals.length} hospitals  ` +
          `|  ${RAMAIAH_NAME}: ${bedsStr}`
        );

        // Resolve first-snapshot promise (Step 1)
        if (snapshotCount === 1) {
          resolveFirst(hospitals);
        }

        // Detect the update to 0 beds (Step 3)
        if (
          !updateResolved &&
          updateWrittenAt !== null &&
          ramaiah &&
          ramaiah.icu_beds_available === 0
        ) {
          updateResolved = true;
          updateDetectedAt = Date.now();
          resolveUpdateDetected(hospitals);
        }

        // Detect the restore to ORIGINAL_BEDS (Step 5)
        if (
          !restoreResolved &&
          restoreWrittenAt !== null &&
          ramaiah &&
          ramaiah.icu_beds_available === ORIGINAL_BEDS
        ) {
          restoreResolved = true;
          restoreDetectedAt = Date.now();
          resolveRestoreDetected(hospitals);
        }
      },
      (err) => {
        log(`[ERROR] Subscription error: ${err.message}`);
      }
    );
  });

  // Wait for the first snapshot (with timeout safety)
  const firstHospitals = await Promise.race([
    firstSnapshotP,
    sleep(15000).then(() => null),
  ]);

  if (!firstHospitals || firstHospitals.length === 0) {
    log('✗ FAIL: No hospitals received in first snapshot. Check Firestore rules and seed.');
    stepResults.step1_subscription_receives_data = 'FAIL (no data)';
    printSummary(stepResults);
    unsubscribe?.();
    process.exit(1);
  }
  log(`  ✓ First snapshot: ${firstHospitals.length} hospitals received.`);
  stepResults.step1_subscription_receives_data = 'PASS';

  // ── Step 2: Initial ranking ───────────────────────────────────────────────
  log('\nStep 2 · Running initial heart-attack ranking…');
  const initialRanking = await runRanking(firstHospitals);
  const top1 = initialRanking.topOne;

  log(`  ETA source  : ${initialRanking.etaSource}`);
  log(`  #1 Recommended: ${top1?.hospital.name ?? '(none)'}`);
  if (top1) {
    log(
      `  Route       : ${top1.etaMinutes} min  ${top1.distanceKm} km  ` +
      `[${top1.source}]`
    );
  }

  const ramaiah0 = initialRanking.ramaiahStatus;
  log(`  ${RAMAIAH_NAME}: ${ramaiah0.where.toUpperCase()}`);
  if (ramaiah0.where === 'recommended') {
    log(`    Reasons : ${ramaiah0.entry.reasons.join(' | ')}`);
  } else if (ramaiah0.where === 'excluded') {
    log(`    Reason  : ${ramaiah0.entry.reason}`);
  }

  stepResults.step2_initial_ranking = ramaiah0.where === 'recommended' ? 'PASS' : 'FAIL';

  // ── Step 3: Set Ramaiah ICU beds to 0, measure propagation time ───────────
  log(`\nStep 3 · Setting ${RAMAIAH_NAME} icu_beds_available → 0…`);
  updateWrittenAt = Date.now();
  try {
    await updateHospitalStatus(RAMAIAH_ID, { icu_beds_available: 0 });
    log(`  ✓ updateHospitalStatus(${RAMAIAH_ID}, { icu_beds_available: 0 }) written.`);
  } catch (err) {
    log(`  ✗ FAIL: updateHospitalStatus threw: ${err.message}`);
    stepResults.step3_update_detected_in_time = 'FAIL (write error)';
    await safeRestore();
    printSummary(stepResults);
    unsubscribe?.();
    process.exit(1);
  }

  // Wait up to 10 s for subscription to report 0 beds
  const hospitalsAfterUpdate = await Promise.race([
    updateDetectedP,
    sleep(10000).then(() => null),
  ]);

  if (!hospitalsAfterUpdate) {
    log(`  ✗ FAIL: Subscription did not report icu_beds_available=0 within 10 s.`);
    stepResults.step3_update_detected_in_time = 'FAIL (timeout)';
  } else {
    const propagationMs = updateDetectedAt - updateWrittenAt;
    stepResults.step3_update_propagation_ms       = `${propagationMs} ms`;
    stepResults.step3_update_detected_in_time     = 'PASS';
    log(`  ✓ Subscription reported change in ${propagationMs} ms.`);
  }

  // ── Step 4: Re-rank with the zeroed data ──────────────────────────────────
  log('\nStep 4 · Re-ranking with updated live data (Ramaiah ICU=0)…');
  const updatedHospitals = hospitalsAfterUpdate ?? latestHospitals;
  const rankingAfterUpdate = await runRanking(updatedHospitals);

  const top1After = rankingAfterUpdate.topOne;
  const ramaiah1  = rankingAfterUpdate.ramaiahStatus;

  log(`  #1 Recommended: ${top1After?.hospital.name ?? '(none)'}`);
  log(`  ${RAMAIAH_NAME}: ${ramaiah1.where.toUpperCase()}`);
  if (ramaiah1.where === 'excluded') {
    log(`    Reason  : ${ramaiah1.entry.reason}`);
  }

  const expectedExcluded =
    ramaiah1.where === 'excluded' &&
    ramaiah1.entry.reason.includes('ICU full (0 beds)');
  stepResults.step4_ranking_after_set_to_zero =
    expectedExcluded ? 'PASS' : `FAIL (${ramaiah1.where}: ${ramaiah1.entry?.reason ?? 'not found'})`;

  // ── Step 5: Restore after 3 more seconds ─────────────────────────────────
  log('\nStep 5 · Waiting 3 s then restoring Ramaiah ICU beds…');
  await sleep(3000);

  restoreWrittenAt = Date.now();
  try {
    await updateHospitalStatus(RAMAIAH_ID, { icu_beds_available: ORIGINAL_BEDS });
    log(`  ✓ Restored icu_beds_available → ${ORIGINAL_BEDS}.`);
  } catch (err) {
    log(`  ✗ FAIL: Restore write threw: ${err.message}`);
    stepResults.step5_restore_detected      = 'FAIL (write error)';
    stepResults.step5_ranking_after_restore = 'FAIL (write error)';
    printSummary(stepResults);
    unsubscribe?.();
    process.exit(1);
  }

  // Wait up to 10 s for subscription to report restored beds
  const hospitalsAfterRestore = await Promise.race([
    restoreDetectedP,
    sleep(10000).then(() => null),
  ]);

  if (!hospitalsAfterRestore) {
    log(`  ✗ FAIL: Subscription did not report restore within 10 s.`);
    stepResults.step5_restore_detected      = 'FAIL (timeout)';
    stepResults.step5_ranking_after_restore = 'SKIP';
  } else {
    const restoreMs = restoreDetectedAt - restoreWrittenAt;
    stepResults.step5_restore_detected = `PASS (${restoreMs} ms)`;
    log(`  ✓ Subscription reported restore in ${restoreMs} ms.`);

    // Final ranking
    log('\nStep 5b · Re-ranking with restored data…');
    const rankingAfterRestore = await runRanking(hospitalsAfterRestore);
    const top1Final   = rankingAfterRestore.topOne;
    const ramaiah2    = rankingAfterRestore.ramaiahStatus;

    log(`  #1 Recommended: ${top1Final?.hospital.name ?? '(none)'}`);
    log(`  ${RAMAIAH_NAME}: ${ramaiah2.where.toUpperCase()}`);
    if (ramaiah2.where === 'recommended') {
      log(`    Reasons : ${ramaiah2.entry.reasons.join(' | ')}`);
    }

    stepResults.step5_ranking_after_restore =
      ramaiah2.where === 'recommended' ? 'PASS' : `FAIL (${ramaiah2.where})`;
  }

  // ── Clean exit ────────────────────────────────────────────────────────────
  printSummary(stepResults);
  unsubscribe?.();
  log('Unsubscribed from Firestore. Exiting cleanly.\n');
  process.exit(0);
}

// ── Safe restore helper (used in error paths) ─────────────────────────────────
async function safeRestore() {
  try {
    await updateHospitalStatus(RAMAIAH_ID, { icu_beds_available: ORIGINAL_BEDS });
    log(`  ✓ [Cleanup] Restored ${RAMAIAH_NAME} icu_beds_available → ${ORIGINAL_BEDS}.`);
  } catch (e) {
    log(`  ✗ [Cleanup] Restore also failed: ${e.message}`);
  }
}

// ── PASS / FAIL summary ────────────────────────────────────────────────────────
function printSummary(steps) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  STEP RESULTS');
  console.log('════════════════════════════════════════════════════════════════');

  const rows = [
    ['Step 1  · Subscription receives data',          steps.step1_subscription_receives_data],
    ['Step 2  · Initial ranking: Ramaiah recommended', steps.step2_initial_ranking],
    ['Step 3  · Update propagation time',              steps.step3_update_propagation_ms ?? 'N/A'],
    ['Step 3  · Update detected by subscription',      steps.step3_update_detected_in_time],
    ['Step 4  · Ranking after ICU=0: Ramaiah excluded',steps.step4_ranking_after_set_to_zero],
    ['Step 5  · Restore detected by subscription',     steps.step5_restore_detected],
    ['Step 5b · Ranking after restore: Ramaiah back',  steps.step5_ranking_after_restore],
  ];

  rows.forEach(([label, value]) => {
    const icon = String(value).startsWith('FAIL') ? '✗' : '✓';
    console.log(`  ${icon}  ${label.padEnd(48)} ${value ?? 'N/A'}`);
  });

  const anyFail = rows.some(([, v]) => String(v).startsWith('FAIL'));
  console.log('════════════════════════════════════════════════════════════════');
  console.log(anyFail ? '  OVERALL: FAIL ✗' : '  OVERALL: PASS ✓');
  console.log('════════════════════════════════════════════════════════════════\n');
}

// ── Run ────────────────────────────────────────────────────────────────────────
main().catch(async (err) => {
  console.error('\n[FATAL]', err.message || err);
  await safeRestore();
  process.exit(1);
});
