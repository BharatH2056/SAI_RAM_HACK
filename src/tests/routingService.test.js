import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRoute,
  getFallbackRoute,
  getEtasForMany,
  clearRouteCache,
} from '../services/routingService.js';

describe('Routing Service', () => {
  beforeEach(() => {
    clearRouteCache();
  });

  const hebbal = { lat: 13.0358, lng: 77.5970 };
  const aster = { lat: 13.0538, lng: 77.5912 };

  it('generates a reliable fallback route using Haversine calculation', () => {
    const fallback = getFallbackRoute(hebbal, aster);
    expect(fallback.source).toBe('fallback');
    expect(fallback.distanceKm).toBeGreaterThan(1.5);
    expect(fallback.etaMinutes).toBeGreaterThan(0);
    expect(fallback.geometry.length).toBeGreaterThan(0);
  });

  it('getRoute returns usable route without throwing even with arbitrary locations', async () => {
    const route = await getRoute(hebbal, aster);
    expect(route).toBeDefined();
    expect(typeof route.etaMinutes).toBe('number');
    expect(typeof route.distanceKm).toBe('number');
    expect(Array.isArray(route.geometry)).toBe(true);
    expect(['osrm', 'fallback']).toContain(route.source);
  });

  it('getEtasForMany handles batch of hospitals concurrently', async () => {
    const candidateHospitals = [
      { id: 'h1', lat: 13.0336, lng: 77.5891 },
      { id: 'h2', lat: 13.0352, lng: 77.5908 },
      { id: 'h3', lat: 13.0538, lng: 77.5912 },
    ];

    const results = await getEtasForMany(hebbal, candidateHospitals);
    expect(results).toHaveLength(3);
    expect(results[0].hospitalId).toBe('h1');
    expect(results[1].hospitalId).toBe('h2');
    expect(results[2].hospitalId).toBe('h3');
    expect(results[0].etaMinutes).toBeGreaterThan(0);
  });
});
