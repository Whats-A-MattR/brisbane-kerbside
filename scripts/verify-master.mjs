import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { appDir, councilSites } from './lib/site-registry.mjs';

const site = JSON.parse(await readFile(resolve(appDir, 'sites/master/site.json'), 'utf8'));
const distDir = resolve(appDir, 'dist/master');
const sitemap = await readFile(resolve(distDir, 'sitemap.xml'), 'utf8');
const robots = await readFile(resolve(distDir, 'robots.txt'), 'utf8');
const image = await readFile(resolve(distDir, 'og.png'));
const data = JSON.parse(await readFile(resolve(distDir, 'data/councils.json'), 'utf8'));
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

function assert(condition, message) {
  if (!condition) throw new Error(`[master] Verification failed: ${message}`);
}

const councils = await councilSites();
assert(data.councils.length === councils.length, 'directory data does not match the registered council count');
assert(urls.length === councils.length + 4, 'sitemap does not contain every master route');
assert(new Set(urls).size === urls.length, 'sitemap contains duplicate URLs');
assert(robots.includes(`Sitemap: ${site.siteUrl}/sitemap.xml`), 'robots.txt does not advertise the canonical sitemap');
assert(image.toString('ascii', 1, 4) === 'PNG', 'social card is not a PNG');
assert(image.readUInt32BE(16) === 1200 && image.readUInt32BE(20) === 630, 'social card must be 1200x630');

for (const entry of councils) {
  assert(urls.includes(`${site.siteUrl}/councils/${entry.id}/`), `missing static council page for ${entry.id}`);
}

for (const url of urls) {
  const pathname = new URL(url).pathname;
  const output = pathname === '/' ? resolve(distDir, 'index.html') : resolve(distDir, `.${pathname}index.html`);
  const html = await readFile(output, 'utf8');
  assert(html.includes(`<link rel="canonical" href="${url}"`), `canonical mismatch for ${url}`);
  assert(html.includes('<meta property="og:image" content="https://whenskerbside.com/og.png"'), `social card missing for ${url}`);
  assert(html.includes('<script type="application/ld+json">'), `structured data missing for ${url}`);
  assert(!html.includes('__PAGE_') && !html.includes('<!--app-html-->'), `unreplaced template marker in ${url}`);
  const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script id="master-data"/)?.[1] ?? '';
  assert(root.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length > 30, `page has too little pre-rendered content: ${url}`);
}

console.log(`[master] Verified ${urls.length} static routes, council discovery, canonicals and social card.`);
