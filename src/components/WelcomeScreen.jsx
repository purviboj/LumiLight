import { useEffect, useState } from 'react';

const HOLD_DURATION_MS = 2600;
const FADE_OUT_DURATION_MS = 800;

export default function WelcomeScreen({ onComplete }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => {
      setIsExiting(true);
    }, HOLD_DURATION_MS);

    const completeTimer = window.setTimeout(() => {
      onComplete?.();
    }, HOLD_DURATION_MS + FADE_OUT_DURATION_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <section className={`welcome-screen ${isExiting ? 'welcome-screen-exit' : ''}`} aria-label="Welcome screen">
      <div className="welcome-stars welcome-stars-a" />
      <div className="welcome-stars welcome-stars-b" />
      <div className="welcome-center">
        <h1 className="welcome-title">LumiLight</h1>
        <p className="welcome-subtitle">Light Pollution Tracker</p>
      </div>
    </section>
  );
}
