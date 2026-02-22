export function getIntensityColor(intensity) {
  if (intensity <= 33) return '#22c55e';
  if (intensity <= 66) return '#eab308';
  return '#ef4444';
}

export function estimateBortleScore(intensity) {
  // Mock conversion: invert intensity and map to Bortle class range 1..9.
  const normalized = Math.max(0, Math.min(100, intensity));
  return Math.max(1, Math.min(9, Math.round(9 - normalized / 12.5)));
}

export function getIntensityLevel(intensity) {
  if (intensity <= 33) return 'Low';
  if (intensity <= 66) return 'Moderate';
  return 'High';
}

export function estimateStarsVisible(bortleScore) {
  // Mock stars estimate driven by Bortle class.
  const clamped = Math.max(1, Math.min(9, bortleScore));
  return Math.round(5000 - (clamped - 1) * 525);
}

export function calculateAreaLightScore(intensity) {
  // Higher score means darker skies (better viewing conditions).
  const normalized = Math.max(0, Math.min(100, intensity));
  return Math.round(100 - normalized);
}

export function getRestoredIntensity(intensity, reductionRate = 0.4) {
  // Non-destructive simulation: compute adjusted value without mutating source data.
  const normalized = Math.max(0, Math.min(100, intensity));
  return Math.max(0, Math.round(normalized * (1 - reductionRate)));
}

export function buildSkyMetrics(intensity) {
  const bortleScore = estimateBortleScore(intensity);
  return {
    areaLightScore: calculateAreaLightScore(intensity),
    bortleScore,
    starsVisible: estimateStarsVisible(bortleScore),
    intensityLevel: getIntensityLevel(intensity),
    intensity
  };
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function findNearestLightPollutionPoint(points, position, selectedYear) {
  if (!position || !Array.isArray(points) || points.length === 0) return null;

  const eligiblePoints = points.filter((point) => point.year <= selectedYear);
  if (eligiblePoints.length === 0) return null;

  return eligiblePoints.reduce((closest, current) => {
    const currentDistance = haversineDistanceKm(
      position.latitude,
      position.longitude,
      current.latitude,
      current.longitude
    );

    if (!closest || currentDistance < closest.distanceKm) {
      return { point: current, distanceKm: currentDistance };
    }

    return closest;
  }, null);
}
