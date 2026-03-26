import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import SunCalc from 'suncalc';
import { fetchViirsRadiance } from '../services/noaaViirsService.js';
import { fetchOpenWeatherCurrent, fetchOpenWeatherForecast } from '../services/openWeatherService.js';
import { getLightPollutionData } from '../services/lightPollutionDataService.js';

const DEFAULT_CENTER = [39.8283, -98.5795];
const DEFAULT_ZOOM = 4;
const VIIRS_IMAGE_SERVER =
  'https://gis.ngdc.noaa.gov/arcgis/rest/services/NPP_VIIRS_DNB/Nightly_Radiance/ImageServer';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function radianceToBortle(radiance) {
  if (radiance <= 0.25) return 1;
  if (radiance <= 0.5) return 2;
  if (radiance <= 1) return 3;
  if (radiance <= 2) return 4;
  if (radiance <= 4) return 5;
  if (radiance <= 8) return 6;
  if (radiance <= 16) return 7;
  if (radiance <= 32) return 8;
  return 9;
}

function radianceToBrightnessIndex(radiance) {
  if (!Number.isFinite(radiance)) return 0;
  const logValue = Math.log10(radiance + 0.1);
  return clamp(Math.round((logValue + 1) * 30), 0, 100);
}

function skyQualityLabel(score) {
  if (score <= 20) return 'Excellent';
  if (score <= 40) return 'Good';
  if (score <= 60) return 'Moderate';
  if (score <= 80) return 'Poor';
  return 'Very Poor';
}

function formatHourLabel(date) {
  return date.toLocaleTimeString([], { hour: 'numeric' });
}

function getNightHours(hourly) {
  return hourly.filter((hour) => {
    const h = hour.date.getHours();
    return h >= 19 || h <= 5;
  });
}

function buildHourlyFromOpenWeather(payload) {
  if (!payload?.list) return [];
  return payload.list.map((item) => ({
    date: new Date(item.dt * 1000),
    temperature: item.main?.temp ?? 0,
    feelsLike: item.main?.feels_like ?? 0,
    humidity: item.main?.humidity ?? 0,
    visibility: item.visibility ?? 0,
    cloudCover: item.clouds?.all ?? 0,
    cloudLow: item.clouds?.all ?? 0,
    cloudMid: item.clouds?.all ?? 0,
    cloudHigh: item.clouds?.all ?? 0,
    precipChance: Math.round((item.pop ?? 0) * 100),
    precipAmount: item.rain?.['3h'] ?? 0,
    windSpeed: item.wind?.speed ?? 0,
    windDirection: item.wind?.deg ?? 0,
    pressure: item.main?.pressure ?? 0
  }));
}

function getMoonPhaseName(phase) {
  if (phase < 0.03 || phase > 0.97) return 'New Moon';
  if (phase < 0.22) return 'Waxing Crescent';
  if (phase < 0.28) return 'First Quarter';
  if (phase < 0.47) return 'Waxing Gibbous';
  if (phase < 0.53) return 'Full Moon';
  if (phase < 0.72) return 'Waning Gibbous';
  if (phase < 0.78) return 'Last Quarter';
  return 'Waning Crescent';
}

function formatOptionalTime(date) {
  if (!date || Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

function ViirsOverlay() {
  const map = useMap();

  useEffect(() => {
    let layer = null;
    import('esri-leaflet').then((esri) => {
      layer = esri.imageMapLayer({
        url: VIIRS_IMAGE_SERVER,
        opacity: 0.55
      }).addTo(map);
    });

    return () => {
      if (layer) {
        layer.remove();
      }
    };
  }, [map]);

  return null;
}

export default function NightSkyForecast() {
  const [location, setLocation] = useState({ lat: '', lng: '' });
  const [status, setStatus] = useState('Select a location with VIIRS coverage.');
  const [radiance, setRadiance] = useState(null);
  const [forecastWeather, setForecastWeather] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [error, setError] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const viirsLocations = useMemo(() => getLightPollutionData(), []);
  const savedLocations = useMemo(() => viirsLocations.slice(0, 10), [viirsLocations]);

  const hasLocation = location.lat && location.lng;
  const brightnessIndex = radiance !== null ? radianceToBrightnessIndex(radiance) : 0;
  const bortle = radiance !== null ? radianceToBortle(radiance) : '--';

  function loadForecast(nextLat, nextLng, label) {
    setError('');
    setStatus('Fetching VIIRS radiance + weather...');

    Promise.all([
      fetchViirsRadiance(nextLat, nextLng),
      fetchOpenWeatherCurrent(nextLat, nextLng),
      fetchOpenWeatherForecast(nextLat, nextLng)
    ])
      .then(([nextRadiance, current, forecast]) => {
        setLocation({ lat: nextLat.toFixed(6), lng: nextLng.toFixed(6) });
        setRadiance(nextRadiance);
        setCurrentWeather(current);
        setForecastWeather(forecast);
        setSelectedIndex(0);
        setStatus(label ? `Forecast ready for ${label}.` : 'Forecast ready.');
      })
      .catch((err) => {
        const message = err.message || 'Unable to build forecast.';
        if (message.toLowerCase().includes('viirs radiance value not found')) {
          setStatus('No VIIRS data here. Select one of the marked locations.');
        } else {
          setStatus('');
        }
        setError(message);
      });
  }

  const hourlyAll = useMemo(() => buildHourlyFromOpenWeather(forecastWeather), [forecastWeather]);
  const nightHours = useMemo(() => getNightHours(hourlyAll), [hourlyAll]);

  function computeSkyScore({ cloudCover = 0, humidity = 0, moonIllumination = 0 }) {
    if (radiance === null) return null;
    const baseBrightness = brightnessIndex;
    return clamp(
      baseBrightness * 0.45 + cloudCover * 0.25 + moonIllumination * 0.2 + humidity * 0.1,
      0,
      100
    );
  }

  function computeDewPoint(tempC, humidity) {
    if (!Number.isFinite(tempC) || !Number.isFinite(humidity)) return null;
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  }

  function computeAirQualityProxy({ humidity = 0, windSpeed = 0 }) {
    const score = clamp(100 - humidity * 0.6 - windSpeed * 8, 0, 100);
    if (score >= 75) return 'Good';
    if (score >= 55) return 'Moderate';
    if (score >= 35) return 'Poor';
    return 'Very Poor';
  }

  function computeUvProxy({ cloudCover = 0, moonIllumination = 0 }) {
    const score = clamp(4 + moonIllumination / 25 - cloudCover / 50, 0, 10);
    if (score < 2) return 'Low';
    if (score < 5) return 'Moderate';
    if (score < 7) return 'High';
    if (score < 9) return 'Very High';
    return 'Extreme';
  }

  const hourlyForecast = useMemo(() => {
    if (!nightHours.length || radiance === null) return [];

    return nightHours.map((hour) => {
      const moonIllumination = SunCalc.getMoonIllumination(hour.date).fraction * 100;
      const moonPos = SunCalc.getMoonPosition(hour.date, Number(location.lat), Number(location.lng));
      const moonAltitude = (moonPos.altitude * 180) / Math.PI;

      const cloudCover = hour.cloudCover || 0;
      const humidity = hour.humidity || 0;
      const transparency = clamp(100 - (cloudCover * 0.6 + humidity * 0.4), 0, 100);

      const skyScore = computeSkyScore({ cloudCover, humidity, moonIllumination });

      return {
        date: hour.date,
        localLabel: formatHourLabel(hour.date),
        skyScore,
        cloudCover,
        cloudLow: hour.cloudLow,
        cloudMid: hour.cloudMid,
        cloudHigh: hour.cloudHigh,
        humidity,
        transparency,
        moonIllumination,
        moonAltitude,
        temperature: hour.temperature,
        feelsLike: hour.feelsLike,
        windSpeed: hour.windSpeed,
        windDirection: hour.windDirection,
        precipChance: hour.precipChance,
        precipAmount: hour.precipAmount,
        visibility: hour.visibility,
        pressure: hour.pressure
      };
    });
  }, [nightHours, radiance, brightnessIndex, location]);

  const bestHour = useMemo(() => {
    if (!hourlyForecast.length) return null;
    return hourlyForecast.reduce((best, current) =>
      current.skyScore < best.skyScore ? current : best
    );
  }, [hourlyForecast]);

  const bestViewingWindow = useMemo(() => {
    if (!hourlyForecast.length) return null;
    const windowSize = 3;
    let best = null;
    for (let i = 0; i <= hourlyForecast.length - windowSize; i += 1) {
      const slice = hourlyForecast.slice(i, i + windowSize);
      const avg = slice.reduce((acc, hour) => acc + hour.skyScore, 0) / slice.length;
      if (!best || avg < best.avg) {
        best = {
          start: slice[0].localLabel,
          end: slice[slice.length - 1].localLabel,
          avg
        };
      }
    }
    return best;
  }, [hourlyForecast]);

  const nowHour = hourlyAll[0];
  const currentNight = hourlyForecast[selectedIndex];
  const activeHour = currentNight || nowHour;

  const activeMoonIllumination = useMemo(() => {
    if (!activeHour) return null;
    return SunCalc.getMoonIllumination(activeHour.date).fraction * 100;
  }, [activeHour]);

  const activeSkyScore = useMemo(() => {
    if (!activeHour) return null;
    return computeSkyScore({
      cloudCover: activeHour.cloudCover ?? 0,
      humidity: activeHour.humidity ?? 0,
      moonIllumination: activeMoonIllumination ?? 0
    });
  }, [activeHour, activeMoonIllumination]);

  const activeTransparency = useMemo(() => {
    if (!activeHour) return null;
    if (Number.isFinite(activeHour.transparency)) return activeHour.transparency;
    const cloudCover = activeHour.cloudCover ?? 0;
    const humidity = activeHour.humidity ?? 0;
    return clamp(100 - (cloudCover * 0.6 + humidity * 0.4), 0, 100);
  }, [activeHour]);

  const activeDewPoint = useMemo(() => {
    if (!activeHour) return null;
    return computeDewPoint(activeHour.temperature ?? null, activeHour.humidity ?? null);
  }, [activeHour]);

  const airQualityProxy = useMemo(() => {
    if (!activeHour) return null;
    return computeAirQualityProxy({
      humidity: activeHour.humidity ?? 0,
      windSpeed: activeHour.windSpeed ?? 0
    });
  }, [activeHour]);

  const uvProxy = useMemo(() => {
    if (!activeHour) return null;
    return computeUvProxy({
      cloudCover: activeHour.cloudCover ?? 0,
      moonIllumination: activeMoonIllumination ?? 0
    });
  }, [activeHour, activeMoonIllumination]);

  const precipTotal = useMemo(() => {
    if (!hourlyForecast.length) return null;
    const sum = hourlyForecast.reduce((acc, hour) => acc + (hour.precipAmount ?? 0), 0);
    return Math.round(sum * 10) / 10;
  }, [hourlyForecast]);

  const moonInfo = useMemo(() => {
    if (!currentNight || !hasLocation) return null;
    const illumination = SunCalc.getMoonIllumination(currentNight.date);
    const phaseName = getMoonPhaseName(illumination.phase);
    const moonTimes = SunCalc.getMoonTimes(currentNight.date, Number(location.lat), Number(location.lng));
    return {
      phaseName,
      illumination: Math.round(illumination.fraction * 100),
      moonset: formatOptionalTime(moonTimes.set),
      moonrise: formatOptionalTime(moonTimes.rise)
    };
  }, [currentNight, hasLocation, location]);

  const mapCenter = useMemo(() => {
    if (hasLocation) return [Number(location.lat), Number(location.lng)];
    return DEFAULT_CENTER;
  }, [hasLocation, location]);

  return (
    <section className="forecast-shell">
      <header className="forecast-header">
        <div>
          <h1>Night Sky Forecast</h1>
          <p>Real-time sky quality from VIIRS + OpenWeather + SunCalc</p>
        </div>
        <div className="forecast-status">
          <span>{status}</span>
          {error && <span className="error">{error}</span>}
        </div>
      </header>

      <section className="forecast-hero-card">
        <div className="hero-location">📍 {currentWeather?.name || 'Select a location'}</div>
        <div className="hero-score">
          <span className="hero-score-value">
            {activeSkyScore !== null ? (10 - activeSkyScore / 10).toFixed(1) : '--'}
          </span>
          <span className="hero-score-label">{activeSkyScore !== null ? skyQualityLabel(activeSkyScore) : 'No data'}</span>
        </div>
        <p className="hero-summary">
          {activeSkyScore !== null
            ? 'Perfect conditions for stargazing tonight.'
            : 'Select a marker to load sky conditions.'}
        </p>
        <button type="button" className="hero-cta">Explore Sky</button>
        <div className="hero-moon">
          <div className="moon-icon">🌙</div>
          <span>{moonInfo ? moonInfo.phaseName : 'Moon phase'}</span>
        </div>
      </section>

      <section className="forecast-hourly">
        <div className="section-title">
          <span className="section-dot" />
          Hourly Forecast
        </div>
        <div className="hourly-row">
          {hourlyForecast.slice(0, 10).map((hour, index) => (
            <button
              key={hour.date.toISOString()}
              type="button"
              className={`hourly-chip ${index === selectedIndex ? 'active' : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <span>{index === 0 ? 'Now' : hour.localLabel}</span>
              <span className="hourly-icon">{hour.cloudCover > 50 ? '☁️' : '🌙'}</span>
              <strong>{(10 - hour.skyScore / 10).toFixed(1)}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="forecast-grid">
        <div className="forecast-card">
          <div className="card-title">Sky Quality Score</div>
          <div className="card-value">{activeSkyScore !== null ? (10 - activeSkyScore / 10).toFixed(1) : '--'}</div>
          <p>{activeSkyScore !== null ? 'Exceptional viewing conditions' : 'Awaiting forecast'}</p>
        </div>
        <div className="forecast-card">
          <div className="card-title">Bortle Scale</div>
          <div className="card-value">Class {bortle}</div>
          <p>Truly dark site</p>
        </div>
        <div className="forecast-card">
          <div className="card-title">Moon Phase</div>
          <div className="moon-card">
            <span className="moon-emoji">🌙</span>
            <div>
              <div>Phase</div>
              <strong>{moonInfo ? moonInfo.phaseName : '--'}</strong>
            </div>
            <div>
              <div>Illumination</div>
              <strong>{moonInfo ? `${moonInfo.illumination}%` : '--'}</strong>
            </div>
            <div>
              <div>Rise</div>
              <strong>{moonInfo ? moonInfo.moonrise : '--'}</strong>
            </div>
            <div>
              <div>Set</div>
              <strong>{moonInfo ? moonInfo.moonset : '--'}</strong>
            </div>
          </div>
        </div>
        <div className="forecast-card">
          <div className="card-title">Cloud Cover</div>
          <div className="card-value">{activeHour ? `${Math.round(activeHour.cloudCover)}%` : '--'}</div>
          <p>Sky condition: {activeHour ? (activeHour.cloudCover > 50 ? 'Cloudy' : 'Mostly Clear') : '--'}</p>
        </div>
        <div className="forecast-card">
          <div className="card-title">Humidity</div>
          <div className="card-value">{activeHour ? `${Math.round(activeHour.humidity)}%` : '--'}</div>
          <p>Dew point {activeDewPoint !== null ? `${Math.round(activeDewPoint)}°C` : '--'}</p>
        </div>
        <div className="forecast-card">
          <div className="card-title">Visibility</div>
          <div className="card-value">{activeHour ? `${Math.round(activeHour.visibility / 1000)} km` : '--'}</div>
          <p>Air quality: {airQualityProxy ?? '--'}</p>
        </div>
        <div className="forecast-card">
          <div className="card-title">Wind</div>
          <div className="card-value">{activeHour ? `${Math.round(activeHour.windSpeed)} m/s` : '--'}</div>
          <p>Direction {activeHour ? `${Math.round(activeHour.windDirection)}°` : '--'}</p>
        </div>
        <div className="forecast-card">
          <div className="card-title">Precipitation</div>
          <div className="card-value">{activeHour ? `${Math.round(activeHour.precipChance)}%` : '--'}</div>
          <p>Tonight total {precipTotal !== null ? `${precipTotal} mm` : '--'}</p>
        </div>
        <div className="forecast-card forecast-card-wide">
          <div className="card-title">Best Stargazing Window</div>
          <div className="card-value">{bestViewingWindow ? `${bestViewingWindow.start} – ${bestViewingWindow.end}` : '--'}</div>
          <div className="window-strip">
            {hourlyForecast.slice(0, 8).map((hour) => (
              <span key={hour.date.toISOString()}>{hour.localLabel}</span>
            ))}
          </div>
        </div>
        <div className="forecast-card">
          <div className="card-title">Sky Score Weights</div>
          <ul className="weight-list">
            <li><span className="dot base" /> Base Light Pollution <strong>45%</strong></li>
            <li><span className="dot clouds" /> Cloud Cover <strong>25%</strong></li>
            <li><span className="dot moon" /> Moon Illumination <strong>20%</strong></li>
            <li><span className="dot humidity" /> Humidity <strong>10%</strong></li>
          </ul>
          <small>Combined factors determine your overall sky quality score.</small>
        </div>
      </section>

      <section className="forecast-bottom">
        <aside className="forecast-locations">
          <div className="card-title">Locations</div>
          <p>10 dark sky sites</p>
          <div className="location-list">
            {savedLocations.map((place) => (
              <button
                key={place.id}
                type="button"
                className="location-item"
                onClick={() => loadForecast(place.latitude, place.longitude, place.name)}
              >
                <div>
                  <strong>{place.name}</strong>
                </div>
                <span className="location-score">{place.intensity}°F</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="forecast-map">
          <div className="card-title">Light Pollution Map</div>
          <div className="map-frame">
            <MapContainer center={mapCenter} zoom={DEFAULT_ZOOM} className="h-full w-full">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ViirsOverlay />
              <MapClickHandler onSelect={(next) => loadForecast(Number(next.lat), Number(next.lng))} />
              {viirsLocations.map((place) => (
                <Marker
                  key={place.id}
                  position={[place.latitude, place.longitude]}
                  eventHandlers={{
                    click: () => loadForecast(place.latitude, place.longitude, place.name)
                  }}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <div className="font-semibold">{place.name}</div>
                      <div>Click to forecast</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {hasLocation && (
                <Marker position={[Number(location.lat), Number(location.lng)]}>
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <div><strong>Bortle {bortle}</strong></div>
                      {radiance !== null && <div>Radiance: {radiance.toFixed(3)}</div>}
                      <div>Brightness index: {brightnessIndex}</div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          <div className="map-legend">
            <span className="legend-chip low" /> Low
            <span className="legend-chip moderate" /> Moderate
            <span className="legend-chip high" /> High
            <span className="legend-chip very-high" /> Very High
          </div>
        </div>
      </section>
    </section>
  );
}
