import { useEffect, useRef, useState } from 'react';
import { geocodeQuery } from '../services/geocodingService.js';

const THREE_SCRIPT_URLS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  'https://unpkg.com/three@0.160.0/build/three.min.js'
];
const GLOBE_SCRIPT_URLS = [
  'https://cdn.jsdelivr.net/npm/globe.gl',
  'https://unpkg.com/globe.gl'
];
const EARTH_TEXTURE_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg';
const EARTH_BUMP_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';

function loadExternalScript(src, readinessCheck) {
  return new Promise((resolve, reject) => {
    if (readinessCheck()) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.body.appendChild(script);
  });
}

async function loadScriptWithFallback(urls, readinessCheck) {
  let lastError = null;
  for (const url of urls) {
    try {
      await loadExternalScript(url, readinessCheck);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Script loading failed.');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function angularDistanceDegrees(a, b) {
  const dLat = a.lat - b.lat;
  const dLng = ((((a.lng - b.lng) + 540) % 360) - 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function isZipLike(value) {
  return /^\d{5}(?:-\d{4})?$/.test(value.trim());
}

export default function LandingGlobe({ onContinue }) {
  const globeHostRef = useRef(null);
  const globeRef = useRef(null);
  const selectedTargetRef = useRef(null);
  const [loadingError, setLoadingError] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('Search a ZIP or city, then click the glowing location on Earth.');
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);

  useEffect(() => {
    selectedTargetRef.current = selectedTarget;
  }, [selectedTarget]);

  function stopGlobeAutoRotate() {
    const controls = globeRef.current?.controls?.();
    if (controls) controls.autoRotate = false;
  }

  useEffect(() => {
    let isMounted = true;
    let resizeHandler;
    let motionTimer;

    async function initializeGlobe() {
      try {
        await loadScriptWithFallback(THREE_SCRIPT_URLS, () => Boolean(window.THREE));
        await loadScriptWithFallback(GLOBE_SCRIPT_URLS, () => Boolean(window.Globe));
        if (!isMounted || !globeHostRef.current || !window.Globe) return;

        const host = globeHostRef.current;
        const globe = window
          .Globe()(host)
          .backgroundColor('rgba(0,0,0,0)')
          .globeImageUrl(EARTH_TEXTURE_URL)
          .bumpImageUrl(EARTH_BUMP_URL)
          .showAtmosphere(true)
          .atmosphereColor('#67e8f9')
          .atmosphereAltitude(0.24)
          .pointsData([])
          .pointColor(() => 'rgba(34,211,238,0.95)')
          .pointAltitude(0.02)
          .pointRadius(0.38)
          .ringsData([])
          .ringMaxRadius(3.3)
          .ringPropagationSpeed(0.95)
          .ringRepeatPeriod(950)
          .onGlobeClick((coords) => {
            const target = selectedTargetRef.current;
            if (!target) return;
            const distance = angularDistanceDegrees(
              { lat: coords.lat, lng: coords.lng },
              { lat: target.lat, lng: target.lng }
            );
            if (distance <= 13) {
              stopGlobeAutoRotate();
              onContinue(target.query || target.label || '');
            }
          })
          .onPointClick((point) => {
            stopGlobeAutoRotate();
            onContinue(point.query || point.label || '');
          });

        const controls = globe.controls();
        controls.enableDamping = true;
        controls.dampingFactor = 0.09;
        controls.rotateSpeed = 0.46;
        controls.zoomSpeed = 0.56;
        controls.enablePan = false;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.58;
        controls.minDistance = 148;
        controls.maxDistance = 420;

        // Slightly zoomed out opening camera with easing.
        globe.pointOfView({ lat: 14, lng: -28, altitude: 2.4 }, 1400);

        const scene = globe.scene();
        const THREE = window.THREE;
        if (THREE) {
          const ambient = new THREE.AmbientLight(0x91a9ff, 0.88);
          const key = new THREE.DirectionalLight(0x86f4ff, 1.08);
          key.position.set(220, 140, 180);
          const fill = new THREE.DirectionalLight(0xc084fc, 0.46);
          fill.position.set(-180, -90, -150);
          const rim = new THREE.HemisphereLight(0x22d3ee, 0x1e1b4b, 0.44);
          scene.add(ambient);
          scene.add(key);
          scene.add(fill);
          scene.add(rim);
        }

        function resize() {
          if (!host) return;
          globe.width(host.clientWidth);
          globe.height(host.clientHeight);
        }

        resize();
        resizeHandler = () => resize();
        window.addEventListener('resize', resizeHandler);

        // Gentle alive camera motion while idle for cinematic flow.
        motionTimer = window.setInterval(() => {
          const target = selectedTargetRef.current;
          if (target) return;
          const pov = globe.pointOfView();
          globe.pointOfView(
            {
              lat: clamp(pov.lat + (Math.random() - 0.5) * 3.4, -64, 64),
              lng: pov.lng + (Math.random() - 0.5) * 6.2,
              altitude: clamp(pov.altitude + (Math.random() - 0.5) * 0.06, 2.1, 2.65)
            },
            2400
          );
        }, 4200);

        globeRef.current = globe;
      } catch (error) {
        if (isMounted) {
          setLoadingError('Unable to load 3D globe assets. Check your internet/CDN access. You can still enter the map.');
        }
      }
    }

    initializeGlobe();

    return () => {
      isMounted = false;
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (motionTimer) window.clearInterval(motionTimer);
      if (globeHostRef.current) globeHostRef.current.innerHTML = '';
      globeRef.current = null;
    };
  }, [onContinue]);

  async function handleSubmit(event) {
    event.preventDefault();
    const query = locationInput.trim();
    if (!query || searching) return;

    stopGlobeAutoRotate();
    setSearching(true);
    setSearchError('');
    setStatusMessage('Locating your sky region...');

    try {
      const result = await geocodeQuery(query);
      const target = {
        lat: result.latitude,
        lng: result.longitude,
        label: result.displayName,
        query
      };

      if (!globeRef.current) {
        onContinue(query);
        return;
      }

      setSelectedTarget(target);
      selectedTargetRef.current = target;

      const globe = globeRef.current;
      globe
        .pointsData([target])
        .pointLabel((point) => point.label)
        .ringsData([target]);
      stopGlobeAutoRotate();

      globe.pointOfView(
        {
          lat: target.lat,
          lng: target.lng,
          altitude: 1.18
        },
        2000
      );

      setStatusMessage('Location locked. Click the glowing area on Earth to enter the map.');
    } catch (error) {
      setSelectedTarget(null);
      selectedTargetRef.current = null;
      setSearchError(error instanceof Error ? error.message : 'Unable to resolve location.');
      setStatusMessage('Try another nearby city or full ZIP code.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="landing-shell">
      <div className="landing-brand-wrap">
        <h1 className="landing-brand">LumiLight</h1>
      </div>
      <div className="landing-nebula-layer" />
      <div className="landing-nebula-layer landing-nebula-layer-2" />
      <div className="landing-starfield landing-starfield-a" />
      <div className="landing-starfield landing-starfield-b" />
      <div className="landing-vignette" />

      <div className="landing-globe-wrap">
        <div ref={globeHostRef} className="landing-globe-canvas" />
        {loadingError && <p className="landing-error">{loadingError}</p>}
      </div>

      <aside className="landing-panel">
        <h1>Check Your Night Sky</h1>
        <p>Enter your location to see light pollution levels.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={locationInput}
            onChange={(event) => {
              const nextValue = event.target.value;
              setLocationInput(nextValue);
              if (isZipLike(nextValue)) {
                stopGlobeAutoRotate();
              }
            }}
            placeholder="ZIP code or city"
            aria-label="ZIP code or city"
          />
          <button type="submit" disabled={searching}>
            {searching ? 'Locating...' : 'Find My Sky'}
          </button>
        </form>
        <p className="landing-status">{statusMessage}</p>
        {selectedTarget && <p className="landing-selected">{selectedTarget.label}</p>}
        {searchError && <p className="landing-search-error">{searchError}</p>}
        <button
          type="button"
          className="landing-skip"
          onClick={() => onContinue(locationInput.trim())}
        >
          Open Map Without Globe
        </button>
      </aside>
    </section>
  );
}
