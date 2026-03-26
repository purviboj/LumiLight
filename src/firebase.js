import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// NOTE: using explicit config values provided. For security, consider moving
// these into a local `.env` file (VITE_... variables) for development and
// environment variables for production. Do NOT commit production secrets.
const firebaseConfig = {
  apiKey: "AIzaSyCtY8I4gNg29ccMI3FMjV9NbvtfIch--Vo",
  authDomain: "luminight-d7f69.firebaseapp.com",
  projectId: "luminight-d7f69",
  storageBucket: "luminight-d7f69.firebasestorage.app",
  messagingSenderId: "583340627943",
  appId: "1:583340627943:web:8f79647bbea65e38240f42"
};

const requiredKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

let firebaseInitError = null;
let app = null;
let auth = null;

// Initialize Firebase safely. Wrap in try/catch so any runtime errors (bad config,
// missing runtime globals, etc.) are surfaced via `firebaseInitError` instead of
// crashing the whole app and producing a blank screen.
if (requiredKeys.length > 0) {
  firebaseInitError = new Error(
    `Missing Firebase environment variables: ${requiredKeys.join(', ')}`
  );
} else {
  try {
    // Only initialize if we're running in a browser-like environment. This avoids
    // issues if the module is imported in an SSR/context without a global window.
    if (typeof window !== 'undefined') {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
    } else {
      firebaseInitError = new Error('Firebase initialization skipped: no window available');
    }
  } catch (err) {
    // Capture the error so the rest of the app can render and show a helpful
    // message instead of crashing to a blank page.
    firebaseInitError = err instanceof Error ? err : new Error(String(err));
    app = null;
    auth = null;
  }
}

export { auth, firebaseInitError };
export default app;
