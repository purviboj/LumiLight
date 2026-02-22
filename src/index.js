// Minimal entrypoint for Lumilight
import { generateGeminiInsights } from './services/geminiService.js';

console.log('Lumilight initialized.');

// Example usage placeholder
async function main() {
  try {
    // This is just a placeholder to show the service import works.
    // Do not call generateGeminiInsights here without setting VITE_GEMINI_API_KEY in .env
  } catch (err) {
    console.error(err);
  }
}

main();
