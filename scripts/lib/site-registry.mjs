import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const appDir = resolve(import.meta.dirname, '../..');

export async function registeredSites() {
  return JSON.parse(await readFile(resolve(appDir, 'sites/registry.json'), 'utf8'));
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
