import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { appDir, assertRegisteredSite, selectedSiteId } from './lib/site-registry.mjs';
import { validateOutputs } from './lib/validate-data.mjs';

const siteId = selectedSiteId();
await assertRegisteredSite(siteId);
const siteDir = resolve(appDir, 'sites', siteId);
const publicDir = resolve(siteDir, 'public');
const outputDir = resolve(appDir, 'dist', siteId);
const serverDir = resolve(outputDir, 'server');
const site = JSON.parse(await readFile(resolve(siteDir, 'site.json'), 'utf8'));
const adsenseClient = process.env.VITE_ADSENSE_CLIENT?.trim();

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: appDir,
      env: { ...process.env, KERBSIDE_SITE: siteId },
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code}`)));
  });
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function longDate(value) {
  return new Intl.DateTimeFormat(site.locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: site.timeZone,
  }).format(new Date(`${value}T12:00:00Z`));
}

function pageDetails(schedule, route) {
  if (route.type === 'about') return {
    path: '/about/',
    title: `About and methodology | ${site.name}`,
    description: `How ${site.name} turns ${site.councilName} open data into a current, searchable static schedule—and where its limits are.`,
  };
  if (route.type === 'guide') return {
    path: '/guide/',
    title: `${site.placeName} kerbside collection guide | What Council accepts`,
    description: `Prepare for ${site.placeName} ${site.serviceName}: timing, accepted items, exclusions and common questions.`,
  };
  if (route.type === 'privacy') return {
    path: '/privacy/',
    title: `Privacy and advertising | ${site.name}`,
    description: `How ${site.name} uses aggregate analytics, advertising and third-party map services.`,
  };
  if (route.type === 'collection') {
    const collection = schedule.collections.find((item) => item.id === route.id);
    const names = collection?.areas.map((item) => item.name) ?? [];
    const areas = names.length > 6 ? `${names.slice(0, 6).join(', ')} and ${names.length - 6} more` : names.join(', ');
    return {
      path: `/collections/${route.id}/`,
      title: `${site.placeName} ${site.serviceName} ${longDate(route.id)} | Map`,
      description: `${site.placeName} ${site.serviceName} ${site.schedule.singular} starting ${longDate(route.id)}: ${areas}. See collection areas and the items-out date.`,
    };
  }
  if (route.type === 'area') {
    const collection = schedule.collections.find((item) => item.areas.some((area) => area.id === route.id));
    const area = collection?.areas.find((item) => item.id === route.id)?.name ?? route.id;
    return {
      path: `/${site.area.routeSegment}/${route.id}/`,
      title: `${area} ${site.serviceName} date | ${site.placeName} ${collection?.startsOn.slice(0, 4) ?? ''}`,
      description: `Find the next ${area} ${site.serviceName} date, when to put items out and the official ${site.area.singular} area on a map.`,
    };
  }
  return { path: '/', title: site.seo.homeTitle, description: site.seo.homeDescription };
}

function structuredData(schedule, route, details) {
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${site.siteUrl}/#website`,
      url: `${site.siteUrl}/`,
      name: site.name,
      description: site.seo.homeDescription,
      inLanguage: site.locale,
    },
    {
      '@type': 'Dataset',
      '@id': `${site.siteUrl}/#dataset`,
      name: `${site.placeName} ${site.serviceName} schedule map`,
      description: `A regularly refreshed, map-ready presentation of ${site.councilName} open data.`,
      url: `${site.siteUrl}/`,
      ...(schedule.source.licence ? { license: schedule.source.licence } : {}),
      creator: { '@type': 'GovernmentOrganization', name: schedule.source.publisher, url: schedule.source.url },
      temporalCoverage: `${schedule.collections[0]?.startsOn}/${schedule.collections.at(-1)?.endsOn ?? schedule.collections.at(-1)?.startsOn}`,
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${site.siteUrl}/data/schedule.json`,
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${site.siteUrl}${details.path}#page`,
      url: `${site.siteUrl}${details.path}`,
      name: details.title,
      description: details.description,
      isPartOf: { '@id': `${site.siteUrl}/#website` },
      dateModified: schedule.generatedAt,
      inLanguage: site.locale,
    },
  ];
  const faq = route.type === 'home' ? site.homeFaq : route.type === 'guide' ? site.guideFaq : undefined;
  if (faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
}

await rm(outputDir, { recursive: true, force: true });
await run('vite', ['build', '--outDir', `dist/${siteId}`]);
await run('vite', ['build', '--ssr', 'src/entry-server.tsx', '--outDir', `dist/${siteId}/server`, '--emptyOutDir', 'false']);

const schedule = JSON.parse(await readFile(resolve(publicDir, 'data/schedule.json'), 'utf8'));
const areas = JSON.parse(await readFile(resolve(publicDir, 'data/areas.geojson'), 'utf8'));
validateOutputs(siteId, schedule, areas);
const serverEntry = await import(`${pathToFileURL(resolve(serverDir, 'entry-server.js')).href}?${Date.now()}`);
const template = await readFile(resolve(outputDir, 'index.html'), 'utf8');
const dataJson = JSON.stringify(schedule).replaceAll('<', '\\u003c');
const adsenseHead = adsenseClient
  ? `<meta name="google-adsense-account" content="${escapeAttribute(adsenseClient)}"><script async data-adsense-client="${escapeAttribute(adsenseClient)}" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}" crossorigin="anonymous"></script>`
  : '';
const areaIds = [...new Set(schedule.collections.flatMap((item) => item.areas.map((area) => area.id)))];
const routes = [
  { type: 'home' },
  { type: 'guide' },
  { type: 'about' },
  { type: 'privacy' },
  ...schedule.collections.map((item) => ({ type: 'collection', id: item.id })),
  ...areaIds.map((id) => ({ type: 'area', id })),
];

for (const route of routes) {
  const details = pageDetails(schedule, route);
  const pageUrl = `${site.siteUrl}${details.path}`;
  const html = template
    .replace('<!--app-html-->', serverEntry.render(schedule, route))
    .replace('<!--data-json-->', dataJson)
    .replace('<!--route-json-->', JSON.stringify(route))
    .replace('<!--structured-data-->', `<script type="application/ld+json">${structuredData(schedule, route, details)}</script>`)
    .replace('<!--adsense-head-->', adsenseHead)
    .replaceAll('__PAGE_TITLE__', escapeAttribute(details.title))
    .replaceAll('__PAGE_DESCRIPTION__', escapeAttribute(details.description))
    .replaceAll('__PAGE_URL__', pageUrl)
    .replaceAll('__SITE_NAME__', escapeAttribute(site.name))
    .replaceAll('__SOCIAL_IMAGE_URL__', `${site.siteUrl}/og.png`)
    .replaceAll('__SOCIAL_IMAGE_ALT__', escapeAttribute(site.seo.socialImageAlt));
  const output = details.path === '/' ? resolve(outputDir, 'index.html') : resolve(outputDir, `.${details.path}index.html`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html);
}

const lastModified = schedule.generatedAt.slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => {
  const details = pageDetails(schedule, route);
  return `  <url><loc>${site.siteUrl}${details.path}</loc><lastmod>${lastModified}</lastmod></url>`;
}).join('\n')}\n</urlset>\n`;
await writeFile(resolve(outputDir, 'sitemap.xml'), sitemap);
await writeFile(resolve(outputDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
if (adsenseClient) {
  const publisherId = adsenseClient.replace(/^ca-/, '');
  await writeFile(resolve(outputDir, 'ads.txt'), `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`);
}
await rm(serverDir, { recursive: true, force: true });
console.log(`[${siteId}] Pre-rendered ${routes.length} indexable pages to dist/${siteId}.`);
