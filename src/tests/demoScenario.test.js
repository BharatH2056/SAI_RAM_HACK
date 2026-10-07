import { describe, it, expect } from 'vitest';
import { runDemoScenario } from '../services/demoService.js';

describe('GoldenHour End-to-End Demo Scenario Test', () => {
  it('correctly executes heart attack at Hebbal scenario matching hackathon requirements', async () => {
    const demo = await runDemoScenario();

    // 1. Classification: suggested type is heart_attack
    expect(demo.classification.type).toBe('heart_attack');
    expect(demo.classification.confidence).toBeGreaterThan(0.7);

    // 2. Old-way failure: nearest hospital fails (no cath lab)
    expect(demo.nearestHospital).toBeDefined();
    expect(demo.ranking.nearestOverall.canTreat).toBe(false);
    expect(demo.ranking.nearestOverall.reason).toContain('No cath lab');

    // 3. Recommended #1 has a cath lab, ICU beds > 0, and is 24x7
    // (Note: no hardcoded hospital name so test does not depend on routing provider or fallback order)
    expect(demo.ranking.recommended.length).toBeGreaterThanOrEqual(1);
    const topRecommended = demo.ranking.recommended[0];
    expect(topRecommended).toBeDefined();
    expect(topRecommended.hospital.has_cath_lab).toBe(true);
    expect(topRecommended.hospital.icu_beds_available).toBeGreaterThan(0);
    expect(topRecommended.hospital.emergency_24x7).toBe(true);

    // 4. ICU full facilities (Apollo Bannerghatta Road and Mallya) are excluded for ICU full
    const apolloEx = demo.ranking.excluded.find((e) =>
      e.hospital.name.includes('Apollo') || ['H06', 'apollo-bannerghatta'].includes(e.hospital.id)
    );
    expect(apolloEx).toBeDefined();
    expect(apolloEx.reason).toContain('ICU full (0 beds)');

    const mallyaEx = demo.ranking.excluded.find((e) =>
      e.hospital.name.includes('Mallya') || ['H14', 'mallya-hospital'].includes(e.hospital.id)
    );
    expect(mallyaEx).toBeDefined();
    expect(mallyaEx.reason).toContain('ICU full (0 beds)');

    // 5. Time saved math: newWayMinutes must strictly equal recommended hospital's route ETA
    expect(demo.timeSaved).toBeDefined();
    expect(demo.recommendedRoute).toBeDefined();
    expect(demo.timeSaved.newWayMinutes).toBe(demo.recommendedRoute.etaMinutes);
    expect(demo.timeSaved.newWayMinutes).toBe(topRecommended.etaMinutes);

    // Mathematical identity: oldWayMinutes = nearestEta + transferDelay + etaNearestToRecommended
    const calculatedOldWay = Number(
      (demo.timeSaved.nearestEta + demo.timeSaved.transferDelay + demo.timeSaved.etaNearestToRecommended).toFixed(1)
    );
    expect(demo.timeSaved.oldWayMinutes).toBe(calculatedOldWay);

    // savedMinutes = oldWayMinutes - newWayMinutes
    const calculatedSaved = Number(
      (demo.timeSaved.oldWayMinutes - demo.timeSaved.newWayMinutes).toFixed(1)
    );
    expect(demo.timeSaved.savedMinutes).toBe(calculatedSaved);
    expect(demo.timeSaved.savedMinutes).toBeGreaterThan(0);
    expect(demo.timeSaved.assumptions.isTransferDelayAssumed).toBe(true);
  });
});
