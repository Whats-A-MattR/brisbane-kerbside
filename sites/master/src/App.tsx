import { useEffect, useMemo, useState } from 'react';
import masterSite from '../site.json';
import type { MasterCouncil, MasterData, MasterRoute } from './types';

const STORAGE_KEY = 'whenskerbside:selected-council';
const KO_FI_URL = masterSite.kofi;
const GITHUB_SPONSORS_URL = masterSite.sponsor;

function pathFor(path: string) {
  return path;
}

function councilPath(id: string) {
  return `/councils/${id}/`;
}

function areaPath(councilId: string, areaId: string) {
  return `/councils/${councilId}/suburbs/${areaId}/`;
}

function collectionPath(councilId: string, collectionId: string) {
  return `/councils/${councilId}/collections/${collectionId}/`;
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

function isScheduled(council: MasterCouncil) {
  return council.serviceModel === 'scheduled';
}

function primaryDestination(council: MasterCouncil) {
  return isScheduled(council) ? council.siteUrl : council.actionUrl;
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
        <a className="support-link" href={KO_FI_URL} target="_blank" rel="noreferrer">Donate</a>
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
        <a href={KO_FI_URL} target="_blank" rel="noreferrer">Ko-fi ↗</a>
        <a href={GITHUB_SPONSORS_URL} target="_blank" rel="noreferrer">GitHub Sponsors ↗</a>
      </nav>
      <p className="freshness">Directory data refreshed {formatGeneratedAt(generatedAt)}</p>
    </footer>
  );
}

function CouncilCard({
  council,
  onChoose,
  matchedAreas = [],
}: {
  council: MasterCouncil;
  onChoose?: () => void;
  matchedAreas?: MasterCouncil['areaDetails'];
}) {
  const next = council.nextCollection;
  const exactArea = matchedAreas.length === 1 ? matchedAreas[0] : undefined;
  const destination = exactArea ? areaPath(council.id, exactArea.id) : primaryDestination(council);
  return (
    <article className="council-card">
      <div className="council-card-topline">
        <span>{council.placeName}</span>
        <span>{council.areas.length} {council.areaLabel}</span>
      </div>
      <h3><a href={councilPath(council.id)}>{council.councilName}</a></h3>
      <p>{isScheduled(council)
        ? `${council.collectionCount} upcoming ${council.scheduleLabel} currently published.`
        : council.serviceDetails?.shortLabel}</p>
      {next && (
        <div className="next-date">
          <span>Next published date</span>
          <strong>{formatDate(next.startsOn)}{next.endsOn ? ` – ${formatDate(next.endsOn)}` : ''}</strong>
        </div>
      )}
      {matchedAreas.length > 0 && (
        <div className="matched-areas">
          <span>Matching {matchedAreas.length === 1 ? 'suburb' : 'suburbs'}</span>
          <div>
            {matchedAreas.map((area) => (
              <a key={area.id} href={areaPath(council.id, area.id)}>{area.name}</a>
            ))}
          </div>
        </div>
      )}
      <div className="card-actions">
        <a
          className="primary-action"
          href={destination}
          onClick={() => {
            rememberCouncil(council);
            onChoose?.();
          }}
        >{exactArea
          ? `Open ${exactArea.name} details`
          : isScheduled(council)
            ? `Open ${council.placeName} dates`
            : 'Book or check eligibility'} <span aria-hidden="true">↗</span></a>
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
  const matchingAreas = (council: MasterCouncil) => normalized
    ? council.areaDetails.filter((area) => area.name.toLocaleLowerCase('en-AU').includes(normalized)).slice(0, 8)
    : [];
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
          <a href={isScheduled(saved) ? saved.siteUrl : councilPath(saved.id)}>{isScheduled(saved) ? 'Open dates' : 'Open service guide'} ↗</a>
        </aside>
      )}

      {suggested && (
        <aside className="suggestion-card" role="status">
          <div>
            <span>Nearest supported council</span>
            <strong>{suggested.councilName}</strong>
            <small>This is a rough location-based suggestion. Confirm the council before relying on dates or booking eligibility.</small>
          </div>
          <a href={isScheduled(suggested) ? suggested.siteUrl : councilPath(suggested.id)} onClick={() => rememberCouncil(suggested)}>Yes, show {suggested.placeName} {isScheduled(suggested) ? 'dates' : 'service'} ↗</a>
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
          {results.map((council) => (
            <CouncilCard key={council.id} council={council} matchedAreas={matchingAreas(council)} />
          ))}
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
          <p className="hero-copy">One useful place to find scheduled dates or book an on-demand collection, with the official council rules behind every answer.</p>
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
            <article><span>02</span><h3>See dates or book</h3><p>Scheduled councils get local date finders. On-demand councils get suburb guides that explain the entitlement and take you to the official booking flow.</p></article>
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
            <p>The directory and every council site are statically generated, open source and designed to remain fast on a phone. New councils can be added through a shared data contract without pretending that scheduled, booked and hybrid programs all work the same way.</p>
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
      <p className="lead">Browse scheduled and on-demand kerbside services. Every council page uses local program details, searchable suburbs and direct links to official council information.</p>
      <div className="council-grid directory-grid">
        {data.councils.map((council) => <CouncilCard key={council.id} council={council} />)}
      </div>
    </main>
  );
}

function BookingQuestions({ council, areaName }: { council: MasterCouncil; areaName?: string }) {
  const details = council.serviceDetails;
  if (!details) return null;
  const place = areaName ?? council.placeName;
  return (
    <section className="answer-section" aria-labelledby="common-questions-title">
      <p className="eyebrow">Straight answers</p>
      <h2 id="common-questions-title">Common {place} kerbside questions</h2>
      <div className="answer-grid">
        <article>
          <h3>Does {place} have kerbside collection?</h3>
          <p>{areaName ? `Yes—${areaName} is listed within the ${council.councilName} area, where Council offers` : `Yes. ${council.councilName} offers`} {council.serviceName} to eligible properties. It is booked on demand, so there is no single public collection date for the whole suburb. Confirm your address before relying on the service.</p>
        </article>
        <article>
          <h3>How do I book a kerbside collection in {place}?</h3>
          <p>Use the official {council.councilName} booking or eligibility link on this page. Council's system confirms the property, remaining entitlement and available collection timing.</p>
        </article>
        <article>
          <h3>How often can I book?</h3>
          <p>{details.frequency}</p>
        </article>
        <article>
          <h3>How much can I put out?</h3>
          <p>{details.allowance}</p>
        </article>
        <article>
          <h3>When should I put items on the kerb?</h3>
          <p>{details.timing}</p>
        </article>
        <article>
          <h3>What items does Council accept?</h3>
          <p>{details.items}</p>
        </article>
      </div>
    </section>
  );
}

function BookingCouncilPage({ council }: { council: MasterCouncil }) {
  const details = council.serviceDetails;
  if (!details) return null;
  return (
    <main className="inner-page council-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/councils/">Councils</a><span>›</span><span>{council.placeName}</span></nav>
      <p className="eyebrow">{details.shortLabel} · {council.councilName}</p>
      <h1>{council.placeName} kerbside collection booking</h1>
      <p className="lead">{details.summary} Search {council.areas.length} council-area suburbs, understand the local allowance and continue to the official booking service.</p>
      <div className="council-hero-actions">
        <a className="primary-action large" href={council.actionUrl} onClick={() => rememberCouncil(council)}>Book or check your address ↗</a>
        <a href={council.links.officialCalendar}>Official Council service guide ↗</a>
      </div>
      <section className="date-feature service-feature">
        <p className="eyebrow">How this service works</p>
        <h2>Book when you need it.</h2>
        <p>{details.frequency} {details.allowance}</p>
        {details.notice && <p><strong>Current service note:</strong> {details.notice}</p>}
      </section>
      <section className="route-directory" aria-labelledby="suburb-directory-title">
        <p className="eyebrow">Council-area suburbs</p>
        <h2 id="suburb-directory-title">Browse {council.placeName} suburbs</h2>
        <p className="directory-note">A suburb listing shows council-area coverage, not automatic property eligibility. The official booking system makes the final address check.</p>
        <div className="link-grid">
          {council.areaDetails.map((area) => <a key={area.id} href={areaPath(council.id, area.id)}>{area.name}</a>)}
        </div>
      </section>
      <BookingQuestions council={council} />
      <section className="prose-grid">
        <article>
          <h2>Eligibility is address-specific</h2>
          <p>{details.eligibility}</p>
          <p>Do not place items out until Council or its contractor has confirmed the booking and presentation instructions.</p>
        </article>
        <article>
          <h2>Official sources</h2>
          <p>When's Kerbside is independent and is not operated by {council.councilName}. Council remains the source of truth for eligibility, entitlements, accepted items and changes to the service.</p>
          <ul>
            <li><a href={council.links.booking ?? council.links.officialCalendar}>Official booking or eligibility check ↗</a></li>
            <li><a href={council.links.acceptedItems}>Official accepted-item guidance ↗</a></li>
            <li><a href={council.links.areaSource}>Official suburb coverage source ↗</a></li>
          </ul>
        </article>
      </section>
    </main>
  );
}

function CouncilPage({ council }: { council: MasterCouncil }) {
  if (!isScheduled(council)) return <BookingCouncilPage council={council} />;
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
      <section className="route-directory" aria-labelledby="suburb-directory-title">
        <p className="eyebrow">Published areas</p>
        <h2 id="suburb-directory-title">Browse {council.placeName} {council.areaLabel}</h2>
        <div className="link-grid">
          {council.areaDetails.map((area) => <a key={area.id} href={areaPath(council.id, area.id)}>{area.name}</a>)}
        </div>
      </section>
      <section className="route-directory" aria-labelledby="collection-directory-title">
        <p className="eyebrow">Published schedule</p>
        <h2 id="collection-directory-title">Upcoming {council.scheduleLabel}</h2>
        <div className="link-grid link-grid--dates">
          {council.collections.map((collection) => (
            <a key={collection.id} href={collectionPath(council.id, collection.id)}>
              {formatDate(collection.startsOn)}{collection.endsOn ? ` – ${formatDate(collection.endsOn)}` : ''}
            </a>
          ))}
        </div>
      </section>
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

function AreaPage({ council, areaId }: { council: MasterCouncil; areaId: string }) {
  const area = council.areaDetails.find((item) => item.id === areaId);
  if (!area) return <CouncilPage council={council} />;
  if (!isScheduled(council)) {
    const details = council.serviceDetails;
    if (!details) return <CouncilPage council={council} />;
    return (
      <main className="inner-page council-page">
        <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/councils/">Councils</a><span>›</span><a href={councilPath(council.id)}>{council.placeName}</a><span>›</span><span>{area.name}</span></nav>
        <p className="eyebrow">{details.shortLabel} · {council.councilName}</p>
        <h1>{area.name} kerbside collection booking</h1>
        <p className="lead">{area.name} is within the {council.councilName} area. This is an on-demand service rather than a suburb-wide calendar, so use Council's official system to confirm the property and receive a date.</p>
        <div className="council-hero-actions">
          <a className="primary-action large" href={council.actionUrl} onClick={() => rememberCouncil(council)}>Book or check your {area.name} address ↗</a>
          <a href={council.links.officialCalendar}>Read the official service guide ↗</a>
        </div>
        <section className="date-feature service-feature">
          <p className="eyebrow">No fixed suburb date</p>
          <h2>Your booking creates the date.</h2>
          <p>{details.summary}</p>
          {details.notice && <p><strong>Current service note:</strong> {details.notice}</p>}
        </section>
        <BookingQuestions council={council} areaName={area.name} />
        <section className="prose-grid">
          <article><h2>Check this property first</h2><p>{details.eligibility}</p><p>A suburb can cross a boundary or contain properties with different waste arrangements. Treat this page as a route to the official address check, not proof that a particular property qualifies.</p></article>
          <article><h2>Plan around the confirmed booking</h2><p>{details.timing}</p><p><a href={council.links.acceptedItems}>Check accepted and excluded items with Council ↗</a></p></article>
        </section>
      </main>
    );
  }
  const collections = area.collectionIds
    .map((id) => council.collections.find((collection) => collection.id === id))
    .filter((collection): collection is MasterCouncil['collections'][number] => Boolean(collection));
  const next = collections[0];
  const localUrl = `${council.siteUrl}/${council.areaRouteSegment}/${area.id}/`;

  if (!next && area.lastCollection) {
    return (
      <main className="inner-page council-page">
        <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/councils/">Councils</a><span>›</span><a href={councilPath(council.id)}>{council.placeName}</a><span>›</span><span>{area.name}</span></nav>
        <p className="eyebrow">{council.councilName} {council.serviceName}</p>
        <h1>{area.name} kerbside collection date</h1>
        <p className="lead">{area.name} was last collected on {formatDate(area.lastCollection.startsOn)}. Council has not yet published its next date, so the suburb remains searchable while the schedule rolls forward.</p>
        <div className="council-hero-actions">
          <a className="primary-action large" href={localUrl} onClick={() => rememberCouncil(council)}>See the {area.name} status and map ↗</a>
          <a href={council.links.officialCalendar}>Check the official Council calendar ↗</a>
        </div>
        <section className="date-feature service-feature">
          <p className="eyebrow">Most recent published collection</p>
          <h2>{formatDate(area.lastCollection.startsOn)}</h2>
          <p>Items were placed out from {formatDate(area.lastCollection.putOutFrom)}. This collection has passed; do not put items out until a new date is published.</p>
        </section>
        <section className="prose-grid">
          <article><h2>Why the suburb is still listed</h2><p>Recently collected suburbs should not disappear from search. This page retains Council’s most recent record and will automatically show the next collection when it enters the published schedule.</p></article>
          <article><h2>Confirm before putting items out</h2><p>When's Kerbside is independent. Check the official calendar for schedule changes, eligibility and address-level confirmation.</p><p><a href={council.links.acceptedItems}>Accepted and excluded items ↗</a></p></article>
        </section>
      </main>
    );
  }

  return (
    <main className="inner-page council-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/councils/">Councils</a><span>›</span><a href={councilPath(council.id)}>{council.placeName}</a><span>›</span><span>{area.name}</span></nav>
      <p className="eyebrow">{council.councilName} {council.serviceName}</p>
      <h1>{area.name} kerbside collection dates</h1>
      <p className="lead">Find the published {council.serviceName} schedule for {area.name}, identify the relevant collection period and continue to the dedicated {council.placeName} map.</p>
      <div className="council-hero-actions">
        <a className="primary-action large" href={localUrl} onClick={() => rememberCouncil(council)}>Open the {area.name} map ↗</a>
        <a href={council.links.officialCalendar}>Confirm with {council.councilName} ↗</a>
      </div>
      {next && (
        <section className="date-feature">
          <p className="eyebrow">Next published collection</p>
          <h2>{formatDate(next.startsOn)}{next.endsOn ? ` – ${formatDate(next.endsOn)}` : ''}</h2>
          {next.putOutFrom && <p>Items may be placed out from {formatDate(next.putOutFrom)}. Confirm local timing and eligibility with Council before using this date.</p>}
        </section>
      )}
      <section className="route-directory" aria-labelledby="area-dates-title">
        <p className="eyebrow">Current schedule</p>
        <h2 id="area-dates-title">Published dates for {area.name}</h2>
        <div className="link-grid link-grid--dates">
          {collections.map((collection) => (
            <a key={collection.id} href={collectionPath(council.id, collection.id)}>
              {formatDate(collection.startsOn)}{collection.endsOn ? ` – ${formatDate(collection.endsOn)}` : ''}
            </a>
          ))}
        </div>
      </section>
      <section className="prose-grid">
        <article><h2>What this page means</h2><p>This directory page connects {area.name} with the current public schedule maintained for {council.councilName}. The dedicated council site contains the interactive map and more detailed local guidance.</p></article>
        <article><h2>Check the official rules</h2><p>When's Kerbside is independent. Collection dates, eligible properties, item limits and accepted materials can change, so confirm the details with Council before placing anything on the kerb.</p><p><a href={council.links.acceptedItems}>Accepted and excluded items ↗</a></p></article>
      </section>
    </main>
  );
}

function CollectionPage({ council, collectionId }: { council: MasterCouncil; collectionId: string }) {
  const collection = council.collections.find((item) => item.id === collectionId);
  if (!collection) return <CouncilPage council={council} />;
  const localUrl = `${council.siteUrl}/collections/${collection.id}/`;

  return (
    <main className="inner-page council-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/councils/">Councils</a><span>›</span><a href={councilPath(council.id)}>{council.placeName}</a><span>›</span><span>{formatDate(collection.startsOn)}</span></nav>
      <p className="eyebrow">{council.councilName} {council.serviceName}</p>
      <h1>{council.placeName} collection starting {formatDate(collection.startsOn)}</h1>
      <p className="lead">This published collection covers {collection.areas.length} {collection.areas.length === 1 ? 'area' : 'areas'} in the {council.councilName} schedule. Browse the included suburbs or open the dedicated map.</p>
      <div className="council-hero-actions">
        <a className="primary-action large" href={localUrl} onClick={() => rememberCouncil(council)}>Open this collection map ↗</a>
        <a href={council.links.officialCalendar}>Official Council calendar ↗</a>
      </div>
      <section className="date-feature">
        <p className="eyebrow">Published collection period</p>
        <h2>{formatDate(collection.startsOn)}{collection.endsOn ? ` – ${formatDate(collection.endsOn)}` : ''}</h2>
        {collection.putOutFrom && <p>Items may be placed out from {formatDate(collection.putOutFrom)}. Always confirm the current instructions with Council.</p>}
      </section>
      <section className="route-directory" aria-labelledby="collection-areas-title">
        <p className="eyebrow">Included areas</p>
        <h2 id="collection-areas-title">Suburbs in this collection</h2>
        <div className="link-grid">
          {collection.areas.map((area) => <a key={area.id} href={areaPath(council.id, area.id)}>{area.name}</a>)}
        </div>
      </section>
      <section className="prose-grid">
        <article><h2>Use the local map</h2><p>The dedicated {council.placeName} site highlights the published collection areas for this period. Use the links above to check an individual suburb, then confirm your property is eligible for the service.</p></article>
        <article><h2>Council remains the source of truth</h2><p>Weather, access and operational changes can affect a scheduled collection. When's Kerbside presents the published data but is not affiliated with {council.councilName}.</p><p><a href={council.links.acceptedItems}>Check accepted and excluded items ↗</a></p></article>
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
      <p>A council must run a kerbside collection service and expose a maintainable public way to access its dates, service areas or official booking flow. We document the publisher and source, and the licence where data is republished. Automated jobs refresh scheduled data each week, validate the directory, rebuild every static page and publish the outputs. If a public source changes shape, the build should fail instead of quietly publishing malformed dates.</p>
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
      <h2>Analytics and advertising</h2>
      <p>This site uses Google Analytics 4 to understand aggregate usage, with IP anonymisation enabled and analytics disabled when your browser sends a Do Not Track preference. It may also use Google AdSense to display advertising and measure ad performance. Google may use cookies or similar technologies subject to your consent choices and its own policies.</p>
      <h2>External sites</h2>
      <p>Analytics and advertising are configured independently from each council site. Council finders, official council resources and GitHub have their own privacy practices; following those links leaves this domain.</p>
    </main>
  );
}

export function App({ data, route }: { data: MasterData; route: MasterRoute }) {
  const councilId = route.type === 'council' ? route.id : route.type === 'area' || route.type === 'collection' ? route.councilId : undefined;
  const council = data.councils.find((item) => item.id === councilId);
  return (
    <div className="site-shell">
      <Header />
      {route.type === 'home' && <Home data={data} />}
      {route.type === 'councils' && <CouncilsPage data={data} />}
      {route.type === 'council' && council && <CouncilPage council={council} />}
      {route.type === 'council' && !council && <CouncilsPage data={data} />}
      {route.type === 'area' && council && <AreaPage council={council} areaId={route.id} />}
      {route.type === 'collection' && council && <CollectionPage council={council} collectionId={route.id} />}
      {(route.type === 'area' || route.type === 'collection') && !council && <CouncilsPage data={data} />}
      {route.type === 'about' && <AboutPage />}
      {route.type === 'privacy' && <PrivacyPage />}
      <Footer generatedAt={data.generatedAt} />
    </div>
  );
}
