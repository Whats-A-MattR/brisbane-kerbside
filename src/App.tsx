import { useEffect, useId, useMemo, useState } from 'react';
import { MdClose, MdMenu, MdSearch } from 'react-icons/md';
import { AdStrip } from './AdStrip';
import { trackEvent } from './analytics';
import { BackToTop } from './BackToTop';
import { formatCollectionDate, formatGeneratedAt } from './date';
import { AboutPage, GuidePage, PrivacyPage } from '@site/editorial-pages';
import { CollectionMap } from './Map';
import type { MapAreaSelection } from './Map';
import {
  ACCEPTED_ITEMS_URL,
  COUNCIL_CALENDAR_URL,
  DIRECTORY_URL,
  KO_FI_URL,
  REPOSITORY_URL,
  SPONSOR_URL,
  areaPath,
  siteConfig,
  sitePath,
} from './site';
import type { AreaDirectoryEntry, Collection, CollectionArea, Route, Schedule } from './types';

type AppProps = {
  schedule: Schedule;
  route: Route;
};

type SuburbOption = CollectionArea & {
  collection?: Collection;
  lastCollection?: AreaDirectoryEntry['lastCollection'];
};

function collectionRangeLabel(collection: Collection) {
  const start = formatCollectionDate(collection.startsOn).label;
  return collection.endsOn ? `${start} – ${formatCollectionDate(collection.endsOn).label}` : start;
}

function collectionsForRoute(schedule: Schedule, route: Route) {
  if (route.type === 'collection') {
    return schedule.collections.filter((item) => item.id === route.id);
  }
  if (route.type === 'area') {
    return schedule.collections.filter((item) => item.areas.some((suburb) => suburb.id === route.id));
  }
  return schedule.collections;
}

function suburbOptions(schedule: Schedule) {
  if (schedule.areaDirectory?.length) {
    return schedule.areaDirectory.map((area) => ({
      ...area,
      collection: area.nextCollectionId
        ? schedule.collections.find((collection) => collection.id === area.nextCollectionId)
        : undefined,
    })).sort((a, b) => (
      (a.collection?.startsOn ?? '9999').localeCompare(b.collection?.startsOn ?? '9999') || a.name.localeCompare(b.name)
    ));
  }
  const options = new Map<string, SuburbOption>();

  for (const collection of schedule.collections) {
    for (const suburb of collection.areas) {
      if (!options.has(suburb.id)) {
        options.set(suburb.id, { ...suburb, collection });
      }
    }
  }

  return [...options.values()].sort((a, b) => (
    (a.collection?.startsOn ?? '9999').localeCompare(b.collection?.startsOn ?? '9999') || a.name.localeCompare(b.name)
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
      <label htmlFor={inputId}>Search by {siteConfig.area.singular}</label>
      <div className="suburb-search-input">
        <MdSearch aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          placeholder={`Search by ${siteConfig.area.singular}`}
          autoComplete="off"
          aria-controls={listId}
          aria-expanded={Boolean(normalizedQuery)}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      {normalizedQuery && (
        matches.length ? (
          <div className="suburb-search-results" id={listId} role="listbox">
            <p>{matches.length} {matches.length === 1 ? siteConfig.area.singular : siteConfig.area.plural} found</p>
            {matches.map((option) => (
              <a
                key={option.id}
                href={areaPath(option.id)}
                role="option"
                aria-selected="false"
                onClick={() => {
                  trackEvent('suburb_search_select', {
                    suburb: option.name,
                    collection_date: option.collection?.startsOn ?? option.lastCollection?.startsOn ?? 'not_published',
                  });
                  onResultSelect?.();
                }}
              >
                <strong>{option.name}</strong>
                <span>{option.collection
                  ? `${siteConfig.schedule.startLabel} ${collectionRangeLabel(option.collection)}`
                  : option.lastCollection
                    ? `Last collected ${formatCollectionDate(option.lastCollection.startsOn).label}; next date not published`
                    : 'Next date not published'}</span>
                <small>View</small>
              </a>
            ))}
          </div>
        ) : (
          <div className="suburb-search-results suburb-search-empty" id={listId} role="status">
            <strong>No matching {siteConfig.area.singular} found</strong>
            <p>
              We couldn’t find “{query.trim()}” in Council’s current suburb data.
              Check the spelling or use the official calendar for an address-level check.
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

function routeCopy(route: Route, collections: Collection[], schedule: Schedule) {
  if (route.type === 'area') {
    const directoryArea = schedule.areaDirectory?.find((item) => item.id === route.id);
    const suburb = collections[0]?.areas.find((item) => item.id === route.id)?.name ?? directoryArea?.name ?? route.id;
    return {
      eyebrow: `${siteConfig.placeName} ${siteConfig.area.singular} schedule`,
      title: `${suburb} ${siteConfig.serviceName} date`,
      lede: collections[0]
        ? `The next published large-item kerbside collection for ${suburb} runs ${collectionRangeLabel(collections[0])}.`
        : directoryArea?.lastCollection
          ? `${suburb} was last collected on ${formatCollectionDate(directoryArea.lastCollection.startsOn).label}. Council has not yet published its next date.`
          : `No upcoming large-item collection is currently published for ${suburb}.`,
      areaName: suburb,
    };
  }
  if (route.type === 'collection') {
    const date = collections[0] ? formatCollectionDate(collections[0].startsOn).label : route.id;
    return {
      eyebrow: siteConfig.schedule.eyebrow,
      title: `${siteConfig.placeName} ${siteConfig.serviceName} — ${date}`,
      lede: collections[0]
        ? `${collections[0].areas.length} ${siteConfig.placeName} ${siteConfig.area.plural} are scheduled for this collection ${siteConfig.schedule.singular}.`
        : `This collection ${siteConfig.schedule.singular} is no longer in the published schedule.`,
    };
  }
  return {
    eyebrow: 'Large-item collection',
    title: 'Know when the kerb clears.',
    lede: `Choose an upcoming collection ${siteConfig.schedule.singular} or search for your ${siteConfig.area.singular} to see exactly which ${siteConfig.placeName} ${siteConfig.area.plural} are covered.`,
  };
}

function RouteFacts({ route, collection }: { route: Route; collection: Collection }) {
  if (route.type !== 'area' && route.type !== 'collection') return null;

  const collectionDate = formatCollectionDate(collection.startsOn);
  const collectionEndDate = collection.endsOn ? formatCollectionDate(collection.endsOn) : undefined;
  const itemsOutDate = formatCollectionDate(collection.putOutFrom);

  if (route.type === 'area') {
    const suburb = collection.areas.find((item) => item.id === route.id);
    if (!suburb) return null;
    const sameWeek = collection.areas.filter((item) => item.id !== route.id);

    return (
      <section className="route-facts" aria-labelledby="route-facts-title">
        <p className="eyebrow">At a glance</p>
        <h2 id="route-facts-title">Next published collection for {suburb.name}</h2>
        <p>
          {siteConfig.councilName}’s current open schedule places {suburb.name} in the collection {siteConfig.schedule.singular} starting {collectionDate.label}.
          Put eligible large items out from {itemsOutDate.label}, ready for collection by {siteConfig.rules.readyBy}.
        </p>
        <dl>
          <div><dt>Collection starts</dt><dd>{collectionDate.label}</dd></div>
          {collectionEndDate && <div><dt>Collection ends</dt><dd>{collectionEndDate.label}</dd></div>}
          <div><dt>Items out from</dt><dd>{itemsOutDate.label}</dd></div>
          <div><dt>Published with</dt><dd>{sameWeek.length} other {sameWeek.length === 1 ? siteConfig.area.singular : siteConfig.area.plural}</dd></div>
          <div><dt>Household limit</dt><dd>{siteConfig.rules.householdLimit}</dd></div>
        </dl>
        {suburb.note && (
          <p className="route-facts-related"><strong>Coverage note:</strong> {suburb.note}</p>
        )}
        {sameWeek.length > 0 && (
          <p className="route-facts-related">
            The same collection {siteConfig.schedule.singular} also covers {sameWeek.slice(0, 5).map((item) => item.name).join(', ')}{sameWeek.length > 5 ? ` and ${sameWeek.length - 5} more` : ''}.
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
      <p className="eyebrow">{siteConfig.schedule.eyebrow} details</p>
      <h2 id="route-facts-title">{collection.areas.length} {siteConfig.area.plural} are on this published run</h2>
      <p>
        Eligible large household items can be placed out from {itemsOutDate.label}. Have the pile ready by {siteConfig.rules.readyBy}; this run begins {collectionDate.label}{collectionEndDate ? ` and is scheduled through ${collectionEndDate.label}` : ''}.
      </p>
      <dl>
        <div><dt>Collection starts</dt><dd>{collectionDate.label}</dd></div>
        {collectionEndDate && <div><dt>Collection ends</dt><dd>{collectionEndDate.label}</dd></div>}
        <div><dt>Items out from</dt><dd>{itemsOutDate.label}</dd></div>
        <div><dt>{siteConfig.area.plural[0].toUpperCase()}{siteConfig.area.plural.slice(1)} listed</dt><dd>{collection.areas.length}</dd></div>
        <div><dt>Household limit</dt><dd>{siteConfig.rules.householdLimit}</dd></div>
      </dl>
      <div className="route-facts-links">
        <a href={sitePath('/guide/')}>What can go out?</a>
        <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Confirm with Council ↗</a>
      </div>
    </section>
  );
}

function HistoricalAreaFacts({ area }: { area: AreaDirectoryEntry }) {
  const last = area.lastCollection;
  if (!last) return null;
  return (
    <section className="route-facts route-facts--historical" aria-labelledby="route-facts-title">
      <p className="eyebrow">Current status</p>
      <h2 id="route-facts-title">{area.name}’s next date is not published yet</h2>
      <p>
        Council’s source shows the most recent collection for {area.name} started {formatCollectionDate(last.startsOn).label}, with items placed out from {formatCollectionDate(last.putOutFrom).label}. That collection has passed, but the suburb remains searchable while Council prepares its next schedule.
      </p>
      <dl>
        <div><dt>Last collection</dt><dd>{formatCollectionDate(last.startsOn).label}</dd></div>
        <div><dt>Items were out from</dt><dd>{formatCollectionDate(last.putOutFrom).label}</dd></div>
        <div><dt>Next collection</dt><dd>Not yet published</dd></div>
      </dl>
      <div className="route-facts-links">
        <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Check the official calendar ↗</a>
        <a href={sitePath('/')}>Browse all upcoming dates</a>
      </div>
    </section>
  );
}

export function App({ schedule, route }: AppProps) {
  const routeCollections = collectionsForRoute(schedule, route);
  const routeArea = route.type === 'area' ? schedule.areaDirectory?.find((item) => item.id === route.id) : undefined;
  const historicalCollection: Collection | undefined = routeArea?.lastCollection && routeCollections.length === 0
    ? {
        id: routeArea.lastCollection.startsOn,
        startsOn: routeArea.lastCollection.startsOn,
        ...(routeArea.lastCollection.endsOn ? { endsOn: routeArea.lastCollection.endsOn } : {}),
        putOutFrom: routeArea.lastCollection.putOutFrom,
        areas: [{ id: routeArea.id, name: routeArea.name, ...(routeArea.note ? { note: routeArea.note } : {}) }],
      }
    : undefined;
  const [selectedId, setSelectedId] = useState(routeCollections[0]?.id ?? schedule.collections[0]?.id ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [suburbQuery, setSuburbQuery] = useState('');
  const suburbs = useMemo(() => suburbOptions(schedule), [schedule]);
  const selectableCollectionIds = useMemo(
    () => route.type === 'home' ? schedule.collections.map((collection) => collection.id) : [],
    [route.type, schedule.collections],
  );
  const selected = routeCollections.find((item) => item.id === selectedId) ?? routeCollections[0] ?? historicalCollection ?? schedule.collections[0];
  const copy = routeCopy(route, routeCollections, schedule);

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

  useEffect(() => {
    if (!menuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`sheet-collection-${selectedId}`)?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuOpen, selectedId]);

  if (route.type === 'privacy') return <PrivacyPage />;
  if (route.type === 'about') return <AboutPage schedule={schedule} />;
  if (route.type === 'guide') return <GuidePage />;

  if (!selected) {
    return (
      <main className="empty-state">
        <p className="eyebrow">{siteConfig.placeName} kerbside</p>
        <h1>No upcoming collections are published yet.</h1>
        <p>Check back after {siteConfig.councilName} updates its schedule.</p>
      </main>
    );
  }

  const selectedArea = route.type === 'area' ? route.id : undefined;
  const totalAreas = schedule.areaDirectory?.length ?? new Set(
    schedule.collections.flatMap((collection) => collection.areas.map((suburb) => suburb.id)),
  ).size;
  const historicalAreaRoute = route.type === 'area' && routeCollections.length === 0 && Boolean(routeArea?.lastCollection);

  function selectCollectionFromMap(selection: MapAreaSelection) {
    const collection = routeCollections.find((item) => item.id === selection.collectionId);
    if (!collection) return;

    setSelectedId(collection.id);
    trackEvent('collection_map_select', {
      collection_date: collection.startsOn,
      suburb: selection.areaName,
      placement: 'map_area',
    });

    if (window.matchMedia('(max-width: 900px)').matches) {
      setMenuOpen(true);
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById(`collection-${collection.id}`)?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
  }

  return (
    <main className="app-shell">
      <section className="schedule-panel" aria-labelledby="page-title">
        <header className="site-header">
          <a className="brand-mark" href={sitePath('/')} aria-label={`${siteConfig.placeName} kerbside map home`}>{siteConfig.brandMark}</a>
          <p>{siteConfig.headerLabel}</p>
          <nav className="header-actions" aria-label="Project links">
            <a href={sitePath('/guide/')}>Guide</a>
            <a href={sitePath('/about/')}>About</a>
            <a
              className="sponsor-link"
              href={KO_FI_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent('donation_click', { placement: 'header', provider: 'ko_fi' })}
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
                  {route.type === 'area'
                    ? `You’re viewing ${copy.areaName} only`
                    : `You’re viewing one collection ${siteConfig.schedule.singular}`}
                </strong>
              </span>
              <span className="filter-context-all">
                <strong>See all {schedule.collections.length} upcoming {siteConfig.schedule.plural}</strong>
                <small>{totalAreas} searchable {siteConfig.placeName} {siteConfig.area.plural}</small>
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

        {historicalAreaRoute && routeArea ? <HistoricalAreaFacts area={routeArea} /> : <RouteFacts route={route} collection={selected} />}

        {historicalAreaRoute ? (
          <section className="schedule-unavailable" aria-labelledby="unavailable-title">
            <p className="eyebrow">What happens next</p>
            <h2 id="unavailable-title">Keep the suburb; wait for the date.</h2>
            <p>{routeArea?.name} and other recently collected suburbs remain in search and keep their static pages. When Council publishes the next run, this page will update automatically with the new date and preparation timing.</p>
          </section>
        ) : (
          <>
            <div className="list-heading">
              <h2>{route.type === 'home' ? 'Upcoming dates' : 'Published schedule'}</h2>
              <span>{routeCollections.length} {routeCollections.length === 1 ? siteConfig.schedule.singular : siteConfig.schedule.plural}</span>
            </div>

            <ol className="collection-list">
              {routeCollections.map((collection) => {
            const date = formatCollectionDate(collection.startsOn);
            const itemsOut = formatCollectionDate(collection.putOutFrom);
            const active = collection.id === selected.id;

            return (
              <li key={collection.id} id={`collection-${collection.id}`}>
                <article className="collection-card" data-active={active}>
                  <button
                    className="collection-select"
                    type="button"
                    aria-label={`Show ${date.label} collection areas on the map`}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedId(collection.id);
                      trackEvent('collection_map_select', { collection_date: collection.startsOn, placement: 'desktop_list' });
                    }}
                  />
                  <span className="date-block" aria-hidden="true">
                    <span>{date.weekday}</span>
                    <strong>{date.day}</strong>
                  </span>
                  <span className="collection-details">
                    {route.type === 'home' ? (
                      <strong className="collection-title">{siteConfig.schedule.startLabel} {date.label}</strong>
                    ) : (
                      <a href={sitePath(`/collections/${collection.id}/`)}>{siteConfig.schedule.startLabel} {date.label}</a>
                    )}
                    <span className="suburb-links">
                      {collection.areas.map((suburb, index) => (
                        <span key={suburb.id}>
                          {route.type === 'home' ? (
                            suburb.name
                          ) : (
                            <a href={areaPath(suburb.id)}>{suburb.name}</a>
                          )}{index < collection.areas.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </span>
                    <small>{collection.endsOn ? `Runs through ${formatCollectionDate(collection.endsOn).label}. ` : ''}Put items out from {itemsOut.label}; have them ready by {siteConfig.rules.readyBy}</small>
                  </span>
                </article>
              </li>
            );
              })}
            </ol>
          </>
        )}

        <section className="trust-section" aria-labelledby="trust-title">
          <p className="eyebrow">Useful, current, independent</p>
          <h2 id="trust-title">Council data, made easier to use.</h2>
          <p>
            This independent open-source project refreshes directly from {siteConfig.councilName}'s public dataset. Dates can change because of weather or operational requirements, so check the official calendar before putting items out.
          </p>
          <div className="trust-links">
            <a href={COUNCIL_CALENDAR_URL}>Official Council calendar ↗</a>
            <a href={ACCEPTED_ITEMS_URL}>What Council accepts ↗</a>
            <a href={REPOSITORY_URL}>View the source code ↗</a>
          </div>
        </section>

        {route.type === 'home' && (
          <section className="faq" aria-labelledby="faq-title">
            <h2 id="faq-title">{siteConfig.placeName} kerbside collection basics</h2>
            {siteConfig.homeFaq.map((item) => (
              <article key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </section>
        )}

        <footer>
          <p>Data refreshed {formatGeneratedAt(schedule.generatedAt)}</p>
          <a href={sitePath('/guide/')}>{siteConfig.placeName} kerbside guide</a>
          <a href={sitePath('/about/')}>About & methodology</a>
          <a href={schedule.source.url} target="_blank" rel="noreferrer">{siteConfig.councilName} open data ↗</a>
          <a
            href={SPONSOR_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('donation_click', { placement: 'footer', provider: 'github_sponsors' })}
          >Support this project on GitHub ↗</a>
          <a
            href={KO_FI_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('donation_click', { placement: 'footer', provider: 'ko_fi' })}
          >Support this project on Ko-fi ↗</a>
          <a href={sitePath('/privacy/')}>Privacy & advertising</a>
          <a href={DIRECTORY_URL}>Find another council ↗</a>
        </footer>
      </section>

      <section className="map-panel" aria-label="Collection area map">
        <CollectionMap
          selectedDate={selected.startsOn}
          selectedLabel={historicalAreaRoute ? `Last collected ${formatCollectionDate(selected.startsOn).label}` : collectionRangeLabel(selected)}
          selectedArea={selectedArea}
          caption={historicalAreaRoute ? 'Showing most recent collection' : undefined}
          selectableCollectionIds={selectableCollectionIds}
          onAreaSelect={route.type === 'home' ? selectCollectionFromMap : undefined}
        />
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
          <span>{schedule.collections.length} {siteConfig.schedule.plural}</span>
        </header>
        <nav className="date-sheet-nav" aria-label="Site navigation">
          <a href={sitePath('/guide/')}>Guide</a>
          <a href={sitePath('/about/')}>About</a>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">Open source</a>
          <a href={DIRECTORY_URL}>All councils</a>
          <a
            href={KO_FI_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('donation_click', { placement: 'mobile_sheet', provider: 'ko_fi' })}
          >Donate</a>
          <a
            href={SPONSOR_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackEvent('donation_click', { placement: 'mobile_sheet', provider: 'github_sponsors' })}
          >GitHub Sponsors</a>
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
            const date = formatCollectionDate(collection.startsOn);
            const active = collection.id === selected.id;

            return (
              <li key={collection.id}>
                <a
                  id={`sheet-collection-${collection.id}`}
                  href={sitePath(`/collections/${collection.id}/`)}
                  data-active={active}
                  onClick={(event) => {
                    if (route.type === 'home') {
                      event.preventDefault();
                      setSelectedId(collection.id);
                      trackEvent('collection_map_select', { collection_date: collection.startsOn, placement: 'mobile_sheet' });
                    }
                    setMenuOpen(false);
                  }}
                >
                  <strong>{siteConfig.schedule.startLabel} {date.label}</strong>
                  <span>{collection.areas.map((suburb) => suburb.name).join(' · ')}</span>
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
