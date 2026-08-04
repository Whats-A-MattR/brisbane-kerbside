import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { appDir, councilSites } from './site-registry.mjs';

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function bookingCouncils() {
  const path = resolve(appDir, 'sites/master/data/booking-councils.json');
  const entries = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('Booking council data must be an array.');

  return entries.map((entry) => {
    const required = ['id', 'label', 'councilName', 'placeName', 'serviceName', 'verifiedAt', 'service', 'links', 'areas'];
    for (const key of required) {
      if (!entry[key]) throw new Error(`Booking council ${entry.id ?? '(unknown)'} is missing ${key}.`);
    }
    if (!Array.isArray(entry.areas) || !entry.areas.length) throw new Error(`Booking council ${entry.id} has no published areas.`);
    for (const key of ['officialService', 'booking', 'acceptedItems', 'areaSource']) {
      if (!URL.canParse(entry.links[key])) throw new Error(`Booking council ${entry.id} has an invalid ${key} URL.`);
    }

    const areaDetails = [...new Set(entry.areas)]
      .map((name) => ({ id: slugify(name), name, collectionIds: [] }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en-AU'));
    if (new Set(areaDetails.map((area) => area.id)).size !== areaDetails.length) {
      throw new Error(`Booking council ${entry.id} has duplicate area slugs.`);
    }

    return {
      id: entry.id,
      label: entry.label,
      councilName: entry.councilName,
      placeName: entry.placeName,
      serviceModel: entry.service.model,
      siteUrl: entry.links.officialService,
      actionUrl: entry.links.booking,
      serviceName: entry.serviceName,
      serviceDetails: entry.service,
      center: entry.center,
      scheduleLabel: 'bookings',
      areaLabel: 'suburbs',
      areaRouteSegment: 'suburbs',
      areas: areaDetails.map((area) => area.name),
      areaDetails,
      collections: [],
      collectionCount: 0,
      generatedAt: entry.verifiedAt,
      nextCollection: null,
      links: {
        officialCalendar: entry.links.officialService,
        acceptedItems: entry.links.acceptedItems,
        booking: entry.links.booking,
        areaSource: entry.links.areaSource,
      },
      source: {
        publisher: entry.councilName,
        url: entry.links.officialService,
        licence: null,
      },
    };
  });
}

export async function masterData() {
  const scheduledCouncils = await Promise.all((await councilSites()).map(async (registryEntry) => {
    const siteDir = resolve(appDir, 'sites', registryEntry.id);
    const config = JSON.parse(await readFile(resolve(siteDir, 'site.json'), 'utf8'));
    const schedule = JSON.parse(await readFile(resolve(siteDir, 'public/data/schedule.json'), 'utf8'));
    const scheduledAreas = [...new Map(schedule.collections.flatMap((collection) => collection.areas.map((area) => [area.id, area]))).values()];
    const directoryAreas = schedule.areaDirectory ?? scheduledAreas;
    const areaNames = directoryAreas.map((area) => area.name).sort((a, b) => a.localeCompare(b, config.locale));
    const areaDetails = directoryAreas
      .map((area) => ({
        id: area.id,
        name: area.name,
        collectionIds: schedule.collections.filter((collection) => collection.areas.some((item) => item.id === area.id)).map((collection) => collection.id),
        ...(area.lastCollection ? { lastCollection: area.lastCollection } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, config.locale));
    const collections = schedule.collections.map((collection) => ({
      id: collection.id,
      startsOn: collection.startsOn,
      ...(collection.endsOn ? { endsOn: collection.endsOn } : {}),
      ...(collection.putOutFrom ? { putOutFrom: collection.putOutFrom } : {}),
      areas: collection.areas,
    }));
    const firstCollection = schedule.collections[0];

    return {
      id: registryEntry.id,
      label: registryEntry.label,
      councilName: config.councilName,
      placeName: config.placeName,
      serviceModel: 'scheduled',
      siteUrl: config.siteUrl,
      actionUrl: config.siteUrl,
      serviceName: config.serviceName,
      serviceDetails: null,
      center: config.map.center,
      scheduleLabel: config.schedule.plural,
      areaLabel: config.area.plural,
      areaRouteSegment: config.area.routeSegment,
      areas: areaNames,
      areaDetails,
      collections,
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
        booking: null,
        areaSource: schedule.source.url,
      },
      source: {
        publisher: schedule.source.publisher,
        url: schedule.source.url,
        licence: schedule.source.licence ?? null,
      },
    };
  }));
  const bookings = await bookingCouncils();
  const councils = [...scheduledCouncils, ...bookings];
  if (new Set(councils.map((council) => council.id)).size !== councils.length) {
    throw new Error('Scheduled and booking council identifiers must be unique.');
  }

  return {
    generatedAt: councils.map((council) => council.generatedAt).sort().at(-1) ?? new Date().toISOString(),
    councils,
  };
}
