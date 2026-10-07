import { describe, it, expect } from 'vitest';
import { calculateTimeSaved } from '../services/timeSavedService.js';

describe('Time Saved Service', () => {
  it('accurately calculates saved minutes during intelligent diversion', () => {
    const result = calculateTimeSaved({
      nearestEta: 4,
      recommendedEta: 7,
      etaNearestToRecommended: 8,
      transferDelayMinutes: 10,
      nearestCanTreat: false,
    });

    // Old way: 4 + 10 + 8 = 22 minutes
    expect(result.oldWayMinutes).toBe(22);
    // New way: 7 minutes
    expect(result.newWayMinutes).toBe(7);
    // Time saved: 22 - 7 = 15 minutes
    expect(result.savedMinutes).toBe(15);
    expect(result.assumptions.isTransferDelayAssumed).toBe(true);
    expect(result.assumptions.transferDelayMinutes).toBe(10);
    expect(result.assumptions.note).toContain('clinical assumption');
  });

  it('honestly returns 0 saved minutes when nearest hospital can treat', () => {
    const result = calculateTimeSaved({
      nearestEta: 5,
      recommendedEta: 5,
      etaNearestToRecommended: 0,
      nearestCanTreat: true,
    });

    expect(result.savedMinutes).toBe(0);
    expect(result.oldWayMinutes).toBe(5);
    expect(result.newWayMinutes).toBe(5);
    expect(result.assumptions.nearestCanTreat).toBe(true);
    expect(result.assumptions.isTransferDelayAssumed).toBe(false);
  });

  it('handles custom transfer delay and rounds values cleanly', () => {
    const result = calculateTimeSaved({
      nearestEta: 3.5,
      recommendedEta: 9.2,
      etaNearestToRecommended: 12.1,
      transferDelayMinutes: 15,
      nearestCanTreat: false,
    });

    // Old way: 3.5 + 15 + 12.1 = 30.6
    expect(result.oldWayMinutes).toBe(30.6);
    expect(result.newWayMinutes).toBe(9.2);
    // Saved: 30.6 - 9.2 = 21.4
    expect(result.savedMinutes).toBe(21.4);
  });

  it('strictly ensures newWayMinutes equals recommendedEta (fails if newWayMinutes != recommended ETA)', () => {
    const testRecommendedEta = 10.4;
    const result = calculateTimeSaved({
      nearestEta: 2.5,
      recommendedEta: testRecommendedEta,
      etaNearestToRecommended: 8.1,
      transferDelayMinutes: 10,
      nearestCanTreat: false,
    });

    // Strictly fails if newWayMinutes != recommended ETA
    expect(result.newWayMinutes).toBe(testRecommendedEta);
    expect(result.oldWayMinutes).toBe(Number((2.5 + 10 + 8.1).toFixed(1)));
    expect(result.savedMinutes).toBe(
      Number((result.oldWayMinutes - result.newWayMinutes).toFixed(1))
    );

    // Full breakdown fields returned on object
    expect(result.nearestEta).toBe(2.5);
    expect(result.transferDelay).toBe(10);
    expect(result.etaNearestToRecommended).toBe(8.1);
  });
});
