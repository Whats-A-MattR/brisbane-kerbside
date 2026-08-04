import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appDir, assertRegisteredSite, selectedSiteId } from './lib/site-registry.mjs';
import { validateOutputs } from './lib/validate-data.mjs';

const siteId = selectedSiteId();
await assertRegisteredSite(siteId);

const adapterUrl = pathToFileURL(resolve(appDir, 'sites', siteId, 'etl.mjs')).href;
const adapter = await import(adapterUrl);
if (typeof adapter.extract !== 'function' || typeof adapter.transform !== 'function') {
  throw new Error(`${siteId}/etl.mjs must export extract() and transform().`);
}

const raw = await adapter.extract();
const outputs = await adapter.transform(raw);
validateOutputs(siteId, outputs.schedule, outputs.areas);

const outputDir = resolve(appDir, 'sites', siteId, 'public/data');
await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, 'schedule.json'), `${JSON.stringify(outputs.schedule, null, 2)}\n`),
  writeFile(resolve(outputDir, 'areas.geojson'), `${JSON.stringify(outputs.areas)}\n`),
]);

console.log(`[${siteId}] Wrote ${outputs.schedule.collections.length} collection runs, ${outputs.schedule.areaDirectory?.length ?? 'no'} directory areas and ${outputs.areas.features.length} mapped records.`);
