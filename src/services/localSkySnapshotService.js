import { getLightPollutionData } from './lightPollutionDataService.js';
import {
  calculateAreaLightScore,
  estimateBortleScore,
  estimateStarsVisible,
  findNearestLightPollutionPoint,
  getIntensityLevel
} from './lightPollutionUtils.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
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

function toJulianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function normalizeDegrees(value) {
  const result = value % 360;
  return result < 0 ? result + 360 : result;
}

function calculateGalacticCenterAltitude(latitude, longitude, date) {
  // Galactic center approximate equatorial coordinates (J2000).
  const galacticCenterRaDeg = 266.417;
  const galacticCenterDecDeg = -29.008;

  const julianDate = toJulianDate(date);
  const t = (julianDate - 2451545.0) / 36525;
  const gmstDeg =
    280.46061837 +
    360.98564736629 * (julianDate - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;

  const localSiderealDeg = normalizeDegrees(gmstDeg + longitude);
  const hourAngleDeg = normalizeDegrees(localSiderealDeg - galacticCenterRaDeg);
  const hourAngleRad = degreesToRadians(hourAngleDeg > 180 ? hourAngleDeg - 360 : hourAngleDeg);

  const latRad = degreesToRadians(latitude);
  const decRad = degreesToRadians(galacticCenterDecDeg);
  const altitudeRad = Math.asin(
    Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(hourAngleRad)
  );

  return radiansToDegrees(altitudeRad);
}

function calculateSunAltitude(latitude, longitude, date) {
  // Simplified solar position model, good for twilight/day-night estimation.
  const julianDate = toJulianDate(date);
  const n = julianDate - 2451545.0;
  const meanLongitude = normalizeDegrees(280.46 + 0.9856474 * n);
  const meanAnomaly = normalizeDegrees(357.528 + 0.9856003 * n);

  const eclipticLongitude =
    meanLongitude +
    1.915 * Math.sin(degreesToRadians(meanAnomaly)) +
    0.02 * Math.sin(degreesToRadians(2 * meanAnomaly));

  const obliquity = 23.439 - 0.0000004 * n;
  const sunRa = radiansToDegrees(
    Math.atan2(
      Math.cos(degreesToRadians(obliquity)) * Math.sin(degreesToRadians(eclipticLongitude)),
      Math.cos(degreesToRadians(eclipticLongitude))
    )
  );
  const sunDec = radiansToDegrees(
    Math.asin(
      Math.sin(degreesToRadians(obliquity)) * Math.sin(degreesToRadians(eclipticLongitude))
    )
  );

  const t = (julianDate - 2451545.0) / 36525;
  const gmstDeg =
    280.46061837 +
    360.98564736629 * (julianDate - 2451545.0) +
    0.000387933 * t * t -
    (t * t * t) / 38710000;
  const localSiderealDeg = normalizeDegrees(gmstDeg + longitude);
  const hourAngleDeg = normalizeDegrees(localSiderealDeg - sunRa);
  const hourAngleRad = degreesToRadians(hourAngleDeg > 180 ? hourAngleDeg - 360 : hourAngleDeg);

  const latRad = degreesToRadians(latitude);
  const decRad = degreesToRadians(sunDec);
  const altitudeRad = Math.asin(
    Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(hourAngleRad)
  );

  return radiansToDegrees(altitudeRad);
}

function getMilkyWayVisibility(location, intensity, date) {
  const galacticCenterAltitude = calculateGalacticCenterAltitude(
    location.latitude,
    location.longitude,
    date
  );
  const sunAltitude = calculateSunAltitude(location.latitude, location.longitude, date);

  const darknessFactor = clamp((-sunAltitude - 6) / 12, 0, 1);
  const altitudeFactor = clamp(galacticCenterAltitude / 35, 0, 1);
  const pollutionFactor = clamp(1 - intensity / 100, 0.05, 1);
  const visibilityPercent = Math.round(darknessFactor * altitudeFactor * pollutionFactor * 100);

  return {
    visibilityPercent,
    galacticCenterAltitudeDeg: Number(galacticCenterAltitude.toFixed(1)),
    sunAltitudeDeg: Number(sunAltitude.toFixed(1)),
    timestampIso: date.toISOString()
  };
}

function getNearbyStargazing(location, points, selectedYear, radiusKm) {
  const eligible = points
    .filter((point) => point.year <= selectedYear)
    .map((point) => ({
      id: point.id,
      name: point.name,
      intensity: point.intensity,
      year: point.year,
      distanceKm: Number(
        haversineDistanceKm(location.latitude, location.longitude, point.latitude, point.longitude).toFixed(1)
      )
    }))
    .filter((point) => point.distanceKm <= radiusKm)
    .sort((a, b) => (a.intensity === b.intensity ? a.distanceKm - b.distanceKm : a.intensity - b.intensity));

  return {
    radiusKm,
    bestNearbyLocation: eligible[0] || null,
    rankedNearbyLocations: eligible
  };
}

export function getLocalSkySnapshot({
  location,
  selectedYear,
  radiusKm = 250,
  observationDate = new Date()
}) {
  if (!location) return null;

  const points = getLightPollutionData();
  const nearestResult = findNearestLightPollutionPoint(points, location, selectedYear);
  if (!nearestResult) return null;

  const intensity = nearestResult.point.intensity;
  const bortleScore = estimateBortleScore(intensity);
  const nearby = getNearbyStargazing(location, points, selectedYear, radiusKm);
  const milkyWay = getMilkyWayVisibility(location, intensity, observationDate);

  return {
    location: {
      latitude: Number(location.latitude.toFixed(5)),
      longitude: Number(location.longitude.toFixed(5)),
      source: location.source || 'gps',
      label: location.label || null
    },
    nearestDataPoint: {
      id: nearestResult.point.id,
      name: nearestResult.point.name,
      distanceKm: Number(nearestResult.distanceKm.toFixed(1)),
      year: nearestResult.point.year
    },
    lightPollution: {
      areaLightScore: calculateAreaLightScore(intensity),
      intensity,
      intensityLevel: getIntensityLevel(intensity),
      bortleScore,
      starsVisibleEstimate: estimateStarsVisible(bortleScore)
    },
    milkyWay,
    stargazing: nearby
  };
}
