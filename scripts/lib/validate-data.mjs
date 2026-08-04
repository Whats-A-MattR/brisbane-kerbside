function assert(condition, message) {
  if (!condition) throw new Error(`Council data validation failed: ${message}`);
}

export function validateOutputs(siteId, schedule, areas) {
  assert(schedule.schemaVersion === 1, 'schemaVersion must be 1');
  assert(schedule.siteId === siteId, `schedule siteId must be ${siteId}`);
  assert(typeof schedule.generatedAt === 'string' && !Number.isNaN(Date.parse(schedule.generatedAt)), 'generatedAt must be an ISO date');
  assert(schedule.source?.publisher && schedule.source?.url, 'source publisher and URL are required');
  assert(Array.isArray(schedule.collections) && schedule.collections.length > 0, 'at least one collection is required');
  assert(areas?.type === 'FeatureCollection' && Array.isArray(areas.features), 'areas must be a GeoJSON FeatureCollection');

  const collectionIds = new Set();
  const scheduledPairs = new Map();
  let previousDate = '';
  for (const collection of schedule.collections) {
    assert(!collectionIds.has(collection.id), `duplicate collection id ${collection.id}`);
    assert(collection.startsOn >= previousDate, 'collections must be sorted by startsOn');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(collection.startsOn), `invalid startsOn date for ${collection.id}`);
    if (collection.endsOn) {
      assert(/^\d{4}-\d{2}-\d{2}$/.test(collection.endsOn), `invalid endsOn date for ${collection.id}`);
      assert(collection.endsOn >= collection.startsOn, `endsOn precedes startsOn for ${collection.id}`);
    }
    assert(/^\d{4}-\d{2}-\d{2}$/.test(collection.putOutFrom), `invalid putOutFrom date for ${collection.id}`);
    assert(Array.isArray(collection.areas) && collection.areas.length > 0, `collection ${collection.id} has no areas`);
    collectionIds.add(collection.id);
    previousDate = collection.startsOn;
    for (const area of collection.areas) {
      assert(area.id && area.name, `collection ${collection.id} has an invalid area`);
      const pair = `${collection.id}:${area.id}`;
      assert(!scheduledPairs.has(pair), `duplicate scheduled area ${pair}`);
      scheduledPairs.set(pair, {
        startsOn: collection.startsOn,
        endsOn: collection.endsOn,
        putOutFrom: collection.putOutFrom,
        note: area.note,
      });
    }
  }

  const directoryById = new Map();
  const historicalPairs = new Map();
  if (schedule.areaDirectory !== undefined) {
    assert(Array.isArray(schedule.areaDirectory) && schedule.areaDirectory.length > 0, 'areaDirectory must contain at least one area');
    for (const area of schedule.areaDirectory) {
      assert(area.id && area.name, 'areaDirectory contains an invalid area');
      assert(!directoryById.has(area.id), `duplicate areaDirectory id ${area.id}`);
      if (area.nextCollectionId) {
        assert(collectionIds.has(area.nextCollectionId), `areaDirectory ${area.id} references unknown collection ${area.nextCollectionId}`);
        assert(scheduledPairs.has(`${area.nextCollectionId}:${area.id}`), `areaDirectory ${area.id} is not listed in ${area.nextCollectionId}`);
      }
      if (area.lastCollection) {
        const previous = area.lastCollection;
        assert(/^\d{4}-\d{2}-\d{2}$/.test(previous.startsOn), `invalid last collection date for ${area.id}`);
        assert(/^\d{4}-\d{2}-\d{2}$/.test(previous.putOutFrom), `invalid last put-out date for ${area.id}`);
        if (previous.endsOn) assert(previous.endsOn >= previous.startsOn, `last collection end precedes start for ${area.id}`);
        historicalPairs.set(`${previous.startsOn}:${area.id}`, previous);
      }
      directoryById.set(area.id, area);
    }
    for (const pair of scheduledPairs.keys()) {
      const areaId = pair.slice(pair.indexOf(':') + 1);
      assert(directoryById.has(areaId), `scheduled area ${areaId} is missing from areaDirectory`);
    }
  }

  const geometryPairs = new Map();
  for (const feature of areas.features) {
    const properties = feature?.properties;
    assert(properties?.collectionId && properties?.areaId && properties?.areaName, 'each feature needs collectionId, areaId and areaName');
    assert(properties?.startsOn && properties?.putOutFrom, 'each feature needs startsOn and putOutFrom');
    assert(feature?.geometry?.coordinates, `feature ${properties.areaId} has no geometry`);
    const pair = `${properties.collectionId}:${properties.areaId}`;
    assert(!geometryPairs.has(pair), `duplicate geometry for ${pair}`);
    geometryPairs.set(pair, properties);
  }

  for (const [pair, scheduled] of scheduledPairs) {
    assert(geometryPairs.has(pair), `missing geometry for ${pair}`);
    const geometry = geometryPairs.get(pair);
    assert(geometry.startsOn === scheduled.startsOn, `startsOn mismatch for ${pair}`);
    assert(geometry.endsOn === scheduled.endsOn, `endsOn mismatch for ${pair}`);
    assert(geometry.putOutFrom === scheduled.putOutFrom, `putOutFrom mismatch for ${pair}`);
    assert(geometry.areaNote === scheduled.note, `area note mismatch for ${pair}`);
  }
  for (const [pair, historical] of historicalPairs) {
    const areaId = pair.slice(pair.indexOf(':') + 1);
    const directoryArea = directoryById.get(areaId);
    if (directoryArea?.nextCollectionId) continue;
    assert(geometryPairs.has(pair), `missing historical geometry for ${pair}`);
    const geometry = geometryPairs.get(pair);
    assert(geometry.startsOn === historical.startsOn, `historical startsOn mismatch for ${pair}`);
    assert(geometry.putOutFrom === historical.putOutFrom, `historical putOutFrom mismatch for ${pair}`);
  }
  for (const pair of geometryPairs.keys()) {
    assert(scheduledPairs.has(pair) || historicalPairs.has(pair), `geometry has no schedule or area-history record for ${pair}`);
  }
}
