import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { getLightPollutionData } from '../services/lightPollutionDataService.js';

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
    const weight = 1 / ((point.distanceKm + 12) ** 1.85);
    weightedTotal += point.intensity * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 0;
  return clamp(Math.round(weightedTotal / weightSum), 0, 100);
}

function getNearestPoint(points, latitude, longitude) {
  if (points.length === 0) return null;
  let nearest = points[0];
  let nearestDistance = haversineDistanceKm(latitude, longitude, points[0].latitude, points[0].longitude);
  for (let i = 1; i < points.length; i += 1) {
    const distance = haversineDistanceKm(latitude, longitude, points[i].latitude, points[i].longitude);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = points[i];
    }
  }
  return { ...nearest, distanceKm: nearestDistance };
}

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click: (event) => {
      onSelect({
        lat: event.latlng.lat.toFixed(6),
        lng: event.latlng.lng.toFixed(6)
      });
    }
  });
  return null;
}

function StatCard({ label, value, unit, helper }) {
  return (
    <div className="impact-card rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 text-slate-100">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="impact-value mt-2 text-2xl font-semibold">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-slate-300">{unit}</span> : null}
      </div>
      {helper && <p className="mt-2 text-xs text-slate-400">{helper}</p>}
    </div>
  );
}

function BarChart({ items }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{item.label}</span>
            <span>{item.display}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-800/80">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-500"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EnergyImpactAnalyzer() {
  const [location, setLocation] = useState({ lat: '', lng: '' });
  const [radiusKm, setRadiusKm] = useState(5);
  const [hoursPerNight, setHoursPerNight] = useState(8);
  const [avgWattage, setAvgWattage] = useState(65);
  const [wasteShare, setWasteShare] = useState(0.35);
  const [carbonIntensity, setCarbonIntensity] = useState(0.37);
  const [status, setStatus] = useState('Click the map to pick a study location.');

  useEffect(() => {
    setStatus('Click the map to pick a study location.');
  }, []);

  const points = useMemo(() => getLightPollutionData(), []);
  const hasLocation = location.lat && location.lng;

  const brightnessIntensity = useMemo(() => {
    if (!hasLocation) return 0;
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const base = interpolateIntensity(points, lat, lng);
    const nearest = getNearestPoint(points, lat, lng);
    if (!nearest) return base;
    const penalty = clamp(nearest.distanceKm * 1.2, 0, 35);
    return clamp(Math.round(base - penalty), 0, 100);
  }, [hasLocation, location, points]);

  const estimatedSources = useMemo(() => {
    if (!hasLocation) return 0;
    const urbanFactor = Math.pow(brightnessIntensity / 100, 1.4);
    const base = 8 + radiusKm * 6 + urbanFactor * 420;
    return Math.round(clamp(base, 6, 520));
  }, [hasLocation, brightnessIntensity, radiusKm]);

  const nightlyUsage = useMemo(() => {
    if (!hasLocation) return 0;
    return (estimatedSources * avgWattage * hoursPerNight) / 1000;
  }, [hasLocation, estimatedSources, avgWattage, hoursPerNight]);

  const annualUsage = nightlyUsage * 365;
  const annualWaste = annualUsage * wasteShare;
  const annualCO2 = annualWaste * carbonIntensity;
  const gallonsGas = annualCO2 / 8.89;
  const milesDriven = annualCO2 / 0.39;

  const mapCenter = useMemo(() => {
    if (hasLocation) return [Number(location.lat), Number(location.lng)];
    return DEFAULT_CENTER;
  }, [hasLocation, location]);

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

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Energy Footprint</h2>
              <p className="text-sm text-slate-300">
                Estimate energy waste and carbon impact tied to excessive nighttime lighting.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Modeled estimates based on the app’s mock light-pollution dataset. Real-world values will vary.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGeolocate}
              className="ui-button rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide"
            >
              Use GPS
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-300">{status}</p>
          {hasLocation && (
            <p className="mt-1 text-xs text-slate-400">
              Selected location: {Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}
            </p>
          )}

          <div className="mt-4 h-[420px] overflow-hidden rounded-2xl">
            <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} className="h-full w-full">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onSelect={setLocation} />
              {hasLocation && (
                <Marker position={[Number(location.lat), Number(location.lng)]}>
                  <Popup>Selected analysis location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Study Radius (km)
              <input
                type="range"
                min="1"
                max="20"
                value={radiusKm}
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                className="time-slider mt-3 w-full"
              />
              <span className="mt-1 block text-xs text-slate-400">{radiusKm} km</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Lighting Hours / Night
              <input
                type="range"
                min="1"
                max="14"
                value={hoursPerNight}
                onChange={(event) => setHoursPerNight(Number(event.target.value))}
                className="time-slider mt-3 w-full"
              />
              <span className="mt-1 block text-xs text-slate-400">{hoursPerNight} hours</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Avg Fixture Wattage
              <input
                type="number"
                min="10"
                max="400"
                value={avgWattage}
                onChange={(event) => setAvgWattage(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Estimated Waste Share
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={wasteShare}
                onChange={(event) => setWasteShare(Number(event.target.value))}
                className="time-slider mt-3 w-full"
              />
              <span className="mt-1 block text-xs text-slate-400">{Math.round(wasteShare * 100)}%</span>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Carbon Intensity (kg CO₂/kWh)
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="1"
                value={carbonIntensity}
                onChange={(event) => setCarbonIntensity(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              />
              <span className="mt-1 block text-xs text-slate-400">Default uses US grid average.</span>
            </label>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Reduce Light Pollution</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <div className="metric-row">
              <div>
                <div className="font-semibold text-slate-100">Shielded Fixtures</div>
                <div className="text-xs text-slate-400">Full-cutoff lighting directs light downward only.</div>
              </div>
              <span className="text-xs text-slate-400">Less glare</span>
            </div>
            <div className="metric-row">
              <div>
                <div className="font-semibold text-slate-100">Lower Kelvin Bulbs</div>
                <div className="text-xs text-slate-400">Warmer LEDs reduce blue-light scatter in the atmosphere.</div>
              </div>
              <span className="text-xs text-slate-400">Healthier skies</span>
            </div>
            <div className="metric-row">
              <div>
                <div className="font-semibold text-slate-100">Timed Schedules</div>
                <div className="text-xs text-slate-400">Dimming after peak hours cuts energy waste.</div>
              </div>
              <span className="text-xs text-slate-400">Smarter use</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Impact Snapshot</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard label="Brightness Intensity" value={brightnessIntensity || '--'} unit="/100" />
            <StatCard label="Estimated Light Sources" value={hasLocation ? estimatedSources : '--'} />
            <StatCard label="Nightly Usage" value={hasLocation ? nightlyUsage.toFixed(1) : '--'} unit="kWh" />
            <StatCard label="Annual Energy Waste" value={hasLocation ? annualWaste.toFixed(0) : '--'} unit="kWh" />
            <StatCard label="Annual CO₂" value={hasLocation ? annualCO2.toFixed(0) : '--'} unit="kg" />
            <StatCard
              label="CO₂ Equivalents"
              value={hasLocation ? `${milesDriven.toFixed(0)} mi` : '--'}
              helper={hasLocation ? `≈ ${gallonsGas.toFixed(0)} gal gasoline` : ''}
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Energy + Carbon Bars</h3>
          <div className="mt-4">
            <BarChart
              items={[
                {
                  label: 'Nightly kWh',
                  value: nightlyUsage,
                  display: `${nightlyUsage.toFixed(1)} kWh`
                },
                {
                  label: 'Annual Waste',
                  value: annualWaste,
                  display: `${annualWaste.toFixed(0)} kWh`
                },
                {
                  label: 'Annual CO₂',
                  value: annualCO2,
                  display: `${annualCO2.toFixed(0)} kg`
                }
              ]}
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Smart Tech + Pioneers</h3>
          <div className="mt-4 grid gap-4">
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Full-Cutoff Shielding</div>
                  <div className="text-xs text-slate-400">Directional optics reduce upward spill.</div>
                </div>
                <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
                  <rect x="8" y="6" width="44" height="8" rx="4" fill="#60a5fa" />
                  <rect x="20" y="14" width="20" height="6" rx="3" fill="#1e293b" />
                  <polygon points="30,20 18,34 42,34" fill="#f59e0b" />
                </svg>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Adaptive Dimming</div>
                  <div className="text-xs text-slate-400">Schedules and sensors cut late-night output.</div>
                </div>
                <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
                  <circle cx="30" cy="20" r="12" stroke="#38bdf8" strokeWidth="4" />
                  <path d="M30 8v12l8 6" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Warm LED Retrofits</div>
                  <div className="text-xs text-slate-400">Lower Kelvin bulbs keep skies darker.</div>
                </div>
                <svg width="60" height="40" viewBox="0 0 60 40" fill="none">
                  <rect x="24" y="6" width="12" height="18" rx="6" fill="#fbbf24" />
                  <rect x="22" y="24" width="16" height="6" rx="3" fill="#94a3b8" />
                </svg>
              </div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
              <div className="text-sm font-semibold text-slate-100">Dark-Sky Movement Pioneers</div>
              <p className="mt-1 text-xs text-slate-400">
                David Crawford and Tim Hunter helped launch the modern dark-sky movement, inspiring smart lighting
                standards worldwide.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
