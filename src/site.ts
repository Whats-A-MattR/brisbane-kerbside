export const REPOSITORY_URL = 'https://github.com/Whats-A-MattR/brisbane-kerbside';
export const SPONSOR_URL = 'https://github.com/sponsors/Whats-A-MattR';
export const COUNCIL_CALENDAR_URL = 'https://www.brisbane.qld.gov.au/bins-waste-and-recycling/kerbside-collection/kerbside-collection-calendar';
export const ACCEPTED_ITEMS_URL = 'https://www.brisbane.qld.gov.au/bins-waste-and-recycling/kerbside-collection/acceptable-kerbside-collection-items';

export function sitePath(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}
