import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { appDir } from './lib/site-registry.mjs';
import { masterData } from './lib/master-data.mjs';

const site = JSON.parse(await readFile(resolve(appDir, 'sites/master/site.json'), 'utf8'));
const outputDir = resolve(appDir, 'dist/master');
const serverDir = resolve(outputDir, 'server');
const data = await masterData();

function run(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('vite', args, { cwd: appDir, env: process.env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`vite exited with code ${code}`)));
  });
}

function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function pageDetails(route) {
  if (route.type === 'councils') return {
    path: '/councils/',
    title: `Australian kerbside collection council directory | ${site.name}`,
    description: 'Browse supported council kerbside collection sites with upcoming dates, local maps and links to official council resources.',
  };
  if (route.type === 'council') {
    const council = data.councils.find((item) => item.id === route.id);
    if (council.serviceModel !== 'scheduled') return {
      path: `/councils/${route.id}/`,
      title: `${council.placeName} kerbside collection booking | ${site.name}`,
      description: `How to book ${council.placeName} kerbside collection, including eligibility, frequency, item limits, searchable suburbs and official ${council.councilName} links.`,
    };
    return {
      path: `/councils/${route.id}/`,
      title: `${council.placeName} kerbside collection dates | ${site.name}`,
      description: `Find ${council.placeName} ${council.serviceName} dates, searchable ${council.areaLabel}, local guidance and official ${council.councilName} resources.`,
    };
  }
  if (route.type === 'area') {
    const council = data.councils.find((item) => item.id === route.councilId);
    const area = council.areaDetails.find((item) => item.id === route.id);
    if (council.serviceModel !== 'scheduled') return {
      path: `/councils/${council.id}/suburbs/${area.id}/`,
      title: `${area.name} kerbside collection booking | ${council.placeName}`,
      description: `How to book a kerbside collection in ${area.name}: check ${council.councilName} eligibility, service frequency, item limits and the official booking link.`,
    };
    const collection = council.collections.find((item) => area.collectionIds.includes(item.id));
    return {
      path: `/councils/${council.id}/suburbs/${area.id}/`,
      title: `${area.name} kerbside collection dates | ${council.placeName}`,
      description: `Find the next ${area.name} ${council.serviceName} date${collection ? ` from ${longDate(collection.startsOn)}` : ''}, then open the local map and official ${council.councilName} resources.`,
    };
  }
  if (route.type === 'collection') {
    const council = data.councils.find((item) => item.id === route.councilId);
    const collection = council.collections.find((item) => item.id === route.id);
    const names = collection.areas.map((item) => item.name);
    const areas = names.length > 6 ? `${names.slice(0, 6).join(', ')} and ${names.length - 6} more` : names.join(', ');
    return {
      path: `/councils/${council.id}/collections/${collection.id}/`,
      title: `${council.placeName} collection starting ${longDate(collection.startsOn)} | ${site.name}`,
      description: `${council.placeName} ${council.serviceName} starting ${longDate(collection.startsOn)}: ${areas}. Browse included suburbs and open the local map.`,
    };
  }
  if (route.type === 'about') return {
    path: '/about/',
    title: `About, sources and methodology | ${site.name}`,
    description: `How ${site.name} turns public council schedules into fast, local, independently maintained collection finders.`,
  };
  if (route.type === 'privacy') return {
    path: '/privacy/',
    title: `Privacy and browser location | ${site.name}`,
    description: `How ${site.name} handles an optional browser location suggestion and a locally saved council choice.`,
  };
  return {
    path: '/',
    title: `When's Kerbside? Find council collection dates`,
    description: site.description,
  };
}

function longDate(value) {
  return new Intl.DateTimeFormat(site.locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: site.timeZone,
  }).format(new Date(`${value}T12:00:00Z`));
}

function bookingFaq(council, areaName) {
  const place = areaName ?? council.placeName;
  const details = council.serviceDetails;
  return [
    {
      question: `Does ${place} have kerbside collection?`,
      answer: areaName
        ? `Yes. ${areaName} is listed within the ${council.councilName} area, where Council offers ${council.serviceName} to eligible properties. It is booked on demand, so there is no single public date for the whole suburb. Confirm the property address before relying on the service.`
        : `Yes. ${council.councilName} offers ${council.serviceName} to eligible properties. It is booked on demand, so there is no single public date for the whole council area. Confirm the property address before relying on the service.`,
    },
    {
      question: `How do I book a kerbside collection in ${place}?`,
      answer: `Use the official ${council.councilName} booking or eligibility link. Council's system confirms the property, remaining entitlement and available collection timing.`,
    },
    { question: 'How often can I book?', answer: details.frequency },
    { question: 'How much can I put out?', answer: details.allowance },
    { question: 'When should I put items on the kerb?', answer: details.timing },
    { question: 'What items does Council accept?', answer: details.items },
  ];
}

function structuredData(route, details) {
  const graph = [
    {
      '@type': 'WebSite', '@id': `${site.siteUrl}/#website`, url: `${site.siteUrl}/`,
      name: site.name, description: site.description, inLanguage: site.locale,
      potentialAction: { '@type': 'SearchAction', target: `${site.siteUrl}/?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
    },
    {
      '@type': 'WebPage', '@id': `${site.siteUrl}${details.path}#page`, url: `${site.siteUrl}${details.path}`,
      name: details.title, description: details.description, isPartOf: { '@id': `${site.siteUrl}/#website` },
      dateModified: data.generatedAt, inLanguage: site.locale,
    },
  ];
  if (route.type === 'home' || route.type === 'councils') {
    graph.push({
      '@type': 'ItemList', name: 'Supported kerbside collection councils',
      numberOfItems: data.councils.length,
      itemListElement: data.councils.map((council, index) => ({
        '@type': 'ListItem', position: index + 1, name: council.councilName,
        url: `${site.siteUrl}/councils/${council.id}/`,
      })),
    });
  }
  if (route.type === 'council') {
    const council = data.councils.find((item) => item.id === route.id);
    graph.push({
      '@type': 'ItemList', name: `${council.placeName} kerbside collection suburbs`,
      numberOfItems: council.areaDetails.length,
      itemListElement: council.areaDetails.map((area, index) => ({
        '@type': 'ListItem', position: index + 1, name: area.name,
        url: `${site.siteUrl}/councils/${council.id}/suburbs/${area.id}/`,
      })),
    });
  }
  if (route.type === 'council' || route.type === 'area') {
    const councilId = route.type === 'council' ? route.id : route.councilId;
    const council = data.councils.find((item) => item.id === councilId);
    if (council.serviceModel !== 'scheduled') {
      const area = route.type === 'area' ? council.areaDetails.find((item) => item.id === route.id) : null;
      graph.push({
        '@type': 'FAQPage',
        mainEntity: bookingFaq(council, area?.name).map((item) => ({
          '@type': 'Question', name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      });
    }
  }
  if (route.type === 'collection') {
    const council = data.councils.find((item) => item.id === route.councilId);
    const collection = council.collections.find((item) => item.id === route.id);
    graph.push({
      '@type': 'ItemList', name: `${council.placeName} collection areas for ${longDate(collection.startsOn)}`,
      numberOfItems: collection.areas.length,
      itemListElement: collection.areas.map((area, index) => ({
        '@type': 'ListItem', position: index + 1, name: area.name,
        url: `${site.siteUrl}/councils/${council.id}/suburbs/${area.id}/`,
      })),
    });
  }
  if (route.type === 'council' || route.type === 'area' || route.type === 'collection') {
    const councilId = route.type === 'council' ? route.id : route.councilId;
    const council = data.councils.find((item) => item.id === councilId);
    const items = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Councils', item: `${site.siteUrl}/councils/` },
      { '@type': 'ListItem', position: 3, name: council.placeName, item: `${site.siteUrl}/councils/${council.id}/` },
    ];
    if (route.type === 'area') {
      const area = council.areaDetails.find((item) => item.id === route.id);
      items.push({ '@type': 'ListItem', position: 4, name: area.name, item: `${site.siteUrl}/councils/${council.id}/suburbs/${area.id}/` });
    }
    if (route.type === 'collection') {
      const collection = council.collections.find((item) => item.id === route.id);
      items.push({ '@type': 'ListItem', position: 4, name: longDate(collection.startsOn), item: `${site.siteUrl}/councils/${council.id}/collections/${collection.id}/` });
    }
    graph.push({ '@type': 'BreadcrumbList', itemListElement: items });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
}

await rm(outputDir, { recursive: true, force: true });
await run(['build', '--config', 'vite.master.config.ts', '--outDir', outputDir, '--emptyOutDir']);
await run(['build', '--config', 'vite.master.config.ts', '--ssr', 'src/entry-server.tsx', '--outDir', serverDir, '--emptyOutDir', 'false']);

const serverEntry = await import(`${pathToFileURL(resolve(serverDir, 'entry-server.js')).href}?${Date.now()}`);
const template = await readFile(resolve(outputDir, 'index.html'), 'utf8');
const dataJson = JSON.stringify(data).replaceAll('<', '\\u003c');
const routes = [
  { type: 'home' },
  { type: 'councils' },
  ...data.councils.map((council) => ({ type: 'council', id: council.id })),
  ...data.councils.flatMap((council) => council.areaDetails.map((area) => ({ type: 'area', councilId: council.id, id: area.id }))),
  ...data.councils.flatMap((council) => council.collections.map((collection) => ({ type: 'collection', councilId: council.id, id: collection.id }))),
  { type: 'about' },
  { type: 'privacy' },
];

for (const route of routes) {
  const details = pageDetails(route);
  const url = `${site.siteUrl}${details.path}`;
  const html = template
    .replace('<!--app-html-->', serverEntry.render(data, route))
    .replace('<!--data-json-->', dataJson)
    .replace('<!--route-json-->', JSON.stringify(route))
    .replace('<!--structured-data-->', `<script type="application/ld+json">${structuredData(route, details)}</script>`)
    .replaceAll('__PAGE_TITLE__', escapeAttribute(details.title))
    .replaceAll('__PAGE_DESCRIPTION__', escapeAttribute(details.description))
    .replaceAll('__PAGE_URL__', url);
  const output = details.path === '/' ? resolve(outputDir, 'index.html') : resolve(outputDir, `.${details.path}index.html`);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html);
}

await mkdir(resolve(outputDir, 'data'), { recursive: true });
await writeFile(resolve(outputDir, 'data/councils.json'), `${JSON.stringify(data, null, 2)}\n`);
const lastModified = data.generatedAt.slice(0, 10);
await writeFile(resolve(outputDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${site.siteUrl}${pageDetails(route).path}</loc><lastmod>${lastModified}</lastmod></url>`).join('\n')}\n</urlset>\n`);
await writeFile(resolve(outputDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.siteUrl}/sitemap.xml\n`);
await rm(serverDir, { recursive: true, force: true });
console.log(`[master] Pre-rendered ${routes.length} directory pages for ${data.councils.length} councils.`);
