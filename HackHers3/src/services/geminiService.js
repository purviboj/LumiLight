const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function extractTextFromCandidate(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => part?.text || '').join('\n').trim();
}

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

export async function generateGeminiInsights({ locationName, intensity, bortleScore, signal }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    throw new Error('Missing Gemini API key. Set VITE_GEMINI_API_KEY in your .env file.');
  }

  const prompt = [
    'You are helping a stargazer understand local night-sky conditions.',
    `Location: ${locationName}`,
    `Light intensity: ${intensity} (0-100, higher means brighter skyglow)`,
    `Estimated Bortle score: ${bortleScore}`,
    'Return strict JSON with keys:',
    'stargazingAdvice (string), environmentalImpactSummary (string), lightingImprovementSuggestions (array of short strings).',
    'Do not include markdown code fences.'
  ].join('\n');

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorBody || 'Unknown error'}`);
  }

  const data = await response.json();
  const rawText = extractTextFromCandidate(data);
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

  return {
    stargazingAdvice: String(parsed.stargazingAdvice || '').trim(),
    environmentalImpactSummary: String(parsed.environmentalImpactSummary || '').trim(),
    lightingImprovementSuggestions: suggestions.map((item) => String(item).trim()).filter(Boolean)
  };
}
