import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATASET = 'kerbside-large-item-collection-schedule';
const SOURCE_URL = `https://data.brisbane.qld.gov.au/explore/dataset/${DATASET}/`;
const API_URL = `https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/${DATASET}/records`;
const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/data');

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

function suburbId(name) {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function suburbName(name) {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bMc([a-z])/g, (_, letter) => `Mc${letter.toUpperCase()}`)
    .replace(/\bMacgregor\b/g, 'MacGregor');
}

async function fetchAllRecords() {
  const records = [];
  const limit = 100;
  let total = Infinity;

  for (let offset = 0; offset < total; offset += limit) {
    const url = new URL(API_URL);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('order_by', 'date_of_collection');

    const response = await fetch(url, {
      headers: { 'user-agent': 'brisbane-kerbside-map-data-job/1.0' },
    });
    if (!response.ok) {
      throw new Error(`Council data request failed: ${response.status} ${response.statusText}`);
    }
    const page = await response.json();
    total = page.total_count;
    records.push(...page.results);
  }

  return records;
}

function buildOutputs(records) {
  const weekStart = startOfCurrentWeek(brisbaneToday());
  const usable = records.filter((record) => (
    typeof record.suburb === 'string' &&
    typeof record.date_of_collection === 'string' &&
    typeof record.items_out_on_footpath === 'string' &&
    record.date_of_collection >= weekStart &&
    record.geo_shape?.geometry?.coordinates
  ));

  const grouped = new Map();
  const features = [];

  for (const record of usable) {
    const id = suburbId(record.suburb);
    const name = suburbName(record.suburb);
    const collectionDate = record.date_of_collection;
    const existing = grouped.get(collectionDate) ?? {
      id: collectionDate,
      collectionDate,
      itemsOutDate: record.items_out_on_footpath,
      suburbs: [],
    };
    existing.suburbs.push({ id, name });
    grouped.set(collectionDate, existing);

    features.push({
      type: 'Feature',
      id: `${collectionDate}-${id}`,
      properties: {
        id,
        suburb: name,
        collectionDate,
        itemsOutDate: record.items_out_on_footpath,
      },
      geometry: record.geo_shape.geometry,
    });
  }

  const collections = [...grouped.values()]
    .map((collection) => ({
      ...collection,
      suburbs: collection.suburbs.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.collectionDate.localeCompare(b.collectionDate));

  if (!collections.length || !features.length) {
    throw new Error('Council data contained no current or upcoming collections.');
  }

  return {
    schedule: { generatedAt: new Date().toISOString(), sourceUrl: SOURCE_URL, collections },
    areas: { type: 'FeatureCollection', features },
  };
}

const records = await fetchAllRecords();
const { schedule, areas } = buildOutputs(records);
await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(resolve(OUTPUT_DIR, 'schedule.json'), `${JSON.stringify(schedule, null, 2)}\n`),
  writeFile(resolve(OUTPUT_DIR, 'areas.geojson'), `${JSON.stringify(areas)}\n`),
]);

console.log(`Wrote ${schedule.collections.length} collection weeks and ${areas.features.length} suburb areas.`);
