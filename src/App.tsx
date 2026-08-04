import { useEffect, useId, useMemo, useState } from 'react';
import { MdClose, MdMenu, MdSearch } from 'react-icons/md';
import { AdStrip } from './AdStrip';
import { trackEvent } from './analytics';
import { BackToTop } from './BackToTop';
import { formatCollectionDate, formatGeneratedAt } from './date';
import { AboutPage, GuidePage, PrivacyPage } from './EditorialPages';
import { CollectionMap } from './Map';
import {
  ACCEPTED_ITEMS_URL,
  COUNCIL_CALENDAR_URL,
  REPOSITORY_URL,
  SPONSOR_URL,
  sitePath,
} from './site';
import type { Collection, Route, Schedule, Suburb } from './types';

type AppProps = {
  schedule: Schedule;
  route: Route;
};

type SuburbOption = Suburb & {
  collection: Collection;
};

function collectionsForRoute(schedule: Schedule, route: Route) {
  if (route.type === 'collection') {
    return schedule.collections.filter((item) => item.id === route.id);
  }
  if (route.type === 'suburb') {
    return schedule.collections.filter((item) => item.suburbs.some((suburb) => suburb.id === route.id));
  }
  return schedule.collections;
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
        matches.length ? (
          <div className="suburb-search-results" id={listId} role="listbox">
            <p>{matches.length} suburbs found</p>
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
        ) : (
          <div className="suburb-search-results suburb-search-empty" id={listId} role="status">
            <strong>No upcoming date found</strong>
            <p>
              We couldn’t find “{query.trim()}” in the currently published Council schedule.
              Its next collection date may not be available yet.
            </p>
            <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">
              Check the official calendar <span aria-hidden="true">↗</span>
            </a>
          </div>
        )
      )}
    </div>
  );
}

function routeCopy(route: Route, collections: Collection[]) {
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

function RouteFacts({ route, collection }: { route: Route; collection: Collection }) {
  if (route.type !== 'suburb' && route.type !== 'collection') return null;

  const collectionDate = formatCollectionDate(collection.collectionDate);
  const itemsOutDate = formatCollectionDate(collection.itemsOutDate);

  if (route.type === 'suburb') {
    const suburb = collection.suburbs.find((item) => item.id === route.id);
    if (!suburb) return null;
    const sameWeek = collection.suburbs.filter((item) => item.id !== route.id);

    return (
      <section className="route-facts" aria-labelledby="route-facts-title">
        <p className="eyebrow">At a glance</p>
        <h2 id="route-facts-title">Next published collection for {suburb.name}</h2>
        <p>
          Brisbane City Council’s current open schedule places {suburb.name} in the week starting {collectionDate.label}.
          Put eligible large items out from {itemsOutDate.label}, ready for collection by 6am Monday.
        </p>
        <dl>
          <div><dt>Collection week</dt><dd>{collectionDate.label}</dd></div>
          <div><dt>Items out from</dt><dd>{itemsOutDate.label}</dd></div>
          <div><dt>Published with</dt><dd>{sameWeek.length} other {sameWeek.length === 1 ? 'suburb' : 'suburbs'}</dd></div>
          <div><dt>Household limit</dt><dd>Up to 2 cubic metres</dd></div>
        </dl>
        {sameWeek.length > 0 && (
          <p className="route-facts-related">
            The same collection week also covers {sameWeek.slice(0, 5).map((item) => item.name).join(', ')}{sameWeek.length > 5 ? ` and ${sameWeek.length - 5} more` : ''}.
          </p>
        )}
        <div className="route-facts-links">
          <a href={sitePath('/guide/')}>Read the preparation guide</a>
          <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Confirm with Council ↗</a>
        </div>
      </section>
    );
  }

  return (
    <section className="route-facts" aria-labelledby="route-facts-title">
      <p className="eyebrow">Week details</p>
      <h2 id="route-facts-title">{collection.suburbs.length} suburbs are on this published run</h2>
      <p>
        Eligible large household items can be placed out from {itemsOutDate.label}. Have the pile ready by 6am on {collectionDate.label}; collection may happen at any point during the scheduled week.
      </p>
      <dl>
        <div><dt>Week starts</dt><dd>{collectionDate.label}</dd></div>
        <div><dt>Items out from</dt><dd>{itemsOutDate.label}</dd></div>
        <div><dt>Suburbs listed</dt><dd>{collection.suburbs.length}</dd></div>
        <div><dt>Household limit</dt><dd>Up to 2 cubic metres</dd></div>
      </dl>
      <div className="route-facts-links">
        <a href={sitePath('/guide/')}>What can go out?</a>
        <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Confirm with Council ↗</a>
      </div>
    </section>
  );
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
  const copy = routeCopy(route, routeCollections);

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

  if (route.type === 'privacy') return <PrivacyPage />;
  if (route.type === 'about') return <AboutPage schedule={schedule} />;
  if (route.type === 'guide') return <GuidePage />;

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
            <a href={sitePath('/guide/')}>Guide</a>
            <a href={sitePath('/about/')}>About</a>
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

        <RouteFacts route={route} collection={selected} />

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
          <a href={sitePath('/guide/')}>Brisbane kerbside guide</a>
          <a href={sitePath('/about/')}>About & methodology</a>
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
        {route.type === 'home' && <AdStrip />}
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
        <nav className="date-sheet-nav" aria-label="Site navigation">
          <a href={sitePath('/guide/')}>Guide</a>
          <a href={sitePath('/about/')}>About</a>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">Open source</a>
          <a
            href={SPONSOR_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('donation_click', { placement: 'mobile_sheet' })}
          >Donate</a>
        </nav>
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
