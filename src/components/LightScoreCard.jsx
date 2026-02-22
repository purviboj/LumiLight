import { useEffect, useMemo, useRef, useState } from 'react';
import { geocodeQuery } from '../services/geocodingService.js';
import { getLocalSkySnapshot } from '../services/localSkySnapshotService.js';

export default function LightScoreCard({
  userPosition,
  selectedYear,
  loadingLocation,
  locationError,
  initialLocationQuery = '',
  selectedLocationOverride = null,
  onSelectedLocationChange
}) {
  const [radiusKm, setRadiusKm] = useState(250);
  const [locationQuery, setLocationQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const appliedInitialQueryRef = useRef(false);

  const activeLocation = useMemo(() => {
    if (selectedLocationOverride) return selectedLocationOverride;
    if (!userPosition) return null;
    return {
      latitude: userPosition.latitude,
      longitude: userPosition.longitude,
      source: 'gps',
      label: 'Current GPS location'
    };
  }, [selectedLocationOverride, userPosition]);

  const stats = useMemo(() => {
    if (!activeLocation) return null;
    return getLocalSkySnapshot({
      location: activeLocation,
      selectedYear,
      radiusKm,
      observationDate: new Date()
    });
  }, [activeLocation, selectedYear, radiusKm]);

  async function handleLocationSearch(event) {
    event.preventDefault();
    const normalizedQuery = locationQuery.trim();
    if (!normalizedQuery || searchLoading) return;

    setSearchLoading(true);
    setSearchError('');
    try {
      const result = await geocodeQuery(normalizedQuery);
      const nextLocation = {
        latitude: result.latitude,
        longitude: result.longitude,
        source: 'search',
        label: result.displayName
      };
      onSelectedLocationChange?.(nextLocation);
      setLocationQuery(normalizedQuery);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to resolve location.');
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    if (!initialLocationQuery || appliedInitialQueryRef.current || selectedLocationOverride) return;

    appliedInitialQueryRef.current = true;
    setLocationQuery(initialLocationQuery);

    async function applyInitialQuery() {
      setSearchLoading(true);
      setSearchError('');
      try {
        const result = await geocodeQuery(initialLocationQuery);
        onSelectedLocationChange?.({
          latitude: result.latitude,
          longitude: result.longitude,
          source: 'search',
          label: result.displayName
        });
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : 'Unable to resolve location.');
      } finally {
        setSearchLoading(false);
      }
    }

    applyInitialQuery();
  }, [initialLocationQuery, onSelectedLocationChange, selectedLocationOverride]);

  useEffect(() => {
    if (!selectedLocationOverride?.label) return;
    setLocationQuery(selectedLocationOverride.label);
  }, [selectedLocationOverride]);

  function handleUseGps() {
    onSelectedLocationChange?.(null);
    setSearchError('');
    setLocationQuery('');
  }

  return (
    <section className="glass-panel panel-hover rounded-2xl p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Local Sky Snapshot</h2>

      <form onSubmit={handleLocationSearch} className="mt-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={locationQuery}
            onChange={(event) => setLocationQuery(event.target.value)}
            placeholder="ZIP or location"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-lumi-accent focus:ring-1 focus:ring-lumi-accent"
          />
          <button type="submit" disabled={searchLoading} className="ui-button rounded-lg px-3 py-2 text-xs font-semibold">
            {searchLoading ? 'Searching...' : 'Apply'}
          </button>
          <button
            type="button"
            onClick={handleUseGps}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200"
          >
            GPS
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="snapshot-radius" className="text-xs text-slate-300">
            Nearby radius
          </label>
          <select
            id="snapshot-radius"
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-slate-100 outline-none focus:border-lumi-accent"
          >
            <option value={100}>100 km</option>
            <option value={250}>250 km</option>
            <option value={500}>500 km</option>
            <option value={800}>800 km</option>
          </select>
        </div>
        {searchError && <p className="text-xs text-red-300">{searchError}</p>}
      </form>

      {!stats && (
        <p className="mt-3 text-sm text-slate-400">
          {loadingLocation && 'Locating your area...'}
          {!loadingLocation && locationError && `Location unavailable: ${locationError}`}
          {!loadingLocation && !locationError && 'No year-matched local sky data found.'}
        </p>
      )}

      {stats && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-slate-400">
            Source: {stats.location.source === 'search' ? 'Entered location' : 'GPS'} |{' '}
            {stats.location.label || 'Current position'}
          </p>
          <p className="text-xs text-slate-400">
            Nearest data point: {stats.nearestDataPoint.name} ({stats.nearestDataPoint.distanceKm} km)
          </p>
          <div className="metric-row">
            <span className="text-slate-300">Your Area Light Score</span>
            <span className="font-semibold text-lumi-accent">{stats.lightPollution.areaLightScore}/100</span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Estimated Bortle score</span>
            <span className="font-semibold text-slate-100">{stats.lightPollution.bortleScore}</span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Stars visible estimate</span>
            <span className="font-semibold text-slate-100">
              ~{stats.lightPollution.starsVisibleEstimate.toLocaleString()}
            </span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Intensity level</span>
            <span className="font-semibold text-slate-100">{stats.lightPollution.intensityLevel}</span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Milky Way visibility (now)</span>
            <span className="font-semibold text-slate-100">{stats.milkyWay.visibilityPercent}%</span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Best nearby stargazing location</span>
            <span className="font-semibold text-lumi-accent">
              {stats.stargazing.bestNearbyLocation
                ? `${stats.stargazing.bestNearbyLocation.name} (${stats.stargazing.bestNearbyLocation.distanceKm} km)`
                : `No spots within ${stats.stargazing.radiusKm} km`}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
