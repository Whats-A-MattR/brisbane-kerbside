const SITE_ID = 'brisbane';
const DATASET = 'kerbside-large-item-collection-schedule';
const SOURCE_URL = `https://data.brisbane.qld.gov.au/explore/dataset/${DATASET}/`;
const API_URL = `https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/${DATASET}/records`;

function brisbaneToday() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Australia/Brisbane',
  }).format(new Date());
}

function startOfCurrentWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00+10:00`);
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', timeZone: 'Australia/Brisbane',
  }).format(date);
  const mondayOffset = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Australia/Brisbane',
  }).format(date);
}

function areaId(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function areaName(name) {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, letter) => `Mc${letter.toUpperCase()}`)
    .replace(/\bMacgregor\b/g, 'MacGregor');
}

export async function extract() {
  const records = [];
  const limit = 100;
  let total = Infinity;

  for (let offset = 0; offset < total; offset += limit) {
    const url = new URL(API_URL);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('order_by', 'date_of_collection');
    const response = await fetch(url, { headers: { 'user-agent': 'kerbside-site-factory-data-job/1.0' } });
    if (!response.ok) throw new Error(`Brisbane council data request failed: ${response.status} ${response.statusText}`);
    const page = await response.json();
    total = page.total_count;
    records.push(...page.results);
  }
  return records;
}

export function transform(records) {
  const weekStart = startOfCurrentWeek(brisbaneToday());
  const valid = records.filter((record) => (
    typeof record.suburb === 'string' &&
    typeof record.date_of_collection === 'string' &&
    typeof record.items_out_on_footpath === 'string' &&
    record.geo_shape?.geometry?.coordinates
  ));
  const usable = valid.filter((record) => record.date_of_collection >= weekStart);

  const grouped = new Map();
  for (const record of usable) {
    const id = areaId(record.suburb);
    const name = areaName(record.suburb);
    const startsOn = record.date_of_collection;
    const collection = grouped.get(startsOn) ?? {
      id: startsOn,
      startsOn,
      putOutFrom: record.items_out_on_footpath,
      areas: [],
    };
    collection.areas.push({ id, name });
    grouped.set(startsOn, collection);
  }

  const collections = [...grouped.values()]
    .map((collection) => ({ ...collection, areas: collection.areas.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  if (!collections.length) throw new Error('Brisbane data contained no current or upcoming collections.');

  const recordsByArea = new Map();
  for (const record of valid) {
    const id = areaId(record.suburb);
    const entries = recordsByArea.get(id) ?? [];
    entries.push(record);
    recordsByArea.set(id, entries);
  }

  const historicalMapRecords = [];
  const areaDirectory = [...recordsByArea.entries()].map(([id, areaRecords]) => {
    const ordered = areaRecords.sort((a, b) => a.date_of_collection.localeCompare(b.date_of_collection));
    const next = ordered.find((record) => record.date_of_collection >= weekStart);
    const previous = ordered.filter((record) => record.date_of_collection < weekStart).at(-1);
    if (!next && previous) historicalMapRecords.push(previous);
    return {
      id,
      name: areaName(ordered[0].suburb),
      ...(next ? { nextCollectionId: next.date_of_collection } : {}),
      ...(previous ? {
        lastCollection: {
          startsOn: previous.date_of_collection,
          putOutFrom: previous.items_out_on_footpath,
        },
      } : {}),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const featureRecords = [...usable, ...historicalMapRecords];
  const features = featureRecords.map((record) => {
    const id = areaId(record.suburb);
    const startsOn = record.date_of_collection;
    return {
      type: 'Feature',
      id: `${startsOn}-${id}`,
      properties: {
        collectionId: startsOn,
        areaId: id,
        areaName: areaName(record.suburb),
        startsOn,
        putOutFrom: record.items_out_on_footpath,
        areaNote: undefined,
      },
      geometry: record.geo_shape.geometry,
    };
  });

  return {
    schedule: {
      schemaVersion: 1,
      siteId: SITE_ID,
      generatedAt: new Date().toISOString(),
      source: {
        publisher: 'Brisbane City Council',
        url: SOURCE_URL,
        licence: 'https://creativecommons.org/licenses/by/4.0/',
      },
      areaDirectory,
      collections,
    },
    areas: { type: 'FeatureCollection', features },
  };
}
