import config from './site.json';
import type { SiteConfig } from '../../src/site-config';

export default {
  ...config,
  map: { ...config.map, center: config.map.center as [number, number] },
} satisfies SiteConfig;
