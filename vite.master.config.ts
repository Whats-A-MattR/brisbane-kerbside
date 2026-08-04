import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appDir = process.cwd();
const root = resolve(appDir, 'sites/master');

function loadMasterData() {
  const registry = JSON.parse(readFileSync(resolve(appDir, 'sites/registry.json'), 'utf8'))
    .filter((site: { kind: string }) => site.kind === 'council');
  const councils = registry.map((entry: { id: string; label: string }) => {
    const siteDir = resolve(appDir, 'sites', entry.id);
    const config = JSON.parse(readFileSync(resolve(siteDir, 'site.json'), 'utf8'));
    const schedule = JSON.parse(readFileSync(resolve(siteDir, 'public/data/schedule.json'), 'utf8'));
    const areas = [...new Set<string>(schedule.collections.flatMap((collection: { areas: Array<{ name: string }> }) => collection.areas.map((area) => area.name)))].sort();
    const areaDetails = [...new Map<string, { id: string; name: string }>(schedule.collections.flatMap((collection: { areas: Array<{ id: string; name: string }> }) => collection.areas.map((area) => [area.id, area]))).values()]
      .map((area) => ({
        ...area,
        collectionIds: schedule.collections.filter((collection: { id: string; areas: Array<{ id: string }> }) => collection.areas.some((item) => item.id === area.id)).map((collection: { id: string }) => collection.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, config.locale));
    const collections = schedule.collections.map((collection: { id: string; startsOn: string; endsOn?: string; putOutFrom?: string; areas: Array<{ id: string; name: string }> }) => ({
      id: collection.id, startsOn: collection.startsOn,
      ...(collection.endsOn ? { endsOn: collection.endsOn } : {}),
      ...(collection.putOutFrom ? { putOutFrom: collection.putOutFrom } : {}),
      areas: collection.areas,
    }));
    const first = schedule.collections[0];
    return {
      id: entry.id, label: entry.label, councilName: config.councilName, placeName: config.placeName,
      siteUrl: config.siteUrl, serviceName: config.serviceName, center: config.map.center,
      scheduleLabel: config.schedule.plural, areaLabel: config.area.plural, areaRouteSegment: config.area.routeSegment, areas, areaDetails, collections,
      collectionCount: schedule.collections.length, generatedAt: schedule.generatedAt,
      nextCollection: first ? { startsOn: first.startsOn, ...(first.endsOn ? { endsOn: first.endsOn } : {}), areas: first.areas.map((area: { name: string }) => area.name) } : null,
      links: { officialCalendar: config.links.officialCalendar, acceptedItems: config.links.acceptedItems },
      source: { publisher: schedule.source.publisher, url: schedule.source.url, licence: schedule.source.licence ?? null },
    };
  });
  return { generatedAt: councils.map((council: { generatedAt: string }) => council.generatedAt).sort().at(-1), councils };
}

function routeFromPath(path: string) {
  if (/^\/about\/?(?:[?#]|$)/.test(path)) return { type: 'about' };
  if (/^\/privacy\/?(?:[?#]|$)/.test(path)) return { type: 'privacy' };
  const area = path.match(/^\/councils\/([^/]+)\/suburbs\/([^/?#]+)/);
  if (area) return { type: 'area', councilId: area[1], id: area[2] };
  const collection = path.match(/^\/councils\/([^/]+)\/collections\/([^/?#]+)/);
  if (collection) return { type: 'collection', councilId: collection[1], id: collection[2] };
  const council = path.match(/^\/councils\/([^/]+)/);
  if (council) return { type: 'council', id: council[1] };
  if (/^\/councils\/?(?:[?#]|$)/.test(path)) return { type: 'councils' };
  return { type: 'home' };
}

const developmentData = {
  name: 'master-development-data',
  transformIndexHtml(html: string, context: { server?: unknown; path: string; originalUrl?: string }) {
    if (!context.server) return html;
    const path = context.originalUrl ?? context.path;
    const data = loadMasterData();
    return html
      .replace('<!--data-json-->', JSON.stringify(data).replaceAll('<', '\\u003c'))
      .replace('<!--route-json-->', JSON.stringify(routeFromPath(path)))
      .replaceAll('__PAGE_TITLE__', "When's Kerbside? Find council collection dates")
      .replaceAll('__PAGE_DESCRIPTION__', 'Find kerbside collection dates and official resources for supported Australian councils.')
      .replaceAll('__PAGE_URL__', `http://localhost:5173${path}`);
  },
};

export default defineConfig({
  root,
  publicDir: resolve(root, 'public'),
  plugins: [react(), developmentData],
  build: { target: 'es2022' },
});
