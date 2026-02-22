import { GoogleGenAI } from '@google/genai';

const GEMINI_MODEL = 'gemini-3-flash-preview';

function safeJsonParse(rawText) {
  try {
    return JSON.parse(rawText);
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function getGeminiClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'key') {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY in your .env file.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateGeminiInsights({
  locationName,
  intensity,
  bortleScore,
  nearbyLowerPollution = [],
  signal
}) {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const nearbyContext = nearbyLowerPollution.length > 0
    ? nearbyLowerPollution
      .map((place) => `${place.name} (${place.distanceKm} km away, intensity ${place.intensity})`)
      .join('; ')
    : 'No known nearby lower-pollution points found in the sampled radius.';

  const prompt = [
    'You are helping a stargazer understand local night-sky conditions.',
    `Location: ${locationName}`,
    `Light intensity: ${intensity} (0-100, higher means brighter skyglow)`,
    `Estimated Bortle score: ${bortleScore}`,
    `Nearby candidate places with potentially less light pollution: ${nearbyContext}`,
    'Return strict JSON with keys:',
    'stargazingAdvice (string), pollutionCauseSummary (string), nearbyDarkerPlaces (array of short strings), environmentalImpactSummary (string), lightingImprovementSuggestions (array of short strings).',
    'For nearbyDarkerPlaces, prioritize the provided nearby candidate places and explain briefly why each is better.',
    'Do not include markdown code fences.'
  ].join('\n');

  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: { temperature: 0.5 }
  });

  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const rawText = String(response?.text || '').trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty response.');
  }

  const parsed = safeJsonParse(rawText);
  if (!parsed) {
    throw new Error('Gemini response could not be parsed as JSON.');
  }

  const suggestions = Array.isArray(parsed.lightingImprovementSuggestions)
    ? parsed.lightingImprovementSuggestions
    : [];
  const nearbyDarkerPlaces = Array.isArray(parsed.nearbyDarkerPlaces)
    ? parsed.nearbyDarkerPlaces
    : [];

  return {
    stargazingAdvice: String(parsed.stargazingAdvice || '').trim(),
    pollutionCauseSummary: String(parsed.pollutionCauseSummary || '').trim(),
    nearbyDarkerPlaces: nearbyDarkerPlaces.map((item) => String(item).trim()).filter(Boolean),
    environmentalImpactSummary: String(parsed.environmentalImpactSummary || '').trim(),
    lightingImprovementSuggestions: suggestions.map((item) => String(item).trim()).filter(Boolean)
  };
}
