import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import initialObservations from '../data/citizenObservations.json';

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

const STORAGE_KEY = 'citizenObservations';
const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

function loadStoredObservations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveObservations(observations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(observations));
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function heatColor(bortle) {
  // Lower Bortle = darker sky = cooler color.
  if (bortle <= 2) return '#38bdf8';
  if (bortle <= 4) return '#22c55e';
  if (bortle <= 6) return '#f59e0b';
  return '#f97316';
}

export default function CitizenScienceLab() {
  const [observations, setObservations] = useState(() => {
    const stored = typeof window !== 'undefined' ? loadStoredObservations() : null;
    return stored || initialObservations;
  });
  const [location, setLocation] = useState({ lat: '', lng: '' });
  const [bortle, setBortle] = useState(4);
  const [cloudCover, setCloudCover] = useState('Clear');
  const [visibleStars, setVisibleStars] = useState(40);
  const [timestamp, setTimestamp] = useState('');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [geoStatus, setGeoStatus] = useState('Idle');
  const fileInputRef = useRef(null);

  useEffect(() => {
    saveObservations(observations);
  }, [observations]);

  useEffect(() => {
    if (!timestamp) {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setTimestamp(local);
    }
  }, [timestamp]);

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation not supported.');
      return;
    }
    setGeoStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        };
        setLocation(next);
        setGeoStatus('Location captured.');
      },
      (err) => {
        setGeoStatus(err.message || 'Unable to fetch location.');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setPhotoPreview(result);
      setPhotoData(result);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!location.lat || !location.lng) {
      setGeoStatus('Please capture your location before submitting.');
      return;
    }

    const newObservation = {
      id: `obs-${Date.now()}`,
      lat: Number(location.lat),
      lng: Number(location.lng),
      bortle: Number(bortle),
      cloudCover: cloudCover.trim() || 'Unknown',
      visibleStars: clamp(Number(visibleStars) || 0, 0, 500),
      timestamp: new Date(timestamp).toISOString(),
      photo: photoData || '',
      notes: notes.trim()
    };

    setObservations((prev) => [newObservation, ...prev]);
    setNotes('');
    setPhotoPreview('');
    setPhotoData('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setGeoStatus('Observation submitted.');
  }

  const mapCenter = useMemo(() => {
    if (location.lat && location.lng) {
      return [Number(location.lat), Number(location.lng)];
    }
    if (observations.length > 0) {
      return [observations[0].lat, observations[0].lng];
    }
    return DEFAULT_CENTER;
  }, [location, observations]);

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Field Reports</h2>
              <p className="text-sm text-slate-300">
                Log real sky conditions to build a global light-pollution data set.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGeolocate}
              className="ui-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide"
            >
              Capture GPS
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-300">{geoStatus}</p>

          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Latitude
                <input
                  type="text"
                  value={location.lat}
                  onChange={(event) => setLocation((prev) => ({ ...prev, lat: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. 34.052235"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Longitude
                <input
                  type="text"
                  value={location.lng}
                  onChange={(event) => setLocation((prev) => ({ ...prev, lng: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="e.g. -118.243683"
                />
              </label>
            </div>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Bortle Scale: <span className="text-slate-100">{bortle}</span>
              <input
                type="range"
                min="1"
                max="9"
                value={bortle}
                onChange={(event) => setBortle(event.target.value)}
                className="time-slider mt-3 w-full"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Cloud Cover
                <input
                  type="text"
                  value={cloudCover}
                  onChange={(event) => setCloudCover(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                  placeholder="Clear, partly cloudy, overcast"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Visible Stars (estimate)
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={visibleStars}
                  onChange={(event) => setVisibleStars(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            </div>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Timestamp
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(event) => setTimestamp(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Upload Night Sky Photo
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePhotoChange}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            {photoPreview && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/70 p-3">
                <img src={photoPreview} alt="Night sky preview" className="h-40 w-full rounded-lg object-cover" />
              </div>
            )}

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Notes
              <textarea
                rows="3"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional context (light sources, nearby events, etc.)"
              />
            </label>

            <button type="submit" className="ui-button rounded-xl py-2 text-sm font-semibold">
              Submit Observation
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Recent Submissions</h3>
          <div className="mt-4 space-y-3">
            {observations.slice(0, 5).map((obs) => (
              <div key={obs.id} className="metric-row text-sm text-slate-100">
                <div>
                  <div className="font-semibold">Bortle {obs.bortle}</div>
                  <div className="text-xs text-slate-300">{formatTimestamp(obs.timestamp)}</div>
                  <div className="text-xs text-slate-400">
                    Location: {obs.locationName ? obs.locationName : `${obs.lat.toFixed(4)}, ${obs.lng.toFixed(4)}`}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div>Clouds: {obs.cloudCover}</div>
                  <div>Stars: {obs.visibleStars}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Observation Map</h3>
          <div className="mt-4 h-[420px] overflow-hidden rounded-2xl">
            <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} className="h-full w-full">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {observations.map((obs) => (
                <CircleMarker
                  key={obs.id}
                  center={[obs.lat, obs.lng]}
                  radius={8}
                  pathOptions={{ color: heatColor(obs.bortle), fillColor: heatColor(obs.bortle), fillOpacity: 0.7 }}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <div><strong>Bortle {obs.bortle}</strong></div>
                      <div>Clouds: {obs.cloudCover}</div>
                      <div>Stars: {obs.visibleStars}</div>
                      <div>{formatTimestamp(obs.timestamp)}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {observations.map((obs) => (
                <CircleMarker
                  key={`${obs.id}-heat`}
                  center={[obs.lat, obs.lng]}
                  radius={28}
                  pathOptions={{
                    color: heatColor(obs.bortle),
                    fillColor: heatColor(obs.bortle),
                    fillOpacity: 0.18,
                    stroke: false
                  }}
                />
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Why Your Data Matters</h3>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Citizen scientists create the most up-to-date, hyperlocal view of sky brightness.
            Each submission helps researchers map light pollution trends, verify satellite models,
            and guide conservation efforts for dark-sky preserves and wildlife habitats.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Validate satellite observations with ground truth readings.</li>
            <li>Track changes after new development or lighting retrofits.</li>
            <li>Support policy decisions with community-led evidence.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
