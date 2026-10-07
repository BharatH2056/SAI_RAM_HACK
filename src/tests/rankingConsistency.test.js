import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rankHospitals } from '../services/rankingEngine.js';
import { clearRouteCache } from '../services/routingService.js';

describe('Ranking Consistency & ETA Source Integrity', () => {
  const patientLocation = { lat: 13.0358, lng: 77.5970 }; // Hebbal, Bangalore

  const mockHospitals = [
    {
      id: 'hosp-1',
      name: 'Ramaiah Memorial Hospital',
      emergency_24x7: true,
      has_cath_lab: true,
      icu_beds_available: 5,
      specialists_on_duty: ['cardiologist'],
      latitude: 13.0315,
      longitude: 77.5649,
    },
    {
      id: 'hosp-2',
      name: 'Aster CMI Hospital',
      emergency_24x7: true,
      has_cath_lab: true,
      icu_beds_available: 5,
      specialists_on_duty: ['cardiologist'],
      latitude: 13.0583,
      longitude: 77.5898,
    },
    {
      id: 'hosp-3',
      name: 'Fortis Hospital Cunningham Road',
      emergency_24x7: true,
      has_cath_lab: true,
      icu_beds_available: 3,
      specialists_on_duty: ['cardiologist'],
      latitude: 12.9892,
      longitude: 77.5962,
    },
    {
      id: 'hosp-4',
      name: 'Incapable Hospital (No Cath Lab)',
      emergency_24x7: true,
      has_cath_lab: false,
      icu_beds_available: 5,
      specialists_on_duty: [],
      latitude: 13.0360,
      longitude: 77.5975,
    },
  ];

  beforeEach(() => {
    clearRouteCache();
    vi.restoreAllMocks();
  });

  it('when OSRM is working, uses [osrm] source consistently for ALL candidates', async () => {
    // Mock global fetch to simulate successful OSRM Table response
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url.includes('/table/v1/driving/')) {
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({
            code: 'Ok',
            // Durations in seconds: source (0) -> dest 1 (450s = 7.5m), dest 2 (540s = 9m), dest 3 (720s = 12m), dest 4 (120s = 2m)
            durations: [[0, 450, 540, 720, 120]],
            distances: [[0, 4500, 5200, 7800, 1000]],
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    const result = await rankHospitals({
      emergencyType: 'heart_attack',
      patientLocation,
      hospitals: mockHospitals,
    });

    // 1. Overall ETA Source
    expect(result.etaSource).toBe('osrm');
    expect(result.etaDisclaimer).toBe('Estimated drive time without live traffic');

    // 2. All recommended hospitals must share the exact same source: 'osrm'
    expect(result.recommended.length).toBe(3);
    const sources = result.recommended.map((r) => r.source);
    const distanceLabels = result.recommended.map((r) => r.distanceLabel);

    expect(sources).toEqual(['osrm', 'osrm', 'osrm']);
    expect(distanceLabels).toEqual(['road', 'road', 'road']);

    // Assert strictly single unique source across all recommended
    const uniqueSources = new Set(sources);
    expect(uniqueSources.size).toBe(1);
    expect(uniqueSources.has('osrm')).toBe(true);

    // 3. Nearest overall hospital also receives osrm source
    expect(result.nearestOverall).toBeDefined();
    expect(result.nearestOverall.source).toBe('osrm');
    expect(result.nearestOverall.distanceLabel).toBe('road');
  });

  it('when OSRM fails, uses [fallback] straight-line consistently for ALL candidates (never a mix)', async () => {
    // Mock global fetch to simulate complete network failure / 500 error
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (url.includes('/table/v1/driving/')) {
        throw new Error('OSRM Table Connection Refused / Timeout');
      }
      return { ok: false, status: 500 };
    });

    const result = await rankHospitals({
      emergencyType: 'heart_attack',
      patientLocation,
      hospitals: mockHospitals,
    });

    // 1. Overall ETA Source must be 'fallback'
    expect(result.etaSource).toBe('fallback');
    expect(result.etaDisclaimer).toBe('Estimated drive time without live traffic');

    // 2. All recommended hospitals must share the exact same source: 'fallback'
    expect(result.recommended.length).toBe(3);
    const sources = result.recommended.map((r) => r.source);
    const distanceLabels = result.recommended.map((r) => r.distanceLabel);

    expect(sources).toEqual(['fallback', 'fallback', 'fallback']);
    expect(distanceLabels).toEqual(['straight-line', 'straight-line', 'straight-line']);

    // Assert strictly single unique source across all recommended (never a mix)
    const uniqueSources = new Set(sources);
    expect(uniqueSources.size).toBe(1);
    expect(uniqueSources.has('fallback')).toBe(true);

    // 3. Nearest overall hospital also receives fallback source
    expect(result.nearestOverall).toBeDefined();
    expect(result.nearestOverall.source).toBe('fallback');
    expect(result.nearestOverall.distanceLabel).toBe('straight-line');
  });
});
