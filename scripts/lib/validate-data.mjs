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
  const scheduledPairs = new Set();
  let previousDate = '';
  for (const collection of schedule.collections) {
    assert(!collectionIds.has(collection.id), `duplicate collection id ${collection.id}`);
    assert(collection.startsOn >= previousDate, 'collections must be sorted by startsOn');
    assert(/^\d{4}-\d{2}-\d{2}$/.test(collection.startsOn), `invalid startsOn date for ${collection.id}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(collection.putOutFrom), `invalid putOutFrom date for ${collection.id}`);
    assert(Array.isArray(collection.areas) && collection.areas.length > 0, `collection ${collection.id} has no areas`);
    collectionIds.add(collection.id);
    previousDate = collection.startsOn;
    for (const area of collection.areas) {
      assert(area.id && area.name, `collection ${collection.id} has an invalid area`);
      const pair = `${collection.id}:${area.id}`;
      assert(!scheduledPairs.has(pair), `duplicate scheduled area ${pair}`);
      scheduledPairs.add(pair);
    }
  }

  const geometryPairs = new Set();
  for (const feature of areas.features) {
    const properties = feature?.properties;
    assert(properties?.collectionId && properties?.areaId && properties?.areaName, 'each feature needs collectionId, areaId and areaName');
    assert(properties?.startsOn && properties?.putOutFrom, 'each feature needs startsOn and putOutFrom');
    assert(feature?.geometry?.coordinates, `feature ${properties.areaId} has no geometry`);
    geometryPairs.add(`${properties.collectionId}:${properties.areaId}`);
  }

  for (const pair of scheduledPairs) assert(geometryPairs.has(pair), `missing geometry for ${pair}`);
  for (const pair of geometryPairs) assert(scheduledPairs.has(pair), `geometry has no schedule record for ${pair}`);
}
