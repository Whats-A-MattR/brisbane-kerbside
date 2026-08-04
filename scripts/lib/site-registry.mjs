import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const appDir = resolve(import.meta.dirname, '../..');

export async function registeredSites() {
  const sites = JSON.parse(await readFile(resolve(appDir, 'sites/registry.json'), 'utf8'));
  if (!Array.isArray(sites) || !sites.length) throw new Error('sites/registry.json must contain at least one site.');
  const ids = new Set();
  for (const site of sites) {
    for (const key of ['id', 'label', 'cloudflareProject', 'githubEnvironment']) {
      if (!site[key]) throw new Error(`Registry entry is missing ${key}.`);
    }
    if (typeof site.analyticsEnabled !== 'boolean' || typeof site.adsEnabled !== 'boolean') {
      throw new Error(`Registry entry ${site.id} must explicitly enable or disable analytics and ads.`);
    }
    if (ids.has(site.id)) throw new Error(`Duplicate site id in registry: ${site.id}`);
    ids.add(site.id);
  }
  return sites;
}

export async function siteIds() {
  return (await registeredSites()).map((site) => site.id);
}

export function selectedSiteId() {
  return process.env.KERBSIDE_SITE?.trim() || 'brisbane';
}

export async function assertRegisteredSite(siteId) {
  const site = (await registeredSites()).find((candidate) => candidate.id === siteId);
  if (!site) throw new Error(`Unknown KERBSIDE_SITE “${siteId}”. Add it to sites/registry.json first.`);
  return site;
}
