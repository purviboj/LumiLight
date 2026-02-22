import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { getLightPollutionData } from '../services/lightPollutionDataService.js';
import {
  estimateBortleScore,
  getRestoredIntensity
} from '../services/lightPollutionUtils.js';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icon paths for Vite's asset handling.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
const FOCUS_ZOOM = 12;
const STANDARD_DARK_TILE_URL = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
const STANDARD_DAY_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const HYBRID_LABELS_TILE_URL =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const STANDARD_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors '
  + '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> '
  + '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>';
const SATELLITE_TILE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';

const HEAT_SAMPLE_GRID = 17;

const HEATMAP_SEVERITY_COLORS = {
  low: '#22c55e', // Green
  moderate: '#f97316', // Orange
  high: '#dc2626' // Red
};

const HEATMAP_SEVERITY_LEGEND = [
  { key: 'low', label: 'Low', rangeLabel: '0-49' },
  { key: 'moderate', label: 'Moderate', rangeLabel: '50-74' },
  { key: 'high', label: 'High', rangeLabel: '75-100' }
];

const MAP_LAYER_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'hybrid', label: 'Hybrid' }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function kmToLatDegrees(km) {
  return km / 110.574;
}

function kmToLonDegrees(km, latitude) {
  return km / (111.320 * Math.cos(degreesToRadians(latitude)));
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

function getSeverityKey(lightScore) {
  const clamped = clamp(lightScore, 0, 100);
  if (clamped >= 75) return 'high';
  if (clamped >= 50) return 'moderate';
  return 'low';
}

function heatColorFromScore(lightScore, nightMode, mapZoom) {
  const severityKey = getSeverityKey(lightScore);
  const fillColor = HEATMAP_SEVERITY_COLORS[severityKey];
  const alpha = nightMode ? 0.72 : 0.62;
  return {
    fill: fillColor,
    stroke: fillColor,
    alpha
  };
}

function interpolateIntensity(points, latitude, longitude) {
  if (points.length === 0) return 0;

  const nearestPoints = points
    .map((point) => ({
      ...point,
      distanceKm: haversineDistanceKm(latitude, longitude, point.latitude, point.longitude)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 10);

  let weightedTotal = 0;
  let weightSum = 0;
  for (const point of nearestPoints) {
    // Keep the interpolation local so distant high-pollution points do not wash out nearby low-severity areas.
    const weight = 1 / ((point.distanceKm + 12) ** 1.85);
    weightedTotal += point.intensity * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 0;
  return clamp(Math.round(weightedTotal / weightSum), 0, 100);
}

function RecenterOnTarget({ targetPosition }) {
  const map = useMap();
  const previousTargetKey = useRef('');

  useEffect(() => {
    if (!targetPosition) return;

    const nextKey = `${targetPosition.latitude.toFixed(4)}-${targetPosition.longitude.toFixed(4)}`;
    if (nextKey === previousTargetKey.current) return;

    map.flyTo([targetPosition.latitude, targetPosition.longitude], FOCUS_ZOOM, {
      animate: true,
      duration: 1
    });
    previousTargetKey.current = nextKey;
  }, [map, targetPosition]);

  return null;
}

function MapZoomTracker({ onZoomChange }) {
  useMapEvents({
    zoomend: (event) => onZoomChange(event.target.getZoom())
  });
  return null;
}

function HeatLegend({ nightMode }) {
  const headingClass = nightMode ? 'text-slate-200' : 'text-slate-800';
  const rowClass = nightMode ? 'text-slate-200' : 'text-slate-700';

  return (
    <div className="heat-legend absolute bottom-4 left-4 z-[1000] w-[260px] rounded-xl">
      <h3 className={`text-xs font-semibold uppercase tracking-wide ${headingClass}`}>Light Pollution Severity</h3>
      <div className={`mt-2 space-y-1 text-[11px] ${rowClass}`}>
        {HEATMAP_SEVERITY_LEGEND.map((severity) => {
          const color = HEATMAP_SEVERITY_COLORS[severity.key];
          return (
            <div key={severity.key} className="heat-legend-row">
              <span className="heat-dot" style={{ background: color }} />
              <span>Pollution {severity.rangeLabel}</span>
              <span>{severity.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MapView({
  selectedYear = 2025,
  position,
  error,
  loading,
  restoreNightMode = false,
  selectedLocationOverride = null,
  nightMode = false
}) {
  const lightPollutionData = useMemo(() => getLightPollutionData(), []);
  const [mapInstance, setMapInstance] = useState(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [mapLayer, setMapLayer] = useState('standard');

  const gpsPosition = useMemo(() => {
    if (!position) return null;
    return { latitude: position.latitude, longitude: position.longitude, accuracy: position.accuracy };
  }, [position]);

  const targetPosition = selectedLocationOverride || gpsPosition;
  const targetLatLng = targetPosition ? [targetPosition.latitude, targetPosition.longitude] : null;
  const sourceLabel = selectedLocationOverride
    ? `ZIP/Location: ${selectedLocationOverride.label || 'custom'}`
    : gpsPosition
      ? 'GPS location'
      : 'Waiting for GPS location';

  const activePoints = useMemo(() => {
    const yearMatched = lightPollutionData.filter((point) => point.year <= selectedYear);
    return yearMatched.map((point) => ({
      ...point,
      intensity: restoreNightMode ? getRestoredIntensity(point.intensity, 0.4) : point.intensity
    }));
  }, [lightPollutionData, restoreNightMode, selectedYear]);

  const heatRadiusKm = useMemo(() => clamp(220 - mapZoom * 16, 60, 200), [mapZoom]);

  const heatSamples = useMemo(() => {
    if (!targetPosition || activePoints.length === 0) return [];
    // Use map zoom for more detailed interpolation while keeping the same algorithm.
    const dynamicRadius = heatRadiusKm;
    const samples = [];
    const spacingKm = (dynamicRadius * 2) / (HEAT_SAMPLE_GRID - 1);
    const radiusMeters = Math.max(1200, (spacingKm * 1000) / 1.8);

    for (let row = 0; row < HEAT_SAMPLE_GRID; row += 1) {
      const yKm = -dynamicRadius + row * spacingKm;
      for (let col = 0; col < HEAT_SAMPLE_GRID; col += 1) {
        const xKm = -dynamicRadius + col * spacingKm;
        const distanceFromCenter = Math.sqrt(xKm * xKm + yKm * yKm);
        if (distanceFromCenter > dynamicRadius) continue;

        const latitude = targetPosition.latitude + kmToLatDegrees(yKm);
        const longitude = targetPosition.longitude + kmToLonDegrees(xKm, targetPosition.latitude);
        const intensity = interpolateIntensity(activePoints, latitude, longitude);
        const lightScore = Math.round(100 - intensity);
        const color = heatColorFromScore(lightScore, nightMode, mapZoom);

        samples.push({
          id: `${row}-${col}`,
          latitude,
          longitude,
          radiusMeters,
          intensity,
          lightScore,
          fillColor: color.fill,
          strokeColor: color.stroke,
          opacity: color.alpha
        });
      }
    }
    return samples;
  }, [targetPosition, activePoints, heatRadiusKm, mapZoom, nightMode]);

  const currentBaseLayer = useMemo(() => {
    if (mapLayer === 'satellite') {
      return {
        key: 'satellite',
        url: SATELLITE_TILE_URL,
        attribution: SATELLITE_TILE_ATTRIBUTION,
        className: 'map-layer-transition satellite-base-tiles'
      };
    }

    if (mapLayer === 'hybrid') {
      return {
        key: 'hybrid',
        url: SATELLITE_TILE_URL,
        attribution: SATELLITE_TILE_ATTRIBUTION,
        className: 'map-layer-transition satellite-base-tiles'
      };
    }

    return {
      key: nightMode ? 'standard-dark' : 'standard-light',
      url: nightMode ? STANDARD_DARK_TILE_URL : STANDARD_DAY_TILE_URL,
      attribution: STANDARD_TILE_ATTRIBUTION,
      className: `map-layer-transition ${nightMode ? 'night-mode-base-tiles' : 'day-mode-base-tiles'}`.trim()
    };
  }, [mapLayer, nightMode]);

  const localSnapshot = useMemo(() => {
    if (!targetPosition || activePoints.length === 0) return null;

    const localIntensity = interpolateIntensity(activePoints, targetPosition.latitude, targetPosition.longitude);
    return {
      intensity: localIntensity,
      lightScore: Math.round(100 - localIntensity),
      bortle: estimateBortleScore(localIntensity)
    };
  }, [targetPosition, activePoints]);

  return (
    <div className={`relative h-full w-full ${nightMode ? 'map-ui-night' : 'map-ui-day'}`}>
      <div className="status-chip absolute left-3 top-3 z-[1000]">
        {loading && 'Locating...'}
        {!loading && error && `Location unavailable: ${error}`}
        {!loading && !error && `Location connected (${selectedLocationOverride ? 'ZIP/location synced' : 'GPS'})`}
      </div>
      <div className="status-chip absolute right-3 top-3 z-[1000] text-lumi-accent">
        <div className="map-layer-toggle mb-2">
          {MAP_LAYER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMapLayer(option.value)}
              className={`layer-chip ${mapLayer === option.value ? 'layer-chip-active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div>{selectedYear}</div>
      </div>
      <div className="map-control-panel absolute left-3 top-12 z-[1000] w-[min(92vw,340px)] rounded-xl">
        <h3 className={`text-xs font-semibold uppercase tracking-wide ${nightMode ? 'text-slate-200' : 'text-slate-800'}`}>
          Heatmap Source
        </h3>
        <p className={`mt-1 text-xs ${nightMode ? 'text-slate-300' : 'text-slate-700'}`}>{sourceLabel}</p>
      </div>
      <HeatLegend nightMode={nightMode} />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        whenReady={(event) => setMapInstance(event.target)}
      >
        <TileLayer
          key={currentBaseLayer.key}
          attribution={currentBaseLayer.attribution}
          url={currentBaseLayer.url}
          className={currentBaseLayer.className}
        />
        {mapLayer === 'hybrid' && (
          <TileLayer
            key="hybrid-labels"
            attribution={SATELLITE_TILE_ATTRIBUTION}
            url={HYBRID_LABELS_TILE_URL}
            className="map-layer-transition hybrid-label-tiles"
          />
        )}
        <MapZoomTracker onZoomChange={setMapZoom} />

        {targetPosition && (
          <>
            <RecenterOnTarget targetPosition={targetPosition} />

            <Marker position={targetLatLng}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <strong>{selectedLocationOverride ? 'Selected location' : 'You are here'}</strong>
                  {localSnapshot && <div>Interpolated intensity: {localSnapshot.intensity}</div>}
                  {localSnapshot && <div>Light score: {localSnapshot.lightScore}</div>}
                  {localSnapshot && <div>Estimated Bortle: {localSnapshot.bortle}</div>}
                  {selectedLocationOverride?.label && <div>{selectedLocationOverride.label}</div>}
                </div>
              </Popup>
            </Marker>

            <Circle
              center={targetLatLng}
              radius={selectedLocationOverride ? 3000 : Math.max(150, position?.accuracy || 150)}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.15 }}
            />
          </>
        )}

        {heatSamples.map((sample) => (
          <Circle
            key={sample.id}
            center={[sample.latitude, sample.longitude]}
            radius={sample.radiusMeters}
            pathOptions={{
              color: sample.strokeColor,
              fillColor: sample.fillColor,
              fillOpacity: sample.opacity,
              weight: 0.46,
              className: 'pollution-heat-cell'
            }}
            interactive={false}
          />
        ))}
      </MapContainer>

      <button
        type="button"
        onClick={() => {
          if (!mapInstance || !targetLatLng) return;
          mapInstance.flyTo(targetLatLng, FOCUS_ZOOM, { animate: true, duration: 1 });
        }}
        disabled={!mapInstance || !targetLatLng}
        className="map-fab absolute bottom-4 right-4 z-[1000]"
      >
        Recenter
      </button>
    </div>
  );
}
