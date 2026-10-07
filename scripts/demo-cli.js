#!/usr/bin/env node
/**
 * GoldenHour Demo CLI
 * Executes the Hebbal heart-attack demo scenario and prints:
 *  - Voice classification result
 *  - Old-way failure analysis (nearest hospital)
 *  - Top 3 recommended hospitals with route source (osrm | fallback)
 *  - Clinical exclusion list
 *  - Full time-saved breakdown
 */

import 'dotenv/config';
import { runDemoScenario } from '../src/services/demoService.js';

function routeTag(route) {
  if (!route) return '';
  const src = route.source === 'osrm' ? '[osrm road]' : '[fallback straight-line]';
  const dist = route.distanceLabel === 'road'
    ? `${route.distanceKm} km road`
    : `${route.distanceKm} km straight-line`;
  return `${route.etaMinutes} min  ${dist}  ${src}`;
}

async function main() {
  console.log('\n================================================================');
  console.log('             GOLDENHOUR EMERGENCY DISPATCH DEMO                 ');
  console.log('================================================================');

  const transcript = 'Emergency! My father has severe chest pain, left arm pain and trouble breathing!';
  console.log(`\n[1] CALLER TRANSCRIPT: "${transcript}"`);
  console.log('\nRunning AI classification & intelligent routing...');

  const start = performance.now();
  const demo = await runDemoScenario({ transcript });
  const ms = Math.round(performance.now() - start);

  // ── [2] VOICE CLASSIFICATION ───────────────────────────────────────────────
  console.log(`\n[2] VOICE CLASSIFICATION`);
  console.log(`  Suggested Type : ${demo.classification.type.toUpperCase()}`);
  console.log(`  Confidence     : ${Math.round(demo.classification.confidence * 100)}%`);
  console.log(`  Keywords hit   : ${demo.classification.matchedKeywords.join(', ')}`);
  console.log(`  Human review   : Required (dispatcher confirms before dispatch)`);

  // ── [3] OLD WAY ────────────────────────────────────────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('[3] OLD WAY — Blind dispatch to nearest hospital');
  const nearest = demo.ranking.nearestOverall;
  if (nearest) {
    console.log(`  Nearest        : ${nearest.hospital.name} (${nearest.hospital.area})`);
    console.log(`  Route          : ${routeTag(demo.nearestRoute)}`);
    console.log(`  Can treat?     : NO  ← ${nearest.reason}`);
    console.log(`  Consequence    : Patient arrives at wrong hospital. Requires re-triage`);
    console.log(`                   and secondary ambulance transfer → critical delay.`);
  }

  // ── [4] RECOMMENDED HOSPITALS ─────────────────────────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('[4] GOLDENHOUR RECOMMENDED (clinically capable, ICU beds available)');
  if (demo.etaSource === 'fallback') {
    console.log('  ⚠️  ETA source: fallback (straight-line)');
  } else {
    console.log('  ✓  ETA source: osrm (road)');
  }
  if (demo.etaDisclaimer) {
    console.log(`  Note: ${demo.etaDisclaimer}`);
  }

  demo.ranking.recommended.forEach((rec, idx) => {
    const h = rec.hospital;
    const src = rec.source === 'osrm' ? '[osrm road]' : '[fallback straight-line]';
    const dist = rec.distanceLabel === 'road'
      ? `${rec.distanceKm} km road`
      : `${rec.distanceKm} km straight-line`;
    const routeInfo = `${rec.etaMinutes} min  ${dist}  ${src}`;

    console.log(`\n  #${idx + 1} ${h.name.toUpperCase()}`);
    console.log(`     Area    : ${h.area}`);
    console.log(`     Route   : ${routeInfo}`);
    console.log(`     ICU     : ${h.icu_beds_available} beds available`);
    console.log(`     On duty : ${(h.specialists_on_duty || []).join(', ') || 'General on-call'}`);
    console.log(`     Reasons : ${rec.reasons.join(' | ')}`);
  });

  // ── [5] EXCLUSIONS ────────────────────────────────────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('[5] EXCLUDED (failed clinical filter)');
  demo.ranking.excluded.forEach((ex) => {
    console.log(`  [X] ${ex.hospital.name.padEnd(40)} ← ${ex.reason}`);
  });

  // ── [6] TIME SAVED BREAKDOWN ──────────────────────────────────────────────
  console.log('\n----------------------------------------------------------------');
  console.log('[6] TIME TO REACH A HOSPITAL THAT CAN TREAT (travel time only)');
  if (demo.timeSaved) {
    const ts = demo.timeSaved;
    console.log(`\n  OLD WAY breakdown:`);
    console.log(`    Patient → Nearest hospital            : ${ts.nearestEta} min`);
    console.log(`    Triage / re-dispatch delay (assumed)  : ${ts.transferDelay} min`);
    console.log(`    Nearest → Equipped hospital transfer   : ${ts.etaNearestToRecommended} min`);
    console.log(`    ─────────────────────────────────────────────────`);
    console.log(`    oldWayMinutes = ${ts.nearestEta} + ${ts.transferDelay} + ${ts.etaNearestToRecommended} = ${ts.oldWayMinutes} min`);
    console.log(`\n  NEW WAY (GoldenHour direct dispatch):`);
    console.log(`    Patient → ${demo.recommendedHospital?.name || 'equipped hospital'}`);
    console.log(`    Route   : ${routeTag(demo.recommendedRoute)}`);
    console.log(`    newWayMinutes = ${ts.newWayMinutes} min  ← equals route ETA above`);
    console.log(`\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  ⚡ TIME SAVED = ${ts.oldWayMinutes} − ${ts.newWayMinutes} = ${ts.savedMinutes} MINUTES`);
    console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n  Assumption: ${ts.assumptions.note}`);
  }

  console.log(`\n[Done in ${ms}ms]\n`);
}

main().catch((err) => {
  console.error('\n[Demo CLI error]:', err.message);
  process.exit(1);
});
