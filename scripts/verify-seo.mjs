import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const APP_DIR = resolve(import.meta.dirname, '..');
const DIST_DIR = resolve(APP_DIR, 'dist');
const SITE_URL = 'https://brisbanekerbside.app';

function assert(condition, message) {
  if (!condition) throw new Error(`SEO verification failed: ${message}`);
}

const sitemap = await readFile(resolve(DIST_DIR, 'sitemap.xml'), 'utf8');
const robots = await readFile(resolve(DIST_DIR, 'robots.txt'), 'utf8');
const image = await readFile(resolve(DIST_DIR, 'og.png'));
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

assert(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'sitemap is not UTF-8 XML');
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'), 'sitemap protocol namespace is missing');
assert(urls.length > 0, 'sitemap contains no URLs');
assert(new Set(urls).size === urls.length, 'sitemap contains duplicate URLs');
assert(urls.includes(`${SITE_URL}/guide/`), 'guide page is missing from the sitemap');
assert(urls.includes(`${SITE_URL}/about/`), 'about page is missing from the sitemap');
assert(robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`), 'robots.txt does not advertise the sitemap');
assert(image.toString('ascii', 1, 4) === 'PNG', 'social card is not a PNG');
assert(image.readUInt32BE(16) === 1200 && image.readUInt32BE(20) === 630, 'social card must be 1200x630');

for (const url of urls) {
  assert(url.startsWith(`${SITE_URL}/`), `non-canonical URL in sitemap: ${url}`);
  const pathname = new URL(url).pathname;
  const output = pathname === '/' ? resolve(DIST_DIR, 'index.html') : resolve(DIST_DIR, `.${pathname}index.html`);
  const html = await readFile(output, 'utf8');
  assert(html.includes(`<link rel="canonical" href="${url}"`), `canonical mismatch for ${url}`);
  assert(html.includes('<meta property="og:image" content="https://brisbanekerbside.app/og.png"'), `Open Graph card missing for ${url}`);
  assert(html.includes('<meta name="twitter:card" content="summary_large_image"'), `Twitter card missing for ${url}`);
  assert(!html.includes('__PAGE_') && !html.includes('<!--app-html-->'), `unreplaced template marker in ${url}`);
}

for (const page of ['guide', 'about']) {
  const html = await readFile(resolve(DIST_DIR, page, 'index.html'), 'utf8');
  const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<script id="kerbside-schedule"/)?.[1] ?? '';
  const words = root.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ').trim().split(/\s+/).filter(Boolean);
  assert(words.length >= 350, `${page} page has only ${words.length} pre-rendered words`);
}

console.log(`Verified sitemap, canonicals and social cards for ${urls.length} pages.`);
