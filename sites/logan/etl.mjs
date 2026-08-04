const SITE_ID = 'logan';
const SCHEDULE_ITEM_ID = '17ae783777574d33bbf992c08fc24be0';
const SCHEDULE_URL = `https://www.arcgis.com/sharing/rest/content/items/${SCHEDULE_ITEM_ID}/data`;
const SOURCE_URL = `https://www.arcgis.com/home/item.html?id=${SCHEDULE_ITEM_ID}`;
const BOUNDARY_URL = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Boundaries/AdministrativeBoundaries/MapServer/2';
const BOUNDARY_DATASET_URL = 'https://www.data.qld.gov.au/dataset/locality-boundaries-queensland';

function parseCsv(value) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, ''));
  return rows.filter((values) => values.some(Boolean)).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? '']),
  ));
}

function isoDate(value) {
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) throw new Error(`Invalid Logan schedule date: ${value}`);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function brisbaneToday() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Australia/Brisbane',
  }).format(new Date());
}

function previousSaturday(dateString) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 1) % 7));
  return date.toISOString().slice(0, 10);
}

function slug(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function titleCase(value) {
  return value.toLocaleLowerCase('en-AU').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function areaDetails(row) {
  const sourceName = titleCase(row.Suburb);
  const lowerDetail = row.Additional_Detail.toLocaleLowerCase();
  if (sourceName === 'Rochedale South' && lowerDetail.includes('north of underwood road')) {
    return {
      id: 'rochedale-south-north-of-underwood-road',
      name: 'Rochedale South — north of Underwood Road',
      sourceName,
      note: 'Only properties north of Underwood Road, including the northern side. The map uses the full official locality boundary; confirm the road split with Council.',
    };
  }
  if (sourceName === 'Rochedale South' && lowerDetail.includes('south of underwood road')) {
    return {
      id: 'rochedale-south-south-of-underwood-road',
      name: 'Rochedale South — south of Underwood Road',
      sourceName,
      note: 'Only properties south of Underwood Road, including the southern side. The map uses the full official locality boundary; confirm the road split with Council.',
    };
  }
  return { id: slug(sourceName), name: sourceName, sourceName };
}

async function fetchText(url, label) {
  const response = await fetch(url, { headers: { 'user-agent': 'kerbside-site-factory-data-job/1.0' } });
  if (!response.ok) throw new Error(`${label} request failed: ${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchBoundaries() {
  const url = new URL(`${BOUNDARY_URL}/query`);
  url.searchParams.set('where', "lga='Logan City'");
  url.searchParams.set('outFields', 'locality,lga');
  url.searchParams.set('returnGeometry', 'true');
  url.searchParams.set('outSR', '4326');
  url.searchParams.set('f', 'geojson');
  const response = await fetch(url, { headers: { 'user-agent': 'kerbside-site-factory-data-job/1.0' } });
  if (!response.ok) throw new Error(`Queensland locality boundary request failed: ${response.status} ${response.statusText}`);
  return response.json();
}

export async function extract() {
  const [csv, boundaries] = await Promise.all([
    fetchText(SCHEDULE_URL, 'Logan schedule'),
    fetchBoundaries(),
  ]);
  return { rows: parseCsv(csv), boundaries };
}

export function transform({ rows, boundaries }) {
  const today = brisbaneToday();
  const usable = rows
    .map((row) => ({ ...row, startsOn: isoDate(row.Start_Date), endsOn: isoDate(row.End_Date) }))
    .filter((row) => row.endsOn >= today);
  const geometryByName = new Map(boundaries.features.map((feature) => [feature.properties.locality, feature.geometry]));
  const grouped = new Map();
  const features = [];

  for (const row of usable) {
    const area = areaDetails(row);
    const geometry = geometryByName.get(area.sourceName);
    if (!geometry) throw new Error(`No official locality geometry found for ${area.sourceName}`);
    const collection = grouped.get(row.startsOn) ?? {
      id: row.startsOn,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      putOutFrom: previousSaturday(row.startsOn),
      areas: [],
    };
    if (collection.endsOn !== row.endsOn) throw new Error(`Inconsistent end dates for Logan round starting ${row.startsOn}`);
    collection.areas.push({ id: area.id, name: area.name, ...(area.note ? { note: area.note } : {}) });
    grouped.set(row.startsOn, collection);
    features.push({
      type: 'Feature',
      id: `${row.startsOn}-${area.id}`,
      properties: {
        collectionId: row.startsOn,
        areaId: area.id,
        areaName: area.name,
        ...(area.note ? { areaNote: area.note } : {}),
        startsOn: row.startsOn,
        endsOn: row.endsOn,
        putOutFrom: previousSaturday(row.startsOn),
      },
      geometry,
    });
  }

  const collections = [...grouped.values()]
    .map((collection) => ({ ...collection, areas: collection.areas.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  if (!collections.length || !features.length) throw new Error('Logan data contained no active or upcoming collection periods.');

  return {
    schedule: {
      schemaVersion: 1,
      siteId: SITE_ID,
      generatedAt: new Date().toISOString(),
      source: {
        publisher: 'Logan City Council',
        url: SOURCE_URL,
        licence: 'https://creativecommons.org/licenses/by/3.0/au/',
      },
      collections,
    },
    areas: {
      type: 'FeatureCollection',
      attribution: {
        publisher: 'Queensland Government',
        url: BOUNDARY_DATASET_URL,
        licence: 'https://creativecommons.org/licenses/by/4.0/',
      },
      features,
    },
  };
}
