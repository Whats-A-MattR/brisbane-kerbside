import { useEffect, useId, useMemo, useState } from 'react';
import { MdArrowUpward, MdClose, MdMenu, MdSearch } from 'react-icons/md';
import { AdStrip } from './AdStrip';
import { trackEvent } from './analytics';
import { formatCollectionDate, formatGeneratedAt } from './date';
import { CollectionMap } from './Map';
import type { Collection, Route, Schedule, Suburb } from './types';

const REPOSITORY_URL = 'https://github.com/Whats-A-MattR/brisbane-kerbside';
const SPONSOR_URL = 'https://github.com/sponsors/Whats-A-MattR';
const COUNCIL_CALENDAR_URL = 'https://www.brisbane.qld.gov.au/bins-waste-and-recycling/kerbside-collection/kerbside-collection-calendar';
const ACCEPTED_ITEMS_URL = 'https://www.brisbane.qld.gov.au/bins-waste-and-recycling/kerbside-collection/acceptable-kerbside-collection-items';

type AppProps = {
  schedule: Schedule;
  route: Route;
};

type SuburbOption = Suburb & {
  collection: Collection;
};

function sitePath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

function collectionsForRoute(schedule: Schedule, route: Route) {
  if (route.type === 'collection') {
    return schedule.collections.filter((item) => item.id === route.id);
  }
  if (route.type === 'suburb') {
    return schedule.collections.filter((item) => item.suburbs.some((suburb) => suburb.id === route.id));
  }
  return schedule.collections;
}

type BackToTopProps = {
  disabled?: boolean;
  target?: 'page' | 'mobile-sheet';
};

function BackToTop({ disabled = false, target = 'page' }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (disabled) {
      setVisible(false);
      return undefined;
    }

    if (target === 'mobile-sheet') {
      const dateList = document.querySelector<HTMLElement>('.date-sheet-list');
      if (!dateList) return undefined;

      const updateVisibility = () => setVisible(dateList.scrollTop > 280);
      dateList.addEventListener('scroll', updateVisibility, { passive: true });
      updateVisibility();

      return () => dateList.removeEventListener('scroll', updateVisibility);
    }

    const mobileLayout = window.matchMedia('(max-width: 900px)');
    const schedulePanel = document.querySelector<HTMLElement>('.schedule-panel');
    let scrollTarget: EventTarget = window;

    const updateVisibility = () => {
      const scrollTop = mobileLayout.matches || !schedulePanel ? window.scrollY : schedulePanel.scrollTop;
      setVisible(scrollTop > (mobileLayout.matches ? 320 : 520));
    };

    const bindScrollTarget = () => {
      scrollTarget.removeEventListener('scroll', updateVisibility);
      scrollTarget = mobileLayout.matches || !schedulePanel ? window : schedulePanel;
      scrollTarget.addEventListener('scroll', updateVisibility, { passive: true });
      updateVisibility();
    };

    bindScrollTarget();
    mobileLayout.addEventListener('change', bindScrollTarget);

    return () => {
      scrollTarget.removeEventListener('scroll', updateVisibility);
      mobileLayout.removeEventListener('change', bindScrollTarget);
    };
  }, [disabled, target]);

  const returnToTop = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    if (target === 'mobile-sheet') {
      document.querySelector<HTMLElement>('.date-sheet-list')?.scrollTo({ top: 0, behavior });
      trackEvent('back_to_top', { layout: 'mobile_sheet' });
      return;
    }

    const mobileLayout = window.matchMedia('(max-width: 900px)').matches;
    const schedulePanel = document.querySelector<HTMLElement>('.schedule-panel');

    if (mobileLayout || !schedulePanel) {
      window.scrollTo({ top: 0, behavior });
    } else {
      schedulePanel.scrollTo({ top: 0, behavior });
    }

    trackEvent('back_to_top', { layout: mobileLayout ? 'mobile' : 'desktop' });
  };

  return (
    <button
      className={`back-to-top${target === 'mobile-sheet' ? ' back-to-top--sheet' : ''}`}
      data-visible={visible}
      type="button"
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={returnToTop}
    >
      <MdArrowUpward aria-hidden="true" />
    </button>
  );
}

function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <a className="brand-mark" href={sitePath('/')} aria-label="Brisbane kerbside map home">BNE</a>
        <a href={sitePath('/')}>Back to the collection map</a>
      </header>
      <article>
        <p className="eyebrow">Project information</p>
        <h1>Privacy and advertising</h1>
        <p className="legal-updated">Last updated 4 August 2026</p>

        <h2>What this site collects</h2>
        <p>
          Brisbane Kerbside Collection Map does not require an account and does not collect names, addresses or contact details. The site may use Google Analytics 4 to understand aggregate page visits, suburb searches and collection-date selections. Analytics is not loaded when your browser sends a Do Not Track signal.
        </p>

        <h2>Advertising</h2>
        <p>
          This site may display one small advertisement supplied by Google AdSense. Google and its partners may use cookies or similar technologies to show, measure and personalise advertising based on your visits to this and other websites. You can manage personalised advertising in <a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">Google My Ad Center</a>.
        </p>

        <h2>Consent and third parties</h2>
        <p>
          Where required, a consent message is shown before Google uses cookies for analytics or advertising. Google processes information under its own <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>. Map tiles are supplied by OpenStreetMap and CARTO and may receive standard request information such as your IP address and browser details when the map loads.
        </p>

        <h2>Questions</h2>
        <p>
          This is an independent open-source project. Privacy questions and requests can be raised through the <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">project issue tracker</a>.
        </p>
      </article>
      <BackToTop />
    </main>
  );
}

function suburbOptions(schedule: Schedule) {
  const options = new Map<string, SuburbOption>();

  for (const collection of schedule.collections) {
    for (const suburb of collection.suburbs) {
      if (!options.has(suburb.id)) {
        options.set(suburb.id, { ...suburb, collection });
      }
    }
  }

  return [...options.values()].sort((a, b) => (
    a.collection.collectionDate.localeCompare(b.collection.collectionDate) || a.name.localeCompare(b.name)
  ));
}

type SuburbSearchProps = {
  className: string;
  options: SuburbOption[];
  query: string;
  onQueryChange: (query: string) => void;
  onResultSelect?: () => void;
};

function SuburbSearch({ className, options, query, onQueryChange, onResultSelect }: SuburbSearchProps) {
  const inputId = useId();
  const listId = `${inputId}-results`;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = normalizedQuery
    ? options.filter((option) => option.name.toLocaleLowerCase().includes(normalizedQuery)).slice(0, 8)
    : [];

  return (
    <div className={`suburb-search ${className}`}>
      <label htmlFor={inputId}>Search by suburb</label>
      <div className="suburb-search-input">
        <MdSearch aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          placeholder="Search by suburb"
          autoComplete="off"
          aria-controls={listId}
          aria-expanded={Boolean(normalizedQuery)}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      {normalizedQuery && (
        <div className="suburb-search-results" id={listId} role="listbox">
          <p>{matches.length ? `${matches.length} suburbs found` : 'No matching suburbs'}</p>
          {matches.map((option) => (
            <a
              key={option.id}
              href={sitePath(`/suburbs/${option.id}/`)}
              role="option"
              aria-selected="false"
              onClick={() => {
                trackEvent('suburb_search_select', {
                  suburb: option.name,
                  collection_date: option.collection.collectionDate,
                });
                onResultSelect?.();
              }}
            >
              <strong>{option.name}</strong>
              <span>Week starting {formatCollectionDate(option.collection.collectionDate).label}</span>
              <small>View</small>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function routeCopy(schedule: Schedule, route: Route, collections: Collection[]) {
  if (route.type === 'suburb') {
    const suburb = collections[0]?.suburbs.find((item) => item.id === route.id)?.name ?? route.id;
    return {
      eyebrow: 'Brisbane suburb schedule',
      title: `${suburb} kerbside collection date`,
      lede: collections[0]
        ? `The next published large-item kerbside collection for ${suburb} starts ${formatCollectionDate(collections[0].collectionDate).label}.`
        : `No upcoming large-item collection is currently published for ${suburb}.`,
      suburb,
    };
  }
  if (route.type === 'collection') {
    const date = collections[0] ? formatCollectionDate(collections[0].collectionDate).label : route.id;
    return {
      eyebrow: 'Collection week',
      title: `Brisbane kerbside collection — ${date}`,
      lede: collections[0]
        ? `${collections[0].suburbs.length} Brisbane suburbs are scheduled for large-item collection this week.`
        : 'This collection week is no longer in the published schedule.',
    };
  }
  return {
    eyebrow: 'Large-item collection',
    title: 'Know when the kerb clears.',
    lede: 'Choose an upcoming collection week or search for your suburb to see exactly which Brisbane suburbs are covered.',
  };
}

export function App({ schedule, route }: AppProps) {
  const routeCollections = collectionsForRoute(schedule, route);
  const [selectedId, setSelectedId] = useState(routeCollections[0]?.id ?? schedule.collections[0]?.id ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [suburbQuery, setSuburbQuery] = useState('');
  const suburbs = useMemo(() => suburbOptions(schedule), [schedule]);
  const selected = useMemo(
    () => routeCollections.find((item) => item.id === selectedId) ?? routeCollections[0] ?? schedule.collections[0],
    [routeCollections, schedule.collections, selectedId],
  );
  const copy = routeCopy(schedule, route, routeCollections);

  if (route.type === 'privacy') return <PrivacyPage />;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  if (!selected) {
    return (
      <main className="empty-state">
        <p className="eyebrow">Brisbane kerbside</p>
        <h1>No upcoming collections are published yet.</h1>
        <p>Check back after Brisbane City Council updates its schedule.</p>
      </main>
    );
  }

  const selectedDate = formatCollectionDate(selected.collectionDate);
  const selectedSuburb = route.type === 'suburb' ? route.id : undefined;
  const totalSuburbs = new Set(
    schedule.collections.flatMap((collection) => collection.suburbs.map((suburb) => suburb.id)),
  ).size;

  return (
    <main className="app-shell">
      <section className="schedule-panel" aria-labelledby="page-title">
        <header className="site-header">
          <a className="brand-mark" href={sitePath('/')} aria-label="Brisbane kerbside map home">BNE</a>
          <p>Kerbside collection map</p>
          <nav className="header-actions" aria-label="Project links">
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">Open source</a>
            <a
              className="sponsor-link"
              href={SPONSOR_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('donation_click', { placement: 'header' })}
            >Donate</a>
          </nav>
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close upcoming collection dates' : 'Open upcoming collection dates'}
            aria-controls="mobile-date-sheet"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MdMenu className="menu-icon menu-icon--open" aria-hidden="true" />
            <MdClose className="menu-icon menu-icon--close" aria-hidden="true" />
          </button>
        </header>

        <SuburbSearch
          className="suburb-search--desktop"
          options={suburbs}
          query={suburbQuery}
          onQueryChange={setSuburbQuery}
        />

        <div className="intro">
          {route.type !== 'home' && (
            <a className="filter-context" href={sitePath('/')}>
              <span className="filter-context-current">
                <small>Filtered schedule</small>
                <strong>
                  {route.type === 'suburb'
                    ? `You’re viewing ${copy.suburb} only`
                    : 'You’re viewing one collection week'}
                </strong>
              </span>
              <span className="filter-context-all">
                <strong>See all {schedule.collections.length} upcoming weeks</strong>
                <small>Covering {totalSuburbs} Brisbane suburbs</small>
              </span>
              <span className="filter-context-arrow" aria-hidden="true">→</span>
            </a>
          )}
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 id="page-title">{copy.title}</h1>
          <p className="lede">{copy.lede}</p>
        </div>

        <SuburbSearch
          className="suburb-search--mobile"
          options={suburbs}
          query={suburbQuery}
          onQueryChange={setSuburbQuery}
        />

        <div className="list-heading">
          <h2>{route.type === 'home' ? 'Upcoming dates' : 'Published schedule'}</h2>
          <span>{routeCollections.length} {routeCollections.length === 1 ? 'week' : 'weeks'}</span>
        </div>

        <ol className="collection-list">
          {routeCollections.map((collection) => {
            const date = formatCollectionDate(collection.collectionDate);
            const itemsOut = formatCollectionDate(collection.itemsOutDate);
            const active = collection.id === selected.id;

            return (
              <li key={collection.id}>
                <article className="collection-card" data-active={active}>
                  <button
                    className="collection-select"
                    type="button"
                    aria-label={`Show ${date.label} collection areas on the map`}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedId(collection.id);
                      trackEvent('collection_map_select', { collection_date: collection.collectionDate, placement: 'desktop_list' });
                    }}
                  />
                  <span className="date-block" aria-hidden="true">
                    <span>{date.weekday}</span>
                    <strong>{date.day}</strong>
                  </span>
                  <span className="collection-details">
                    {route.type === 'home' ? (
                      <strong className="collection-title">Week starting {date.label}</strong>
                    ) : (
                      <a href={sitePath(`/collections/${collection.id}/`)}>Week starting {date.label}</a>
                    )}
                    <span className="suburb-links">
                      {collection.suburbs.map((suburb, index) => (
                        <span key={suburb.id}>
                          {route.type === 'home' ? (
                            suburb.name
                          ) : (
                            <a href={sitePath(`/suburbs/${suburb.id}/`)}>{suburb.name}</a>
                          )}{index < collection.suburbs.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </span>
                    <small>Put items out from {itemsOut.label}; collection starts by 6am Monday</small>
                  </span>
                </article>
              </li>
            );
          })}
        </ol>

        <section className="trust-section" aria-labelledby="trust-title">
          <p className="eyebrow">Useful, current, independent</p>
          <h2 id="trust-title">Council data, made easier to use.</h2>
          <p>
            This independent open-source project refreshes directly from Brisbane City Council's public dataset. Dates can change because of weather or operational requirements, so check the official calendar before putting items out.
          </p>
          <div className="trust-links">
            <a href={COUNCIL_CALENDAR_URL}>Official Council calendar ↗</a>
            <a href={ACCEPTED_ITEMS_URL}>What Council accepts ↗</a>
            <a href={REPOSITORY_URL}>View the source code ↗</a>
          </div>
        </section>

        {route.type === 'home' && (
          <section className="faq" aria-labelledby="faq-title">
            <h2 id="faq-title">Brisbane kerbside collection basics</h2>
            <article>
              <h3>How often is kerbside collection?</h3>
              <p>Brisbane City Council schedules one large-item collection week per financial year for each Brisbane suburb.</p>
            </article>
            <article>
              <h3>When should items go on the footpath?</h3>
              <p>Items can go out on the weekend before the collection week and must be ready by 6am on the first day.</p>
            </article>
            <article>
              <h3>How much can I put out?</h3>
              <p>Council limits each pile to 2 cubic metres, roughly one small box-trailer load.</p>
            </article>
          </section>
        )}

        <footer>
          <p>Data refreshed {formatGeneratedAt(schedule.generatedAt)}</p>
          <a href={schedule.sourceUrl} target="_blank" rel="noreferrer">Brisbane City Council open data ↗</a>
          <a
            href={SPONSOR_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('donation_click', { placement: 'footer' })}
          >Support this project on GitHub ↗</a>
          <a href={sitePath('/privacy/')}>Privacy & advertising</a>
        </footer>
      </section>

      <section className="map-panel" aria-label="Collection area map">
        <CollectionMap selectedDate={selected.collectionDate} selectedLabel={selectedDate.label} selectedSuburb={selectedSuburb} />
        <AdStrip />
      </section>

      <button
        className="date-sheet-backdrop"
        data-open={menuOpen}
        type="button"
        aria-label="Close upcoming collection dates"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className="date-sheet"
        id="mobile-date-sheet"
        data-open={menuOpen}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <header>
          <p className="eyebrow">Schedule</p>
          <h2>All upcoming dates</h2>
          <span>{schedule.collections.length} weeks</span>
        </header>
        <SuburbSearch
          className="suburb-search--sheet"
          options={suburbs}
          query={suburbQuery}
          onQueryChange={setSuburbQuery}
          onResultSelect={() => setMenuOpen(false)}
        />
        <div className="date-sheet-heading">
          <h3>Upcoming dates</h3>
        </div>
        <ol className="date-sheet-list">
          {schedule.collections.map((collection) => {
            const date = formatCollectionDate(collection.collectionDate);
            const active = collection.id === selected.id;

            return (
              <li key={collection.id}>
                <a
                  href={sitePath(`/collections/${collection.id}/`)}
                  data-active={active}
                  onClick={(event) => {
                    if (route.type === 'home') {
                      event.preventDefault();
                      setSelectedId(collection.id);
                      trackEvent('collection_map_select', { collection_date: collection.collectionDate, placement: 'mobile_sheet' });
                    }
                    setMenuOpen(false);
                  }}
                >
                  <strong>Week starting {date.label}</strong>
                  <span>{collection.suburbs.map((suburb) => suburb.name).join(' · ')}</span>
                </a>
              </li>
            );
          })}
        </ol>
        <BackToTop disabled={!menuOpen} target="mobile-sheet" />
      </aside>
      <BackToTop disabled={menuOpen} />
    </main>
  );
}
