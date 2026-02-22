import { useMemo } from 'react';
import { getLightPollutionData } from '../services/lightPollutionDataService.js';
import {
  buildSkyMetrics,
  findNearestLightPollutionPoint,
  getRestoredIntensity
} from '../services/lightPollutionUtils.js';

function ComparisonCard({ label, metrics, highlight = false }) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 transition-all duration-300 ${
        highlight
          ? 'border-lumi-accent/40 bg-lumi-accent/10 shadow-lg shadow-lumi-accent/10'
          : 'border-white/10 bg-black/20'
      }`}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</h3>
      <dl className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Light Score</dt>
          <dd className="font-medium text-slate-100">{metrics.areaLightScore}/100</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Bortle</dt>
          <dd className="font-medium text-slate-100">{metrics.bortleScore}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Stars</dt>
          <dd className="font-medium text-slate-100">~{metrics.starsVisible.toLocaleString()}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Intensity</dt>
          <dd className="font-medium text-slate-100">
            {metrics.intensity} ({metrics.intensityLevel})
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function RestoreNightToggle({
  enabled,
  onToggle,
  userPosition,
  selectedYear,
  loadingLocation,
  locationError
}) {
  const nearestResult = useMemo(() => {
    const points = getLightPollutionData();
    return findNearestLightPollutionPoint(points, userPosition, selectedYear);
  }, [userPosition, selectedYear]);

  const comparison = useMemo(() => {
    if (!nearestResult) return null;

    const originalIntensity = nearestResult.point.intensity;
    const restoredIntensity = getRestoredIntensity(originalIntensity, 0.4);

    return {
      pointName: nearestResult.point.name,
      current: buildSkyMetrics(originalIntensity),
      restored: buildSkyMetrics(restoredIntensity)
    };
  }, [nearestResult]);

  return (
    <section className="glass-panel panel-hover rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Restore Night Mode</h2>
          <p className="mt-1 text-xs text-slate-400">Simulates a 40% light intensity reduction.</p>
        </div>

        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={`relative h-7 w-12 rounded-full border transition-all duration-300 hover:brightness-110 ${
            enabled ? 'border-lumi-accent/60 bg-lumi-accent/40' : 'border-slate-600 bg-slate-700/70'
          }`}
          aria-pressed={enabled}
          aria-label="Toggle Restore Night Mode"
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
              enabled ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      {!comparison && (
        <p className="mt-3 text-sm text-slate-400">
          {loadingLocation && 'Locating your area...'}
          {!loadingLocation && locationError && `Location unavailable: ${locationError}`}
          {!loadingLocation && !locationError && 'No year-matched light data found.'}
        </p>
      )}

      {comparison && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-slate-400">Nearest data point: {comparison.pointName}</p>
          <div className="grid grid-cols-2 gap-2">
            <ComparisonCard label="Current" metrics={comparison.current} />
            <ComparisonCard label="Restored" metrics={comparison.restored} highlight={enabled} />
          </div>
        </div>
      )}
    </section>
  );
}
