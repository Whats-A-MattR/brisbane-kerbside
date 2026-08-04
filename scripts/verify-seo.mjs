import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { appDir, assertRegisteredSite, selectedSiteId } from './lib/site-registry.mjs';

const siteId = selectedSiteId();
await assertRegisteredSite(siteId);
const site = JSON.parse(await readFile(resolve(appDir, 'sites', siteId, 'site.json'), 'utf8'));
const distDir = resolve(appDir, 'dist', siteId);

function assert(condition, message) {
  if (!condition) throw new Error(`[${siteId}] SEO verification failed: ${message}`);
}

const sitemap = await readFile(resolve(distDir, 'sitemap.xml'), 'utf8');
const robots = await readFile(resolve(distDir, 'robots.txt'), 'utf8');
const image = await readFile(resolve(distDir, 'og.png'));
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'sitemap is not UTF-8 XML');
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'sitemap protocol namespace is missing');
assert(urls.length > 0, 'sitemap contains no URLs');
assert(new Set(urls).size === urls.length, 'sitemap contains duplicate URLs');
assert(urls.includes(`${site.siteUrl}/guide/`), 'guide page is missing from the sitemap');
assert(urls.includes(`${site.siteUrl}/about/`), 'about page is missing from the sitemap');
assert(robots.includes(`Sitemap: ${site.siteUrl}/sitemap.xml`), 'robots.txt does not advertise the sitemap');
assert(image.toString('ascii', 1, 4) === 'PNG', 'social card is not a PNG');
assert(image.readUInt32BE(16) === 1200 && image.readUInt32BE(20) === 630, 'social card must be 1200x630');

for (const url of urls) {
  assert(url.startsWith(`${site.siteUrl}/`), `non-canonical URL in sitemap: ${url}`);
  const pathname = new URL(url).pathname;
  const output = pathname === '/' ? resolve(distDir, 'index.html') : resolve(distDir, `.${pathname}index.html`);
  const html = await readFile(output, 'utf8');
  assert(html.includes(`<link rel="canonical" href="${url}"`), `canonical mismatch for ${url}`);
  assert(html.includes(`<meta property="og:image" content="${site.siteUrl}/og.png"`), `Open Graph card missing for ${url}`);
  assert(html.includes('<meta name="twitter:card" content="summary_large_image"'), `Twitter card missing for ${url}`);
  assert(!html.includes('__PAGE_') && !html.includes('__SITE_') && !html.includes('__SOCIAL_') && !html.includes('<!--app-html-->'), `unreplaced template marker in ${url}`);
}

for (const page of ['guide', 'about']) {
  const html = await readFile(resolve(distDir, page, 'index.html'), 'utf8');
  const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script id="kerbside-schedule"/)?.[1] ?? '';
  const words = root.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').trim().split(/\s+/).filter(Boolean);
  assert(words.length >= 350, `${page} page has only ${words.length} pre-rendered words`);
}

console.log(`[${siteId}] Verified sitemap, canonicals and social cards for ${urls.length} pages.`);
