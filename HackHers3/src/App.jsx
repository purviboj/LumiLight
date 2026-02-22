import { useState } from 'react';
import GeminiInsights from './components/GeminiInsights.jsx';
import LightScoreCard from './components/LightScoreCard.jsx';
import MapView from './components/MapView.jsx';
import RestoreNightToggle from './components/RestoreNightToggle.jsx';
import SkyReport from './components/SkyReport.jsx';
import TimeMachineSlider from './components/TimeMachineSlider.jsx';
import useGeolocation from './hooks/useGeolocation.js';

const MIN_YEAR = 1990;
const MAX_YEAR = 2025;

function App() {
  // App-level year state lets sibling components stay synchronized.
  const [selectedYear, setSelectedYear] = useState(MAX_YEAR);
  const [restoreNightMode, setRestoreNightMode] = useState(false);
  const { position, error, loading } = useGeolocation();

  return (
    // App shell: current work is map timeline + geolocation behavior only.
    <div className="min-h-screen w-full bg-lumi-bg text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/35 px-5 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-wide text-lumi-accent drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]">
            LumiNight
          </h1>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-7xl flex-col gap-4 p-4 lg:h-[calc(100vh-73px)] lg:flex-row">
        {/* Map reacts to selected timeline year. */}
        <section className="glass-panel panel-hover min-h-[58vh] flex-1 overflow-hidden rounded-2xl lg:min-h-0">
          <MapView
            selectedYear={selectedYear}
            position={position}
            error={error}
            loading={loading}
            restoreNightMode={restoreNightMode}
          />
        </section>

        <aside className="glass-panel flex w-full flex-col gap-4 rounded-2xl p-4 lg:max-w-sm lg:overflow-y-auto">
          <LightScoreCard
            userPosition={position}
            selectedYear={selectedYear}
            loadingLocation={loading}
            locationError={error}
          />
          <RestoreNightToggle
            enabled={restoreNightMode}
            onToggle={setRestoreNightMode}
            userPosition={position}
            selectedYear={selectedYear}
            loadingLocation={loading}
            locationError={error}
          />
          <SkyReport />
          <GeminiInsights
            userPosition={position}
            selectedYear={selectedYear}
            restoreNightMode={restoreNightMode}
          />
          <TimeMachineSlider
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            minYear={MIN_YEAR}
            maxYear={MAX_YEAR}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
