import { useEffect, useMemo, useState } from 'react';
import type { MasterCouncil, MasterData, MasterRoute } from './types';

const STORAGE_KEY = 'whenskerbside:selected-council';

function pathFor(path: string) {
  return path;
}

function councilPath(id: string) {
  return `/councils/${id}/`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane',
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Australia/Brisbane',
  }).format(new Date(value));
}

function distanceKm(origin: [number, number], destination: [number, number]) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = radians(origin[0]);
  const lat2 = radians(destination[0]);
  const deltaLat = radians(destination[0] - origin[0]);
  const deltaLon = radians(destination[1] - origin[1]);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function rememberCouncil(council: MasterCouncil) {
  try {
    localStorage.setItem(STORAGE_KEY, council.id);
  } catch {
    // A private browser may block storage; navigation still works normally.
  }
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href={pathFor('/')} aria-label="When's Kerbside home">
        <span aria-hidden="true">WK?</span>
        <strong>When's Kerbside?</strong>
      </a>
      <nav aria-label="Main navigation">
        <a href={pathFor('/councils/')}>Councils</a>
        <a href={pathFor('/about/')}>About</a>
        <a className="support-link" href="https://github.com/sponsors/Whats-A-MattR">Donate</a>
      </nav>
    </header>
  );
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <footer className="site-footer">
      <div>
        <strong>When's Kerbside?</strong>
        <p>Independent, open-source council collection finders.</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href={pathFor('/councils/')}>All councils</a>
        <a href={pathFor('/about/')}>About & methodology</a>
        <a href={pathFor('/privacy/')}>Privacy</a>
        <a href="https://github.com/Whats-A-MattR/brisbane-kerbside">Source code ↗</a>
      </nav>
      <p className="freshness">Directory data refreshed {formatGeneratedAt(generatedAt)}</p>
    </footer>
  );
}

function CouncilCard({ council, onChoose }: { council: MasterCouncil; onChoose?: () => void }) {
  const next = council.nextCollection;
  return (
    <article className="council-card">
      <div className="council-card-topline">
        <span>{council.placeName}</span>
        <span>{council.areas.length} {council.areaLabel}</span>
      </div>
      <h3><a href={councilPath(council.id)}>{council.councilName}</a></h3>
      <p>{council.collectionCount} upcoming {council.scheduleLabel} currently published.</p>
      {next && (
        <div className="next-date">
          <span>Next published date</span>
          <strong>{formatDate(next.startsOn)}{next.endsOn ? ` – ${formatDate(next.endsOn)}` : ''}</strong>
        </div>
      )}
      <div className="card-actions">
        <a
          className="primary-action"
          href={council.siteUrl}
          onClick={() => {
            rememberCouncil(council);
            onChoose?.();
          }}
        >Open {council.placeName} dates <span aria-hidden="true">↗</span></a>
        <a href={councilPath(council.id)} onClick={() => rememberCouncil(council)}>Council overview</a>
      </div>
    </article>
  );
}

function CouncilFinder({ councils }: { councils: MasterCouncil[] }) {
  const [query, setQuery] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'denied' | 'unavailable'>('idle');
  const [suggestedId, setSuggestedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value && councils.some((council) => council.id === value)) setSavedId(value);
    } catch {
      // Storage is optional.
    }
  }, [councils]);

  useEffect(() => {
    const urlQuery = new URLSearchParams(window.location.search).get('q');
    if (urlQuery) setQuery(urlQuery);
  }, []);

  const normalized = query.trim().toLocaleLowerCase('en-AU');
  const results = useMemo(() => {
    if (!normalized) return councils;
    return councils.filter((council) => [
      council.placeName,
      council.councilName,
      ...council.areas,
    ].some((value) => value.toLocaleLowerCase('en-AU').includes(normalized)));
  }, [councils, normalized]);
  const saved = councils.find((council) => council.id === savedId);
  const suggested = councils.find((council) => council.id === suggestedId);

  function useLocation() {
    if (!navigator.geolocation) {
      setLocationState('unavailable');
      return;
    }
    setLocationState('locating');
    setSuggestedId(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const origin: [number, number] = [coords.latitude, coords.longitude];
        const ranked = councils
          .map((council) => ({ council, distance: distanceKm(origin, council.center) }))
          .sort((a, b) => a.distance - b.distance);
        if (!ranked[0] || ranked[0].distance > 100) {
          setLocationState('unavailable');
          return;
        }
        setSuggestedId(ranked[0].council.id);
        setLocationState('idle');
      },
      (error) => setLocationState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <section className="finder" aria-labelledby="finder-title">
      <div className="finder-heading">
        <div>
          <p className="eyebrow">Find your collection</p>
          <h2 id="finder-title">Start with your suburb or council.</h2>
        </div>
        <button className="location-button" type="button" onClick={useLocation} disabled={locationState === 'locating'}>
          <span aria-hidden="true">◎</span> {locationState === 'locating' ? 'Finding nearby council…' : 'Use my location'}
        </button>
      </div>

      <label className="search-field">
        <span>Search supported suburbs and councils</span>
        <span className="search-input">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try New Farm, Logan or Rochedale South"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
        </span>
      </label>

      {saved && !query && !suggested && (
        <aside className="recall-card">
          <div>
            <span>Welcome back</span>
            <strong>{saved.placeName} is your saved council area.</strong>
          </div>
          <a href={saved.siteUrl}>Open dates ↗</a>
        </aside>
      )}

      {suggested && (
        <aside className="suggestion-card" role="status">
          <div>
            <span>Nearest supported council</span>
            <strong>{suggested.councilName}</strong>
            <small>This is a rough location-based suggestion. Confirm the council before relying on its dates.</small>
          </div>
          <a href={suggested.siteUrl} onClick={() => rememberCouncil(suggested)}>Yes, show {suggested.placeName} dates ↗</a>
        </aside>
      )}

      {locationState === 'denied' && <p className="finder-message" role="status">Location access was not granted. No worries—search by suburb instead.</p>}
      {locationState === 'unavailable' && <p className="finder-message" role="status">We could not confidently match your location to a supported council. Search by suburb instead.</p>}

      <div className="result-heading">
        <h3>{normalized ? `${results.length} matching ${results.length === 1 ? 'council' : 'councils'}` : 'Supported councils'}</h3>
        <span>{councils.length} live</span>
      </div>
      {results.length ? (
        <div className="council-grid">
          {results.map((council) => <CouncilCard key={council.id} council={council} />)}
        </div>
      ) : (
        <div className="empty-state">
          <strong>That place is not in our directory yet.</strong>
          <p>Check the spelling, try the council name, or browse the supported councils below.</p>
          <button type="button" onClick={() => setQuery('')}>Show all councils</button>
        </div>
      )}
    </section>
  );
}

function Home({ data }: { data: MasterData }) {
  return (
    <>
      <main>
        <section className="hero">
          <p className="eyebrow">Kerbside collection, council by council</p>
          <h1>When's kerbside?</h1>
          <p className="hero-copy">One useful place to find your local collection site, upcoming dates and the official council rules behind them.</p>
          <div className="hero-facts">
            <span><strong>{data.councils.length}</strong> supported councils</span>
            <span><strong>{data.councils.reduce((total, council) => total + council.areas.length, 0)}</strong> searchable areas</span>
            <span><strong>Weekly</strong> data refreshes</span>
          </div>
        </section>
        <CouncilFinder councils={data.councils} />
        <section className="explanation" aria-labelledby="how-title">
          <p className="eyebrow">A growing public directory</p>
          <h2 id="how-title">Local sites, shared standards.</h2>
          <div className="explanation-grid">
            <article><span>01</span><h3>Find the right council</h3><p>Search by suburb, choose manually, or ask your browser to suggest the nearest supported council. Location is never requested on page load.</p></article>
            <article><span>02</span><h3>See the local schedule</h3><p>Each council gets a dedicated static site built around its own terminology, dates, areas and collection rules—not a generic scraped result.</p></article>
            <article><span>03</span><h3>Confirm with the source</h3><p>Every site links back to the official council calendar and accepted-item guidance. Council information remains the source of truth.</p></article>
          </div>
        </section>
        <section className="content-band">
          <div>
            <p className="eyebrow">Why this exists</p>
            <h2>Council data is public. Finding your date should be simple.</h2>
          </div>
          <div>
            <p>Kerbside programs differ across Australia. Some councils publish a suburb calendar, some provide an address lookup, and others do not run a scheduled service at all. When's Kerbside only lists council areas where we can maintain a clear public data path.</p>
            <p>The directory and every council site are statically generated, open source and designed to remain fast on a phone. New councils can be added through a shared data contract without merging their schedules or local guidance into one vague national answer.</p>
          </div>
        </section>
      </main>
    </>
  );
}

function CouncilsPage({ data }: { data: MasterData }) {
  return (
    <main className="inner-page">
      <p className="eyebrow">Council directory</p>
      <h1>Supported kerbside collection areas</h1>
      <p className="lead">These are the council-specific collection sites currently generated from this open-source project. Each one has its own schedule, local guidance and links to official council information.</p>
      <div className="council-grid directory-grid">
        {data.councils.map((council) => <CouncilCard key={council.id} council={council} />)}
      </div>
    </main>
  );
}

function CouncilPage({ council }: { council: MasterCouncil }) {
  return (
    <main className="inner-page council-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/councils/">Councils</a><span>›</span><span>{council.placeName}</span></nav>
      <p className="eyebrow">{council.councilName}</p>
      <h1>{council.placeName} kerbside collection dates</h1>
      <p className="lead">Find upcoming {council.serviceName} dates for {council.areas.length} published {council.areaLabel} in the {council.councilName} area.</p>
      <div className="council-hero-actions">
        <a className="primary-action large" href={council.siteUrl} onClick={() => rememberCouncil(council)}>Open the {council.placeName} date finder ↗</a>
        <a href={council.links.officialCalendar}>Official Council calendar ↗</a>
      </div>
      {council.nextCollection && (
        <section className="date-feature">
          <p className="eyebrow">Next published collection</p>
          <h2>{formatDate(council.nextCollection.startsOn)}{council.nextCollection.endsOn ? ` – ${formatDate(council.nextCollection.endsOn)}` : ''}</h2>
          <p>{council.nextCollection.areas.join(' · ')}</p>
        </section>
      )}
      <section className="prose-grid">
        <article>
          <h2>What the local site covers</h2>
          <p>The dedicated {council.placeName} site turns the published collection schedule into searchable, pre-rendered pages. You can select an upcoming date, see the relevant areas highlighted, or go directly to an individual area page.</p>
          <p>It currently includes {council.collectionCount} upcoming {council.scheduleLabel}. Data was last refreshed on {formatGeneratedAt(council.generatedAt)}.</p>
        </article>
        <article>
          <h2>Confirm before putting items out</h2>
          <p>When's Kerbside is independent and is not operated by {council.councilName}. Weather, access and operational changes can affect published dates. Always confirm the date, eligibility and item limits with Council.</p>
          <ul>
            <li><a href={council.links.officialCalendar}>Official collection calendar ↗</a></li>
            <li><a href={council.links.acceptedItems}>Accepted and excluded items ↗</a></li>
            <li><a href={council.source.url}>Published data source ↗</a></li>
          </ul>
        </article>
      </section>
    </main>
  );
}

function AboutPage() {
  return (
    <main className="inner-page prose-page">
      <p className="eyebrow">About the project</p>
      <h1>A useful layer over public council information.</h1>
      <p className="lead">When's Kerbside is an independent, open-source directory of local kerbside collection finders.</p>
      <h2>One data contract, genuinely local sites</h2>
      <p>Councils publish collection information in different formats and use different terms for similar services. The project converts each supported source into a shared schedule and map schema, then combines that data with council-specific content, assets and guidance. The result is a separate static site for each council rather than one interface pretending every program works the same way.</p>
      <h2>How a council becomes supported</h2>
      <p>A council must run a kerbside collection service and expose a maintainable public way to access its dates or areas. We document the publisher, source and licence where available. Automated jobs refresh council data each week, validate it, rebuild every static page and publish the outputs. If the public source changes shape, the build should fail instead of quietly publishing malformed dates.</p>
      <h2>What this directory stores</h2>
      <p>You can save a council choice in your own browser so the directory can recall it later. If you press “Use my location”, the browser supplies a temporary position so the page can suggest the nearest supported council. The coordinates are not saved by this site. The suggestion is approximate and never replaces confirming your actual council area.</p>
      <h2>Independent and open source</h2>
      <p>This project is not affiliated with any council. Official council pages remain the source of truth. The code and data adapters are public so errors can be reported, sources can be audited, and new council implementations can reuse the same tested structure.</p>
      <p><a className="text-link" href="https://github.com/Whats-A-MattR/brisbane-kerbside">View the project on GitHub ↗</a></p>
    </main>
  );
}

function PrivacyPage() {
  return (
    <main className="inner-page prose-page">
      <p className="eyebrow">Privacy</p>
      <h1>Your location stays a moment, not a profile.</h1>
      <p className="lead">The directory works without an account and does not request location unless you press the location button.</p>
      <h2>Saved council</h2>
      <p>When you choose a council, the site may store that council's short identifier in local storage on your device. This lets us show a useful “welcome back” shortcut. It does not contain your address or coordinates, and you can remove it by clearing site data in your browser.</p>
      <h2>Location suggestion</h2>
      <p>If you choose to use browser location, your browser asks for permission. The page compares the temporary coordinates with the centres of supported council areas and displays a rough suggestion. This directory does not write those coordinates to local storage. You can decline permission and search manually with no loss of core functionality.</p>
      <h2>External sites</h2>
      <p>Council finders, official council resources, GitHub and future service providers have their own privacy practices. Following those links leaves this domain. Any future analytics or advertising added to the master site will be disclosed here and will be configured independently from individual council sites.</p>
    </main>
  );
}

export function App({ data, route }: { data: MasterData; route: MasterRoute }) {
  const council = route.type === 'council' ? data.councils.find((item) => item.id === route.id) : undefined;
  return (
    <div className="site-shell">
      <Header />
      {route.type === 'home' && <Home data={data} />}
      {route.type === 'councils' && <CouncilsPage data={data} />}
      {route.type === 'council' && council && <CouncilPage council={council} />}
      {route.type === 'council' && !council && <CouncilsPage data={data} />}
      {route.type === 'about' && <AboutPage />}
      {route.type === 'privacy' && <PrivacyPage />}
      <Footer generatedAt={data.generatedAt} />
    </div>
  );
}
