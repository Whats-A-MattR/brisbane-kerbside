import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registry = JSON.parse(await readFile(new URL('../sites/registry.json', import.meta.url), 'utf8'));
const sites = [];

for (const entry of registry.filter((site) => site.kind === 'council')) {
  const metadata = JSON.parse(await readFile(new URL(`../sites/${entry.id}/site.json`, import.meta.url), 'utf8'));
  if (!metadata.updates?.enabled) continue;
  const notices = metadata.updates.notifications;
  if (metadata.id !== entry.id || !metadata.siteUrl || !metadata.state || !notices?.fromEmail ||
      !Number.isInteger(notices.collectionLeadDays) || !Number.isInteger(notices.itemsOutLeadDays)) {
    throw new Error(`Invalid email notification metadata for ${entry.id}`);
  }
  sites.push({
    id: metadata.id,
    name: metadata.shortName,
    placeName: metadata.placeName,
    serviceName: metadata.serviceName,
    siteUrl: metadata.siteUrl,
    scheduleUrl: new URL('/data/schedule.json', metadata.siteUrl).toString(),
    fromEmail: notices.fromEmail,
    locale: metadata.locale,
    timeZone: metadata.timeZone,
    state: metadata.state,
    collectionLeadDays: notices.collectionLeadDays,
    itemsOutLeadDays: notices.itemsOutLeadDays,
  });
}

const output = `${JSON.stringify(sites, null, 2)}\n`;
const target = new URL('../workers/sites.generated.json', import.meta.url);
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== output) throw new Error('workers/sites.generated.json is stale. Run pnpm notifications:config.');
} else {
  await writeFile(target, output);
  console.log(`Generated notification config for ${sites.length} councils in ${root}`);
}
