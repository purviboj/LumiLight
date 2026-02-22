const DEFAULT_REFERENCES = [
  {
    label: 'Resolving Light Pollution: The Effects of Light Pollution on Astronomy',
    href: '#'
  }
];

export default function LightPollutionPage({ references = DEFAULT_REFERENCES }) {
  return (
    <article className="light-blog-page">
      <header className="light-blog-hero">
        <p className="light-blog-kicker">Light Pollution Research</p>
        <h1>Light Pollution</h1>
        <p>
          A practical overview of how artificial light at night affects astronomy, ecosystems, public health, and
          energy use, plus the most effective prevention strategies.
        </p>
      </header>

      <section className="light-blog-section" aria-labelledby="what-is-light-pollution">
        <h2 id="what-is-light-pollution">What Light Pollution Is</h2>
        <p>
          Light pollution is excessive, misdirected, or unnecessary outdoor lighting. It includes skyglow (brightening
          of the night sky), glare, light trespass, and clutter from too many competing light sources. In simple terms,
          we lose natural darkness when lighting is brighter, bluer, or pointed upward instead of where people actually
          need it.
        </p>
      </section>

      <section className="light-blog-section" aria-labelledby="downsides">
        <h2 id="downsides">Why It Matters: Major Downsides</h2>

        <h3>1. Impact on Astronomy</h3>
        <p>
          Astronomical observations depend on dark skies and high contrast. Skyglow washes out faint stars and deep-sky
          objects, reduces data quality, and limits what observatories and amateur astronomers can detect.
        </p>

        <h3>2. Ecological Disruption from ALAN</h3>
        <p>
          ALAN (Artificial Light At Night) can disrupt migration, feeding, reproduction, and predator-prey behavior in
          birds, insects, sea turtles, and other species. Even low levels of nighttime lighting can alter biological
          rhythms and habitat use.
        </p>

        <h3>3. Human Health Risks from Blue-Light Exposure</h3>
        <p>
          Bright, blue-rich light at night can interfere with circadian timing and melatonin production. This may
          contribute to sleep disruption and downstream health risks over time, especially with long-term exposure.
        </p>

        <h3>4. Energy Waste and Emissions</h3>
        <p>
          Poorly designed lighting sends energy into the sky or into areas that do not need illumination. That increases
          electricity use, operating costs, and associated emissions without improving safety outcomes.
        </p>
      </section>

      <section className="light-blog-section" aria-labelledby="prevention">
        <h2 id="prevention">How to Prevent It</h2>
        <ul>
          <li>
            <strong>Use smart adaptive lighting systems:</strong> Platforms like SG Street LS adjust brightness by time,
            traffic, and context, reducing unnecessary output.
          </li>
          <li>
            <strong>Install fully shielded, downward-facing fixtures:</strong> Direct light only where needed and reduce
            skyglow and glare.
          </li>
          <li>
            <strong>Choose warm LEDs (~2700K):</strong> Lower blue-light content is generally better for night
            environments.
          </li>
          <li>
            <strong>Add motion and occupancy sensors:</strong> Keep lighting dim or off until activity is detected.
          </li>
          <li>
            <strong>Integrate renewable energy and controls:</strong> Combine efficient luminaires with clean power and
            centralized monitoring for lower lifecycle impact.
          </li>
          <li>
            <strong>Use data-driven mapping:</strong> Track sky brightness and local lighting outcomes to target
            interventions where they matter most.
          </li>
        </ul>
      </section>

      <section className="light-blog-section" aria-labelledby="references">
        <h2 id="references">References</h2>
        <ul>
          {references.map((reference) => (
            <li key={`${reference.label}-${reference.href}`}>
              <a href={reference.href} target="_blank" rel="noreferrer">
                {reference.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
