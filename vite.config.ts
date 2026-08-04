import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SiteConfig } from './src/site-config';

const siteId = process.env.KERBSIDE_SITE?.trim() || 'brisbane';
const siteDir = resolve(process.cwd(), 'sites', siteId);
const siteConfig = JSON.parse(readFileSync(resolve(siteDir, 'site.json'), 'utf8')) as SiteConfig;

function routeFromPath(path: string) {
  if (/^\/guide\/?(?:[?#]|$)/.test(path)) return { type: 'guide' };
  if (/^\/about\/?(?:[?#]|$)/.test(path)) return { type: 'about' };
  if (/^\/privacy\/?(?:[?#]|$)/.test(path)) return { type: 'privacy' };

  const collection = path.match(/^\/collections\/([^/]+)/);
  if (collection) return { type: 'collection', id: collection[1] };

  const area = path.match(new RegExp(`^/${siteConfig.area.routeSegment}/([^/]+)`));
  if (area) return { type: 'area', id: area[1] };

  return { type: 'home' };
}

const developmentData = {
  name: 'development-data',
  transformIndexHtml(html: string, context: { server?: unknown; path: string; originalUrl?: string }) {
    if (!context.server) return html;

    const schedule = JSON.parse(readFileSync(resolve(siteDir, 'public/data/schedule.json'), 'utf8'));
    const requestedPath = context.originalUrl ?? context.path;

    return html
      .replace('<!--data-json-->', JSON.stringify(schedule).replaceAll('<', '\\u003c'))
      .replace('<!--route-json-->', JSON.stringify(routeFromPath(requestedPath)))
      .replaceAll('__PAGE_TITLE__', siteConfig.seo.homeTitle)
      .replaceAll('__PAGE_DESCRIPTION__', siteConfig.seo.homeDescription)
      .replaceAll('__PAGE_URL__', `http://localhost:5173${requestedPath}`)
      .replaceAll('__SITE_NAME__', siteConfig.name)
      .replaceAll('__SOCIAL_IMAGE_URL__', `${siteConfig.siteUrl}/og.png`)
      .replaceAll('__SOCIAL_IMAGE_ALT__', siteConfig.seo.socialImageAlt);
  },
};

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  publicDir: resolve(siteDir, 'public'),
  resolve: {
    alias: {
      '@site/config': resolve(siteDir, 'config.ts'),
      '@site/editorial-pages': resolve(siteDir, 'EditorialPages.tsx'),
    },
  },
  plugins: [react(), developmentData],
  build: {
    target: 'es2022',
  },
});
