import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { appDir, councilSites } from './site-registry.mjs';

export async function masterData() {
  const councils = await Promise.all((await councilSites()).map(async (registryEntry) => {
    const siteDir = resolve(appDir, 'sites', registryEntry.id);
    const config = JSON.parse(await readFile(resolve(siteDir, 'site.json'), 'utf8'));
    const schedule = JSON.parse(await readFile(resolve(siteDir, 'public/data/schedule.json'), 'utf8'));
    const areaNames = [...new Set(schedule.collections.flatMap((collection) => collection.areas.map((area) => area.name)))].sort();
    const firstCollection = schedule.collections[0];

    return {
      id: registryEntry.id,
      label: registryEntry.label,
      councilName: config.councilName,
      placeName: config.placeName,
      siteUrl: config.siteUrl,
      serviceName: config.serviceName,
      center: config.map.center,
      scheduleLabel: config.schedule.plural,
      areaLabel: config.area.plural,
      areas: areaNames,
      collectionCount: schedule.collections.length,
      generatedAt: schedule.generatedAt,
      nextCollection: firstCollection ? {
        startsOn: firstCollection.startsOn,
        ...(firstCollection.endsOn ? { endsOn: firstCollection.endsOn } : {}),
        areas: firstCollection.areas.map((area) => area.name),
      } : null,
      links: {
        officialCalendar: config.links.officialCalendar,
        acceptedItems: config.links.acceptedItems,
      },
      source: {
        publisher: schedule.source.publisher,
        url: schedule.source.url,
        licence: schedule.source.licence ?? null,
      },
    };
  }));

  return {
    generatedAt: councils.map((council) => council.generatedAt).sort().at(-1) ?? new Date().toISOString(),
    councils,
  };
}
