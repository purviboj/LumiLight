import { useEffect, useMemo, useRef, useState } from 'react';
import { getLightPollutionData } from '../services/lightPollutionDataService.js';
import {
  estimateBortleScore,
  findNearestLightPollutionPoint,
  getRestoredIntensity
} from '../services/lightPollutionUtils.js';
import { generateGeminiInsights } from '../services/geminiService.js';

export default function GeminiInsights({ userPosition, selectedYear, restoreNightMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [insights, setInsights] = useState(null);
  const abortRef = useRef(null);

  const nearestResult = useMemo(() => {
    const points = getLightPollutionData();
    return findNearestLightPollutionPoint(points, userPosition, selectedYear);
  }, [userPosition, selectedYear]);

  const context = useMemo(() => {
    if (!nearestResult) return null;

    const rawIntensity = nearestResult.point.intensity;
    const effectiveIntensity = restoreNightMode ? getRestoredIntensity(rawIntensity, 0.4) : rawIntensity;

    return {
      locationName: nearestResult.point.name,
      intensity: effectiveIntensity,
      bortleScore: estimateBortleScore(effectiveIntensity)
    };
  }, [nearestResult, restoreNightMode]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function handleGenerate() {
    if (!context || loading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const result = await generateGeminiInsights({
        locationName: context.locationName,
        intensity: context.intensity,
        bortleScore: context.bortleScore,
        signal: controller.signal
      });
      setInsights(result);
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError?.message || 'Unable to load insights right now.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass-panel panel-hover rounded-2xl p-4">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between text-left hover:text-lumi-accent"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Gemini Insights</h2>
        <span
          className={`text-xs text-lumi-accent transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          ▼
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'mt-3 max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {!context && (
          <p className="text-sm text-slate-400">
            Enable location and move the year slider to generate local AI insights.
          </p>
        )}

        {context && (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
              <p>Location: {context.locationName}</p>
              <p>Intensity: {context.intensity}</p>
              <p>Bortle: {context.bortleScore}</p>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="ui-button flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && <span className="insight-spinner h-4 w-4 rounded-full border-2 border-white/35 border-t-white" />}
              {loading ? 'Generating Insights...' : insights ? 'Regenerate Insights' : 'Generate Insights'}
            </button>

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

            {insights && !loading && (
              <div className="insight-fade-in space-y-2 rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <div>
                  <h3 className="font-semibold text-slate-100">Stargazing advice</h3>
                  <p className="text-slate-300">{insights.stargazingAdvice}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Environmental impact summary</h3>
                  <p className="text-slate-300">{insights.environmentalImpactSummary}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">Lighting improvement suggestions</h3>
                  {insights.lightingImprovementSuggestions.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-slate-300">
                      {insights.lightingImprovementSuggestions.map((suggestion, index) => (
                        <li key={`${suggestion}-${index}`}>{suggestion}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-300">No specific suggestions returned for this input.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
