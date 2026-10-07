import { describe, it, expect } from 'vitest';
import { rankHospitals } from '../services/rankingEngine.js';
import hospitalsSeed from '../../data/goldenhour_hospitals_bangalore.json';

describe('Ranking Engine (Deterministic Pure Function)', () => {
  const patientLocation = { lat: 13.0358, lng: 77.5970 }; // Hebbal, Bangalore

  it('correctly filters out hospitals missing cath lab, 24x7 emergency, or with 0 ICU beds', async () => {
    const mockHospitals = [
      {
        id: 'hosp-1',
        name: 'No Cath Lab Hospital',
        emergency_24x7: true,
        has_cath_lab: false,
        icu_beds_available: 5,
        latitude: 13.0360,
        longitude: 77.5975,
      },
      {
        id: 'hosp-2',
        name: 'Full ICU Hospital',
        emergency_24x7: true,
        has_cath_lab: true,
        icu_beds_available: 0,
        latitude: 13.0370,
        longitude: 77.5980,
      },
      {
        id: 'hosp-3',
        name: 'Not 24x7 Hospital',
        emergency_24x7: false,
        has_cath_lab: true,
        icu_beds_available: 4,
        latitude: 13.0380,
        longitude: 77.5990,
      },
      {
        id: 'hosp-4',
        name: 'Valid Cardiac Hospital',
        emergency_24x7: true,
        has_cath_lab: true,
        icu_beds_available: 4,
        specialists_on_duty: ['cardiologist'],
        latitude: 13.0450,
        longitude: 77.5920,
      },
    ];

    const result = await rankHospitals({
      emergencyType: 'heart_attack',
      patientLocation,
      hospitals: mockHospitals,
    });

    expect(result.recommended).toHaveLength(1);
    expect(result.recommended[0].hospital.id).toBe('hosp-4');
    expect(result.excluded).toHaveLength(3);

    const excludedIds = result.excluded.map((e) => e.hospital.id);
    expect(excludedIds).toContain('hosp-1');
    expect(excludedIds).toContain('hosp-2');
    expect(excludedIds).toContain('hosp-3');

    const noCathLab = result.excluded.find((e) => e.hospital.id === 'hosp-1');
    expect(noCathLab.reason).toContain('No cath lab');

    const fullIcu = result.excluded.find((e) => e.hospital.id === 'hosp-2');
    expect(fullIcu.reason).toContain('ICU full (0 beds)');

    const not247 = result.excluded.find((e) => e.hospital.id === 'hosp-3');
    expect(not247.reason).toContain('Not 24x7 emergency');
  });

  it('correctly calculates score with low-bed penalty and specialist bonus', () => {
    const hospA = {
      id: 'hosp-a',
      name: 'Hospital A (1 bed, no specialist)',
      emergency_24x7: true,
      has_cath_lab: true,
      icu_beds_available: 1, // +2 penalty
      specialists_on_duty: [],
      latitude: 13.05,
      longitude: 77.60,
    };

    const hospB = {
      id: 'hosp-b',
      name: 'Hospital B (4 beds, with cardiologist)',
      emergency_24x7: true,
      has_cath_lab: true,
      icu_beds_available: 4,
      specialists_on_duty: ['cardiologist'], // -1.5 bonus
      latitude: 13.05,
      longitude: 77.60,
    };

    // Constant ETA of 10 minutes for both
    const etaProvider = () => ({ etaMinutes: 10, distanceKm: 5 });

    const result = rankHospitals({
      emergencyType: 'heart_attack',
      patientLocation,
      hospitals: [hospA, hospB],
      etaProvider,
    });

    const rankedA = result.recommended.find((r) => r.hospital.id === 'hosp-a');
    const rankedB = result.recommended.find((r) => r.hospital.id === 'hosp-b');

    // Score A: 10 + 2 = 12
    expect(rankedA.score).toBe(12);
    // Score B: 10 - 1.5 = 8.5
    expect(rankedB.score).toBe(8.5);

    // hosp-b should rank higher (lower score is better)
    expect(result.recommended[0].hospital.id).toBe('hosp-b');
  });

  it('DEMO SCENARIO: Heart attack at Hebbal matches exact hackathon requirements', async () => {
    // Hebbal coords: lat 13.0358, lng 77.5970
    const hospitalsList = hospitalsSeed.hospitals || hospitalsSeed;
    const result = await rankHospitals({
      emergencyType: 'heart_attack',
      patientLocation,
      hospitals: hospitalsList,
    });

    // 1. Check nearestOverall is Columbia Asia Hebbal or Baptist Hospital, and canTreat is false
    expect(result.nearestOverall).toBeDefined();
    expect(
      ['columbia-asia-hebbal', 'bangalore-baptist-hospital', 'H12', 'H20'].includes(
        result.nearestOverall.hospital.id
      )
    ).toBe(true);
    expect(result.nearestOverall.canTreat).toBe(false);
    expect(result.nearestOverall.reason).toContain('No cath lab');

    // 2. Aster CMI is recommended
    expect(result.recommended.length).toBeGreaterThanOrEqual(1);
    const asterRec = result.recommended.find((r) =>
      ['aster-cmi-hospital', 'H11'].includes(r.hospital.id) || r.hospital.name.includes('Aster CMI')
    );
    expect(asterRec).toBeDefined();
    expect(asterRec.hospital.name).toContain('Aster CMI');
    expect(asterRec.reasons.some((r) => r.includes('Cath Lab'))).toBe(true);
    expect(asterRec.reasons.some((r) => r.includes('Cardiologist on duty'))).toBe(true);

    // 3. Apollo Bannerghatta and Mallya are excluded because ICU beds are 0
    const apolloExcluded = result.excluded.find((e) =>
      ['apollo-bannerghatta', 'H06'].includes(e.hospital.id) || e.hospital.name.includes('Apollo')
    );
    expect(apolloExcluded).toBeDefined();
    expect(apolloExcluded.reason).toContain('ICU full (0 beds)');

    const mallyaExcluded = result.excluded.find((e) =>
      ['mallya-hospital', 'H14'].includes(e.hospital.id) || e.hospital.name.includes('Mallya')
    );
    expect(mallyaExcluded).toBeDefined();
    expect(mallyaExcluded.reason).toContain('ICU full (0 beds)');

    // 4. Baptist and Columbia Asia Hebbal are in excluded list with "No cath lab"
    const baptistExcluded = result.excluded.find((e) =>
      ['bangalore-baptist-hospital', 'H20'].includes(e.hospital.id) || e.hospital.name.includes('Baptist')
    );
    expect(baptistExcluded).toBeDefined();
    expect(baptistExcluded.reason).toContain('No cath lab');

    const columbiaExcluded = result.excluded.find((e) =>
      ['columbia-asia-hebbal', 'H12'].includes(e.hospital.id) || e.hospital.name.includes('Columbia Asia')
    );
    expect(columbiaExcluded).toBeDefined();
    expect(columbiaExcluded.reason).toContain('No cath lab');
  });
});
