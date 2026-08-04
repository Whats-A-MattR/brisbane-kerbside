import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://brisbanekerbside.app';
const adsenseClient = process.env.VITE_ADSENSE_CLIENT?.trim();

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: APP_DIR, env: process.env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}`)));
  });
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function longDate(value) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane',
  }).format(new Date(`${value}T00:00:00+10:00`));
}

function pageDetails(schedule, route) {
  if (route.type === 'privacy') {
    return {
      path: '/privacy/',
      title: 'Privacy and advertising | Brisbane Kerbside Collection Map',
      description: 'How Brisbane Kerbside Collection Map uses aggregate analytics, advertising and third-party map services.',
    };
  }
  if (route.type === 'collection') {
    const collection = schedule.collections.find((item) => item.id === route.id);
    const suburbNames = collection?.suburbs.map((item) => item.name) ?? [];
    const suburbs = suburbNames.length > 6
      ? `${suburbNames.slice(0, 6).join(', ')} and ${suburbNames.length - 6} more`
      : suburbNames.join(', ');
    return {
      path: `/collections/${route.id}/`,
      title: `Brisbane kerbside collection ${longDate(route.id)} | Map`,
      description: `Brisbane kerbside collection week starting ${longDate(route.id)}: ${suburbs}. See collection areas and the items-out date.`,
    };
  }
  if (route.type === 'suburb') {
    const collection = schedule.collections.find((item) => item.suburbs.some((suburb) => suburb.id === route.id));
    const suburb = collection?.suburbs.find((item) => item.id === route.id)?.name ?? route.id;
    return {
      path: `/suburbs/${route.id}/`,
      title: `${suburb} kerbside collection date | Brisbane ${collection?.collectionDate.slice(0, 4) ?? ''}`,
      description: `Find the next ${suburb} kerbside large-item collection date, when to put items out and the official suburb area on a map.`,
    };
  }
  return {
    path: '/',
    title: 'Brisbane kerbside collection dates and suburb map',
    description: 'Find upcoming Brisbane kerbside large-item collection dates. Select a week to highlight every scheduled suburb on an interactive map.',
  };
}

function structuredData(schedule, route, details) {
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Brisbane Kerbside Collection Map',
      description: 'Upcoming Brisbane kerbside large-item collection dates and suburb areas.',
      inLanguage: 'en-AU',
    },
    {
      '@type': 'Dataset',
      '@id': `${SITE_URL}/#dataset`,
      name: 'Brisbane kerbside large-item collection schedule map',
      description: 'A regularly refreshed, map-ready presentation of Brisbane City Council kerbside collection open data.',
      url: `${SITE_URL}/`,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      creator: { '@type': 'GovernmentOrganization', name: 'Brisbane City Council', url: schedule.sourceUrl },
      temporalCoverage: `${schedule.collections[0]?.collectionDate}/${schedule.collections.at(-1)?.collectionDate}`,
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${SITE_URL}/data/schedule.json`,
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${details.path}#page`,
      url: `${SITE_URL}${details.path}`,
      name: details.title,
      description: details.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      dateModified: schedule.generatedAt,
      inLanguage: 'en-AU',
    },
  ];

  if (route.type === 'home') {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'How often is kerbside collection in Brisbane?', acceptedAnswer: { '@type': 'Answer', text: 'Brisbane City Council schedules one large-item collection week per financial year for each Brisbane suburb.' } },
        { '@type': 'Question', name: 'When should items go on the footpath?', acceptedAnswer: { '@type': 'Answer', text: 'Items can go out on the weekend before the collection week and must be ready by 6am on the first day.' } },
        { '@type': 'Question', name: 'How much can I put out for Brisbane kerbside collection?', acceptedAnswer: { '@type': 'Answer', text: 'Council limits each pile to 2 cubic metres, roughly one small box-trailer load.' } },
      ],
    });
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
}

await run('vite', ['build']);
await run('vite', ['build', '--ssr', 'src/entry-server.tsx', '--outDir', 'dist/server', '--emptyOutDir', 'false']);

const schedule = JSON.parse(await readFile(resolve(APP_DIR, 'public/data/schedule.json'), 'utf8'));
const serverEntry = await import(pathToFileURL(resolve(APP_DIR, 'dist/server/entry-server.js')).href);
const template = await readFile(resolve(APP_DIR, 'dist/index.html'), 'utf8');
const dataJson = JSON.stringify(schedule).replaceAll('<', '\\u003c');
const adsenseHead = adsenseClient
  ? `<meta name="google-adsense-account" content="${escapeAttribute(adsenseClient)}"><script async data-adsense-client="${escapeAttribute(adsenseClient)}" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}" crossorigin="anonymous"></script>`
  : '';
const suburbIds = [...new Set(schedule.collections.flatMap((item) => item.suburbs.map((suburb) => suburb.id)))];
const routes = [
  { type: 'home' },
  { type: 'privacy' },
  ...schedule.collections.map((item) => ({ type: 'collection', id: item.id })),
  ...suburbIds.map((id) => ({ type: 'suburb', id })),
];

for (const route of routes) {
  const details = pageDetails(schedule, route);
  const pageUrl = `${SITE_URL}${details.path}`;
  const html = template
    .replace('<!--app-html-->', serverEntry.render(schedule, route))
    .replace('<!--data-json-->', dataJson)
    .replace('<!--route-json-->', JSON.stringify(route))
    .replace('<!--structured-data-->', `<script type="application/ld+json">${structuredData(schedule, route, details)}</script>`)
    .replace('<!--adsense-head-->', adsenseHead)
    .replaceAll('__PAGE_TITLE__', escapeAttribute(details.title))
    .replaceAll('__PAGE_DESCRIPTION__', escapeAttribute(details.description))
    .replaceAll('__PAGE_URL__', pageUrl);
  const output = details.path === '/' ? resolve(APP_DIR, 'dist/index.html') : resolve(APP_DIR, `dist${details.path}index.html`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html);
}

const lastModified = schedule.generatedAt.slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => {
  const details = pageDetails(schedule, route);
  return `  <url><loc>${SITE_URL}${details.path}</loc><lastmod>${lastModified}</lastmod></url>`;
}).join('\n')}\n</urlset>\n`;
await writeFile(resolve(APP_DIR, 'dist/sitemap.xml'), sitemap);
if (adsenseClient) {
  const publisherId = adsenseClient.replace(/^ca-/, '');
  await writeFile(resolve(APP_DIR, 'dist/ads.txt'), `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`);
}
await rm(resolve(APP_DIR, 'dist/server'), { recursive: true, force: true });
console.log(`Pre-rendered ${routes.length} indexable pages.`);
