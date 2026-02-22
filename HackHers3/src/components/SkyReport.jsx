import { useMemo, useState } from 'react';

const STARGAZING_SPOTS = [
  'Pine Ridge Overlook',
  'Cedar Valley Dark Park',
  'Silver Mesa Trailhead',
  'Whisper Dunes Reserve',
  'North Basin Lookout',
  'Blue Canyon Ridge'
];

function inputToSeed(value) {
  return value.split('').reduce((seed, char) => seed + char.charCodeAt(0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildMockReport(query) {
  const seed = inputToSeed(query.trim().toLowerCase());
  const bortleScore = clamp((seed % 9) + 1, 1, 9);
  const milkyWayVisibility = clamp(Math.round(95 - bortleScore * 9 + (seed % 11)), 5, 95);
  const starsVisibleEstimate = clamp(Math.round(5200 - bortleScore * 430 + (seed % 280)), 250, 5000);
  const bestNearbySpot = STARGAZING_SPOTS[seed % STARGAZING_SPOTS.length];

  return {
    bortleScore,
    milkyWayVisibility,
    starsVisibleEstimate,
    bestNearbySpot
  };
}

export default function SkyReport() {
  const [query, setQuery] = useState('');
  const [reportInput, setReportInput] = useState('');

  const report = useMemo(() => {
    if (!reportInput) return null;
    return buildMockReport(reportInput);
  }, [reportInput]);

  function handleGenerate(event) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;
    setReportInput(normalizedQuery);
  }

  return (
    <section className="glass-panel panel-hover rounded-2xl p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Sky Report</h2>
      <p className="mt-1 text-xs text-slate-400">Enter a ZIP code or location to generate a local mock report.</p>

      <form onSubmit={handleGenerate} className="mt-3 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g., 94103 or Sedona, AZ"
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition duration-200 focus:border-lumi-accent focus:ring-1 focus:ring-lumi-accent"
        />
        <button
          type="submit"
          className="ui-button rounded-lg px-3 py-2 text-sm font-semibold"
        >
          Generate
        </button>
      </form>

      {report && (
        <div className="sky-report-enter mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="mb-2 text-xs text-slate-400">Report for: {reportInput}</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
              <span className="text-slate-300">Estimated Bortle score</span>
              <span className="font-semibold text-slate-100">{report.bortleScore}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
              <span className="text-slate-300">Milky Way visibility</span>
              <span className="font-semibold text-slate-100">{report.milkyWayVisibility}%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
              <span className="text-slate-300">Stars visible estimate</span>
              <span className="font-semibold text-slate-100">~{report.starsVisibleEstimate.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
              <span className="text-slate-300">Best nearby stargazing location</span>
              <span className="font-semibold text-lumi-accent">{report.bestNearbySpot}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
