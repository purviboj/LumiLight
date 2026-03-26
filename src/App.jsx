import { useState } from 'react';
import AuthPage from './components/AuthPage.jsx';
import CitizenScienceLab from './components/CitizenScienceLab.jsx';
import EnergyImpactAnalyzer from './components/EnergyImpactAnalyzer.jsx';
import HistoricalTimelineSlider from './components/HistoricalTimelineSlider.jsx';
import LandingGlobe from './components/LandingGlobe.jsx';
import LightPollutionPage from './components/LightPollutionPage.jsx';
import LightScoreCard from './components/LightScoreCard.jsx';
import LightingReporter from './components/LightingReporter.jsx';
import MapView from './components/MapView.jsx';
import NightSkyForecast from './components/NightSkyForecast.jsx';
import RestoreNightToggle from './components/RestoreNightToggle.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import WildlifeImpactMap from './components/WildlifeImpactMap.jsx';
import useGeolocation from './hooks/useGeolocation.js';

const MIN_YEAR = 1990;
const MAX_YEAR = 2025;
const APP_TABS = [
  { id: 'map', label: 'Sky Map' },
  { id: 'timeline', label: 'Historical Timeline' },
  { id: 'light-pollution', label: 'The Science' },
  { id: 'citizen-science', label: 'Field Reports' },
  { id: 'lighting-reporter', label: 'Flag a Light' },
  { id: 'energy-impact', label: 'Energy Footprint' },
  { id: 'wildlife-impact', label: 'Wildlife Impact Map' },
  { id: 'night-forecast', label: 'Night Sky Forecast' }
];

function App() {
  // App-level year state lets sibling components stay synchronized.
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [entryLocationQuery, setEntryLocationQuery] = useState('');
  const [selectedLocationOverride, setSelectedLocationOverride] = useState(null);
  const [selectedYear, setSelectedYear] = useState(MAX_YEAR);
  const [restoreNightMode, setRestoreNightMode] = useState(false);
  const [nightModeEnabled, setNightModeEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const { position, error, loading } = useGeolocation();

  if (!isAuthenticated && showWelcome) {
    return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  if (showLanding) {
    return (
      <LandingGlobe
        onContinue={(query) => {
          setEntryLocationQuery(query);
          setShowLanding(false);
        }}
      />
    );
  }

  const sharedMapProps = {
    selectedYear,
    position,
    error,
    loading,
    restoreNightMode,
    selectedLocationOverride,
    nightMode: nightModeEnabled
  };

  function renderActiveTab() {
    if (activeTab === 'light-pollution') {
      return (
        <section className="light-blog-shell">
          <LightPollutionPage />
        </section>
      );
    }

    if (activeTab === 'timeline') {
      return (
        <section className="mx-auto flex min-h-[calc(100vh-154px)] w-full max-w-7xl flex-col gap-4 lg:flex-row">
          <div className="glass-panel panel-hover min-h-[58vh] flex-1 overflow-hidden rounded-2xl">
            <MapView {...sharedMapProps} />
          </div>
          <aside className="glass-panel flex w-full flex-col gap-4 rounded-2xl p-4 lg:max-w-sm">
            <HistoricalTimelineSlider
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              minYear={MIN_YEAR}
              maxYear={MAX_YEAR}
            />
            <LightScoreCard
              userPosition={position}
              selectedYear={selectedYear}
              loadingLocation={loading}
              locationError={error}
              initialLocationQuery={entryLocationQuery}
              selectedLocationOverride={selectedLocationOverride}
              onSelectedLocationChange={setSelectedLocationOverride}
            />
          </aside>
        </section>
      );
    }

    if (activeTab === 'citizen-science') {
      return <CitizenScienceLab />;
    }

    if (activeTab === 'lighting-reporter') {
      return <LightingReporter />;
    }

    if (activeTab === 'energy-impact') {
      return <EnergyImpactAnalyzer />;
    }

    if (activeTab === 'wildlife-impact') {
      return <WildlifeImpactMap />;
    }

    if (activeTab === 'night-forecast') {
      return <NightSkyForecast />;
    }

    return (
      <section className="mx-auto flex min-h-[calc(100vh-154px)] w-full max-w-7xl flex-col gap-4 lg:flex-row">
        <div className="glass-panel panel-hover min-h-[58vh] flex-1 overflow-hidden rounded-2xl">
          <MapView {...sharedMapProps} />
        </div>
        <aside className="glass-panel flex w-full flex-col gap-4 rounded-2xl p-4 lg:max-w-sm lg:overflow-y-auto">
          <LightScoreCard
            userPosition={position}
            selectedYear={selectedYear}
            loadingLocation={loading}
            locationError={error}
            initialLocationQuery={entryLocationQuery}
            selectedLocationOverride={selectedLocationOverride}
            onSelectedLocationChange={setSelectedLocationOverride}
          />
          <RestoreNightToggle
            enabled={restoreNightMode}
            onToggle={setRestoreNightMode}
            userPosition={position}
            selectedYear={selectedYear}
            loadingLocation={loading}
            locationError={error}
          />
        </aside>
      </section>
    );
  }

  return (
    <div className={`app-shell min-h-screen w-full ${nightModeEnabled ? 'app-shell-night' : ''}`}>
      <header className="app-header border-b px-5 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-2xl font-semibold tracking-wide text-lumi-accent drop-shadow-[0_0_12px_rgba(59,130,246,0.35)]">
            LumiLight
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1">
            <nav className="app-main-nav" aria-label="Main navigation">
              {APP_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`app-main-nav-chip ${activeTab === tab.id ? 'app-main-nav-chip-active' : ''}`}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setNightModeEnabled((previous) => !previous)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                nightModeEnabled
                  ? 'border-blue-300/60 bg-blue-500/30 text-blue-100'
                  : 'border-slate-600 bg-slate-900/70 text-slate-200'
              }`}
              aria-pressed={nightModeEnabled}
              aria-label="Toggle Night Mode map styling"
            >
              Night Mode {nightModeEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full p-4">
        {renderActiveTab()}
      </main>
    </div>
  );
}

export default App;
