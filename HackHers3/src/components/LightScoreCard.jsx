import { useMemo } from 'react';
import { getLightPollutionData } from '../services/lightPollutionDataService.js';
import {
  calculateAreaLightScore,
  estimateBortleScore,
  estimateStarsVisible,
  findNearestLightPollutionPoint,
  getIntensityLevel
} from '../services/lightPollutionUtils.js';

export default function LightScoreCard({ userPosition, selectedYear, loadingLocation, locationError }) {
  const nearestResult = useMemo(() => {
    const points = getLightPollutionData();
    return findNearestLightPollutionPoint(points, userPosition, selectedYear);
  }, [userPosition, selectedYear]);

  const stats = useMemo(() => {
    if (!nearestResult) return null;

    const { point } = nearestResult;
    const bortleScore = estimateBortleScore(point.intensity);

    return {
      areaLightScore: calculateAreaLightScore(point.intensity),
      bortleScore,
      starsVisible: estimateStarsVisible(bortleScore),
      intensityLevel: getIntensityLevel(point.intensity),
      pointName: point.name
    };
  }, [nearestResult]);

  return (
    <section className="glass-panel panel-hover rounded-2xl p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Local Sky Snapshot</h2>

      {!stats && (
        <p className="mt-3 text-sm text-slate-400">
          {loadingLocation && 'Locating your area...'}
          {!loadingLocation && locationError && `Location unavailable: ${locationError}`}
          {!loadingLocation && !locationError && 'No year-matched light data found.'}
        </p>
      )}

      {stats && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-slate-400">Nearest data point: {stats.pointName}</p>
          <div className="metric-row">
            <span className="text-slate-300">Your Area Light Score</span>
            <span className="font-semibold text-lumi-accent">{stats.areaLightScore}/100</span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Estimated Bortle score</span>
            <span className="font-semibold text-slate-100">{stats.bortleScore}</span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Stars visible estimate</span>
            <span className="font-semibold text-slate-100">~{stats.starsVisible.toLocaleString()}</span>
          </div>
          <div className="metric-row">
            <span className="text-slate-300">Intensity level</span>
            <span className="font-semibold text-slate-100">{stats.intensityLevel}</span>
          </div>
        </div>
      )}
    </section>
  );
}
