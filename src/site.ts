import siteConfig from '@site/config';

export { siteConfig };

export const REPOSITORY_URL = siteConfig.links.repository;
export const SPONSOR_URL = siteConfig.links.sponsor;
export const KO_FI_URL = siteConfig.links.kofi;
export const COUNCIL_CALENDAR_URL = siteConfig.links.officialCalendar;
export const ACCEPTED_ITEMS_URL = siteConfig.links.acceptedItems;
export const DIRECTORY_URL = siteConfig.links.directory;

export function areaPath(id: string) {
  return sitePath(`/${siteConfig.area.routeSegment}/${id}/`);
}

export function sitePath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
