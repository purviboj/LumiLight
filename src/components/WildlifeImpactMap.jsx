import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, Circle, Marker, Popup } from 'react-leaflet';

const DEFAULT_CENTER = [39.5, -98.35];
const DEFAULT_ZOOM = 4;

const birdMigrationPaths = [
  {
    id: 'atlantic-flyway',
    name: 'Atlantic Flyway',
    coords: [
      [44.7, -67.0],
      [40.7, -74.0],
      [34.0, -79.0],
      [28.2, -80.6],
      [25.8, -80.2]
    ]
  },
  {
    id: 'mississippi-flyway',
    name: 'Mississippi Flyway',
    coords: [
      [46.8, -92.1],
      [41.9, -90.6],
      [37.2, -90.4],
      [32.8, -90.2],
      [29.2, -89.2]
    ]
  }
];

const insectZones = [
  {
    id: 'appalachia-zone',
    name: 'Appalachian Biodiversity Corridor',
    center: [37.5, -81.0],
    radius: 240000
  },
  {
    id: 'prairie-zone',
    name: 'Great Plains Insect Habitat',
    center: [40.3, -100.2],
    radius: 260000
  }
];

const protectedEcosystems = [
  {
    id: 'everglades',
    name: 'Everglades Preserve',
    coords: [
      [26.8, -81.5],
      [26.1, -80.8],
      [25.3, -81.2],
      [25.1, -81.7],
      [25.7, -81.9]
    ]
  },
  {
    id: 'yellowstone',
    name: 'Greater Yellowstone',
    coords: [
      [44.9, -111.3],
      [44.1, -110.0],
      [43.7, -110.6],
      [44.3, -111.8]
    ]
  }
];

const benefitMarkers = [
  {
    id: 'barrier-islands',
    name: 'Barrier Islands',
    position: [32.1, -80.8],
    impact: 'Reduce coastal lighting to protect nesting birds.'
  },
  {
    id: 'ozark-dark',
    name: 'Ozark Dark Sky Corridor',
    position: [36.1, -93.6],
    impact: 'Shield rural lighting to preserve nocturnal insect habitat.'
  },
  {
    id: 'sonoran',
    name: 'Sonoran Desert Edge',
    position: [32.3, -111.0],
    impact: 'Lower billboard brightness to protect desert wildlife.'
  }
];

const animalCards = [
  {
    id: 'sea-turtles',
    title: 'Sea Turtles',
    tag: 'Severely Affected',
    description: 'Hatchlings disoriented by coastal lighting near nesting beaches',
    tone: 'severe',
    image:
      'https://images.unsplash.com/photo-1733976864027-770bcfdf53ce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZWElMjB0dXJ0bGUlMjBvY2VhbiUyMG5pZ2h0fGVufDF8fHx8MTc3MzcxMzQ4OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'owls',
    title: 'Owls',
    tag: 'Moderately Affected',
    description: 'Night hunting patterns disrupted by artificial light',
    tone: 'moderate',
    image:
      'https://images.unsplash.com/photo-1544648720-132573cb590d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvd2wlMjBiaXJkJTIwd2lsZGxpZmV8ZW58MXx8fHwxNzczNzEzNDg5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'fireflies',
    title: 'Fireflies',
    tag: 'Severely Affected',
    description: 'Bioluminescent mating signals obscured by light pollution',
    tone: 'severe',
    image:
      'https://images.unsplash.com/photo-1763953239955-ff27e74e7e84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaXJlZmx5JTIwaW5zZWN0JTIwZ2xvd3xlbnwxfHx8fDE3NzM3MTM0ODl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'bats',
    title: 'Bats',
    tag: 'Moderately Affected',
    description: 'Foraging behavior altered in bright corridors',
    tone: 'moderate',
    image:
      'https://images.unsplash.com/photo-1770982399525-d67dad6ce353?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXQlMjBmbHlpbmclMjBuaWdodHxlbnwxfHx8fDE3NzM3MTM0OTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'moths',
    title: 'Moths',
    tag: 'Severely Affected',
    description: 'Navigation disrupted, impacting pollination cycles',
    tone: 'severe',
    image:
      'https://images.unsplash.com/photo-1754155371410-9142413239eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RoJTIwaW5zZWN0JTIwbmF0dXJlfGVufDF8fHx8MTc3MzcxMzQ5MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'frogs',
    title: 'Frogs',
    tag: 'At Risk',
    description: 'Breeding calls masked by urban glow',
    tone: 'risk',
    image:
      'https://images.unsplash.com/photo-1683482170250-bdeb2844a2b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcm9nJTIwYW1waGliaWFuJTIwd2lsZGxpZmV8ZW58MXx8fHwxNzczNzEzNDkwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  },
  {
    id: 'snow-leopards',
    title: 'Snow Leopards',
    tag: 'Moderately Affected',
    description: 'High-altitude habitats are impacted by expanding night glow',
    tone: 'moderate',
    image:
      'https://images.unsplash.com/photo-1640783674357-db45d56e4d72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbm93JTIwbGVvcGFyZCUyMG1vdW50YWlufGVufDF8fHx8MTc3MzcxMjk2M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
  }
];

export default function WildlifeImpactMap() {
  const [showBirds, setShowBirds] = useState(true);
  const [showInsects, setShowInsects] = useState(true);
  const [showProtected, setShowProtected] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  const mapLayers = useMemo(
    () => [
      { key: 'birds', label: 'Bird migration paths', enabled: showBirds, toggle: setShowBirds },
      { key: 'insects', label: 'Insect biodiversity zones', enabled: showInsects, toggle: setShowInsects },
      { key: 'protected', label: 'Protected ecosystems', enabled: showProtected, toggle: setShowProtected },
      { key: 'markers', label: 'High-impact reduction sites', enabled: showMarkers, toggle: setShowMarkers }
    ],
    [showBirds, showInsects, showProtected, showMarkers]
  );

  return (
    <section className="wildlife-shell">
      <header
        className="wildlife-hero wildlife-hero-alt"
        style={{
          '--wildlife-hero':
            "url('https://images.unsplash.com/photo-1640783674357-db45d56e4d72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbm93JTIwbGVvcGFyZCUyMG1vdW50YWlufGVufDF8fHx8MTc3MzcxMjk2M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')"
        }}
      >
        <div className="wildlife-topbar">
          <button type="button" className="wildlife-icon-button" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <nav className="wildlife-topnav">
            <span>home</span>
            <span>explore</span>
            <span>species</span>
            <span>about</span>
            <span>blog</span>
            <span>contact</span>
          </nav>
          <div className="wildlife-top-actions">
            <button type="button" className="wildlife-icon-circle" aria-label="Search">
              🔍
            </button>
            <button type="button" className="wildlife-icon-circle" aria-label="Profile">
              👤
            </button>
          </div>
        </div>

        <div className="wildlife-hero-overlay">
          <div className="wildlife-hero-tag">
            <span className="wildlife-heart">♥</span>
            <span>AFRICAN WILDLIFE</span>
          </div>
          <h1>WILDLIFE</h1>
          <p>Discover the world’s most magnificent creatures and their natural habitats.</p>
          <button type="button" className="wildlife-cta">Explore Now</button>
        </div>

        <div className="wildlife-hero-stats">
          <div>
            <strong>Genus</strong>
            <span>Panthera</span>
          </div>
          <div>
            <strong>25 kg</strong>
            <span>Weight</span>
          </div>
          <div>
            <strong>6000</strong>
            <span>Population</span>
          </div>
        </div>
      </header>

      <section className="wildlife-carousel">
        <div className="wildlife-carousel-header">
          <div>
            <h2>Animals Affected by Light Pollution</h2>
            <p>Discover how artificial light impacts nocturnal wildlife worldwide.</p>
          </div>
          <div className="wildlife-carousel-dots">
            <span className="dot" />
            <span className="dot" />
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
        <div className="wildlife-card-row">
          {animalCards.map((card) => (
            <article
              key={card.id}
              className={`wildlife-card wildlife-card-${card.tone}`}
              style={{ backgroundImage: `url(${card.image})` }}
            >
              <div className="wildlife-card-tag">{card.tag}</div>
              <div className="wildlife-card-content">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="wildlife-layout">
        <section className="wildlife-panel wildlife-map">
          <div className="wildlife-panel-header">
            <h3>Impact Layers</h3>
            <div className="wildlife-legend">
              <span className="legend-dot legend-dot-birds" /> Birds
              <span className="legend-dot legend-dot-insects" /> Insects
              <span className="legend-dot legend-dot-protected" /> Protected
            </div>
          </div>
          <div className="wildlife-map-frame">
            <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {showBirds &&
                birdMigrationPaths.map((path) => (
                  <Polyline key={path.id} positions={path.coords} pathOptions={{ color: '#38bdf8', weight: 4 }}>
                    <Popup>{path.name}</Popup>
                  </Polyline>
                ))}
              {showInsects &&
                insectZones.map((zone) => (
                  <Circle
                    key={zone.id}
                    center={zone.center}
                    radius={zone.radius}
                    pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.2 }}
                  >
                    <Popup>{zone.name}</Popup>
                  </Circle>
                ))}
              {showProtected &&
                protectedEcosystems.map((eco) => (
                  <Polygon
                    key={eco.id}
                    positions={eco.coords}
                    pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }}
                  >
                    <Popup>{eco.name}</Popup>
                  </Polygon>
                ))}
              {showMarkers &&
                benefitMarkers.map((marker) => (
                  <Marker key={marker.id} position={marker.position}>
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <div className="font-semibold">{marker.name}</div>
                        <div>{marker.impact}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </section>

        <aside className="wildlife-sidebar">
          <div className="wildlife-panel">
            <div className="wildlife-panel-header">
              <h3>Layer Controls</h3>
            </div>
            <div className="wildlife-toggle-list">
              {mapLayers.map((layer) => (
                <label key={layer.key} className="wildlife-toggle">
                  <input
                    type="checkbox"
                    checked={layer.enabled}
                    onChange={(event) => layer.toggle(event.target.checked)}
                  />
                  <span>{layer.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="wildlife-panel">
            <div className="wildlife-panel-header">
              <h3>Why It Matters</h3>
            </div>
            <div className="wildlife-info-cards">
              <div className="wildlife-info-card">
                <h4>Bird Navigation</h4>
                <p>Bright urban corridors pull migrating birds off-course, increasing collision risk.</p>
              </div>
              <div className="wildlife-info-card">
                <h4>Pollinator Decline</h4>
                <p>Artificial light interrupts nocturnal insect behavior, reducing pollination success.</p>
              </div>
              <div className="wildlife-info-card">
                <h4>Protected Ecosystems</h4>
                <p>Light trespass alters predator-prey dynamics and threatens sensitive habitats.</p>
              </div>
            </div>
          </div>

          <div className="wildlife-panel wildlife-panel-highlight">
            <h3>Top Reduction Targets</h3>
            <ul>
              <li>Coastal migration corridors during spring/fall</li>
              <li>Rural insect habitats with limited shielding</li>
              <li>Protected wetlands near urban glow</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
