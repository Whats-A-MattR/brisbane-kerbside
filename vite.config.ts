import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function routeFromPath(path: string) {
  if (/^\/privacy\/?(?:[?#]|$)/.test(path)) return { type: 'privacy' };

  const collection = path.match(/^\/collections\/([^/]+)/);
  if (collection) return { type: 'collection', id: collection[1] };

  const suburb = path.match(/^\/suburbs\/([^/]+)/);
  if (suburb) return { type: 'suburb', id: suburb[1] };

  return { type: 'home' };
}

const developmentData = {
  name: 'development-data',
  transformIndexHtml(html: string, context: { server?: unknown; path: string; originalUrl?: string }) {
    if (!context.server) return html;

    const schedule = JSON.parse(
      readFileSync(resolve(process.cwd(), 'public/data/schedule.json'), 'utf8'),
    );
    const description =
      'Find upcoming Brisbane kerbside large-item collection dates and suburb areas.';
    const requestedPath = context.originalUrl ?? context.path;

    return html
      .replace('<!--data-json-->', JSON.stringify(schedule).replaceAll('<', '\\u003c'))
      .replace('<!--route-json-->', JSON.stringify(routeFromPath(requestedPath)))
      .replaceAll('__PAGE_TITLE__', 'Brisbane kerbside collection dates and suburb map')
      .replaceAll('__PAGE_DESCRIPTION__', description)
      .replaceAll('__PAGE_URL__', `http://localhost:5173${requestedPath}`);
  },
};

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), developmentData],
  build: {
    target: 'es2022',
  },
});
