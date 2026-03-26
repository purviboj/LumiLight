import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import initialReports from '../data/lightingReports.json';

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

const STORAGE_KEY = 'lightingReports';
const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

const LIGHT_TYPES = [
  'streetlight',
  'commercial lighting',
  'building lighting',
  'stadium lighting'
];

const SUGGESTIONS = [
  'Add full-cutoff shielding to direct light downward and reduce glare.',
  'Lower the brightness after business hours or add dimming schedules.',
  'Use warmer bulbs (2700K-3000K) to reduce blue light scatter.'
];

function loadStoredReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveReports(reports) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    // Ignore storage failures.
  }
}

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click: (event) => {
      onSelect({ lat: event.latlng.lat.toFixed(6), lng: event.latlng.lng.toFixed(6) });
    }
  });
  return null;
}

export default function LightingReporter() {
  const [reports, setReports] = useState(() => {
    const stored = typeof window !== 'undefined' ? loadStoredReports() : null;
    return stored || initialReports;
  });
  const [location, setLocation] = useState({ lat: '', lng: '' });
  const [lightType, setLightType] = useState('streetlight');
  const [timestamp, setTimestamp] = useState('');
  const [notes, setNotes] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [status, setStatus] = useState('Click the map or capture GPS to set location.');
  const fileInputRef = useRef(null);

  useEffect(() => {
    saveReports(reports);
  }, [reports]);

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
      setStatus('Geolocation not supported.');
      return;
    }
    setStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        };
        setLocation(next);
        setStatus('Location captured.');
      },
      (err) => {
        setStatus(err.message || 'Unable to fetch location.');
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
      setStatus('Please set a location before submitting.');
      return;
    }

    const newReport = {
      id: `report-${Date.now()}`,
      lat: Number(location.lat),
      lng: Number(location.lng),
      lightType,
      timestamp: new Date(timestamp).toISOString(),
      photo: photoData || '',
      notes: notes.trim()
    };

    setReports((prev) => [newReport, ...prev]);
    setNotes('');
    setPhotoPreview('');
    setPhotoData('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setStatus('Report submitted.');
  }

  const mapCenter = useMemo(() => {
    if (location.lat && location.lng) {
      return [Number(location.lat), Number(location.lng)];
    }
    if (reports.length > 0) {
      return [reports[0].lat, reports[0].lng];
    }
    return DEFAULT_CENTER;
  }, [location, reports]);

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Flag a Light</h2>
              <p className="text-sm text-slate-300">
                Flag fixtures that contribute to glare, light trespass, or over-illumination.
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
          <p className="mt-3 text-xs text-slate-300">{status}</p>

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
              Light Type
              <select
                value={lightType}
                onChange={(event) => setLightType(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              >
                {LIGHT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

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
              Upload Photo
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
                <img src={photoPreview} alt="Problem lighting preview" className="h-40 w-full rounded-lg object-cover" />
              </div>
            )}

            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Notes
              <textarea
                rows="3"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                placeholder="Describe glare, spill light, or safety concerns."
              />
            </label>

            <button type="submit" className="ui-button rounded-xl py-2 text-sm font-semibold">
              Submit Report
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Suggested Fixes</h3>
          <p className="mt-3 text-sm text-slate-300">AI-guided improvements based on community reports:</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            {SUGGESTIONS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Public Report Map</h3>
          <p className="mt-2 text-xs text-slate-300">Click the map to set the report location.</p>
          <div className="mt-4 h-[420px] overflow-hidden rounded-2xl">
            <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} className="h-full w-full">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onSelect={setLocation} />

              {location.lat && location.lng && (
                <Marker position={[Number(location.lat), Number(location.lng)]}>
                  <Popup>Selected report location</Popup>
                </Marker>
              )}

              {reports.map((report) => (
                <CircleMarker
                  key={report.id}
                  center={[report.lat, report.lng]}
                  radius={9}
                  pathOptions={{ color: '#60a5fa', fillColor: '#38bdf8', fillOpacity: 0.75 }}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <div><strong>{report.lightType}</strong></div>
                      <div>{formatTimestamp(report.timestamp)}</div>
                      <div>{report.notes || 'No notes provided.'}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Recent Reports</h3>
          <div className="mt-4 space-y-3">
            {reports.slice(0, 5).map((report) => (
              <div key={report.id} className="metric-row text-sm text-slate-100">
                <div>
                  <div className="font-semibold">{report.lightType}</div>
                  <div className="text-xs text-slate-300">{formatTimestamp(report.timestamp)}</div>
                  <div className="text-xs text-slate-400">
                    {report.lat.toFixed(4)}, {report.lng.toFixed(4)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  {report.notes || 'No notes'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
