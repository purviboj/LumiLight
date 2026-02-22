import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { getLightPollutionData } from '../services/lightPollutionDataService.js';
import { estimateBortleScore, getIntensityColor, getRestoredIntensity } from '../services/lightPollutionUtils.js';

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

function markerRadiusFromIntensity(intensity) {
  // Slight size variance makes intensity changes easier to read at a glance.
  return 5 + (Math.max(0, Math.min(100, intensity)) / 100) * 6;
}

function RecenterOnUser({ position }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (!position || hasCentered.current) return;

    const nextCenter = [position.latitude, position.longitude];
    map.flyTo(nextCenter, FOCUS_ZOOM, { animate: true, duration: 1.2 });
    hasCentered.current = true;
  }, [map, position]);

  return null;
}

function LightPollutionMarker({ point, selectedYear, restoreNightMode }) {
  const effectiveIntensity = restoreNightMode ? getRestoredIntensity(point.intensity, 0.4) : point.intensity;
  const color = getIntensityColor(effectiveIntensity);
  const bortle = estimateBortleScore(effectiveIntensity);
  const isVisible = point.year <= selectedYear;
  const radius = isVisible ? markerRadiusFromIntensity(effectiveIntensity) : 1;

  return (
    <CircleMarker
      center={[point.latitude, point.longitude]}
      radius={radius}
      interactive={isVisible}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: isVisible ? 0.9 : 0,
        opacity: isVisible ? 0.95 : 0,
        className: 'pollution-marker'
      }}
    >
      {isVisible && (
        <Popup>
          <div className="space-y-1 text-sm">
            <div className="font-semibold">{point.name}</div>
            <div>
              Intensity: {effectiveIntensity}
              {restoreNightMode && ` (from ${point.intensity})`}
            </div>
            <div>Estimated Bortle: {bortle}</div>
          </div>
        </Popup>
      )}
    </CircleMarker>
  );
}

export default function MapView({
  selectedYear = 2025,
  position,
  error,
  loading,
  restoreNightMode = false
}) {
  const lightPollutionData = useMemo(() => getLightPollutionData(), []);
  const [mapInstance, setMapInstance] = useState(null);

  const userLatLng = useMemo(() => {
    if (!position) return null;
    return [position.latitude, position.longitude];
  }, [position]);

  return (
    <div className="relative h-full w-full">
      {/* A lightweight status badge so geolocation state is visible during loading/errors. */}
      <div className="status-chip absolute left-3 top-3 z-[1000]">
        {loading && 'Locating...'}
        {!loading && error && `Location unavailable: ${error}`}
        {!loading && !error && 'Location connected'}
      </div>
      <div className="status-chip absolute right-3 top-3 z-[1000] text-lumi-accent">
        {selectedYear}
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        whenReady={(event) => setMapInstance(event.target)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLatLng && (
          <>
            <RecenterOnUser position={position} />

            <Marker position={userLatLng}>
              <Popup>
                <strong>You are here</strong>
              </Popup>
            </Marker>

            <Circle
              center={userLatLng}
              radius={position.accuracy}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.15 }}
            />
          </>
        )}

        {lightPollutionData.map((point) => (
          <LightPollutionMarker
            key={point.id}
            point={point}
            selectedYear={selectedYear}
            restoreNightMode={restoreNightMode}
          />
        ))}
      </MapContainer>

      {/* Floating action button keeps manual recentering one click away. */}
      <button
        type="button"
        onClick={() => {
          if (!mapInstance || !userLatLng) return;
          mapInstance.flyTo(userLatLng, FOCUS_ZOOM, { animate: true, duration: 1 });
        }}
        disabled={!mapInstance || !userLatLng}
        className="map-fab absolute bottom-4 right-4 z-[1000]"
      >
        Recenter
      </button>
    </div>
  );
}
