/**
 * Geospatial Utilities
 * Haversine distance, travel time estimation, and coordinate utilities.
 */

const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates Great-Circle distance between two coordinates in kilometers using Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number'
  ) {
    throw new Error('Coordinates must be valid numbers.');
  }

  const toRad = (val) => (val * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(phi1) * Math.cos(phi2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;
  return Number(distance.toFixed(2));
}

/**
 * Estimates driving time in minutes based on distance, road curvature factor, and city traffic speed.
 * @param {number} distanceKm 
 * @param {number} [roadFactor=1.4] 
 * @param {number} [averageSpeedKmh=25] 
 * @returns {number} Estimated drive time in minutes
 */
export function estimateDriveTimeMinutes(distanceKm, roadFactor = 1.4, averageSpeedKmh = 25) {
  if (distanceKm <= 0) return 1.0;
  const estimatedRoadDistance = distanceKm * roadFactor;
  const driveHours = estimatedRoadDistance / averageSpeedKmh;
  const minutes = driveHours * 60;
  // Floor at 1 minute minimum for practical dispatch
  return Math.max(1.0, Number(minutes.toFixed(1)));
}

/**
 * Generates an interpolated straight-line route between two points.
 * Returns an array of [lat, lng] coordinates.
 * @param {{ latitude: number, longitude: number }} from 
 * @param {{ latitude: number, longitude: number }} to 
 * @param {number} [numSteps=10] 
 * @returns {Array<[number, number]>}
 */
export function generateStraightLineGeometry(from, to, numSteps = 10) {
  const geometry = [];
  const startLat = from.latitude ?? from.lat;
  const startLng = from.longitude ?? from.lng;
  const endLat = to.latitude ?? to.lat;
  const endLng = to.longitude ?? to.lng;

  for (let i = 0; i <= numSteps; i++) {
    const fraction = i / numSteps;
    const lat = startLat + (endLat - startLat) * fraction;
    const lng = startLng + (endLng - startLng) * fraction;
    geometry.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
  }
  return geometry;
}
