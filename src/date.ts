import { siteConfig } from './site';

const collectionDate = new Intl.DateTimeFormat(siteConfig.locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: siteConfig.timeZone,
});

const collectionWeekday = new Intl.DateTimeFormat(siteConfig.locale, {
  weekday: 'short',
  timeZone: siteConfig.timeZone,
});

const collectionDay = new Intl.DateTimeFormat(siteConfig.locale, {
  day: '2-digit',
  timeZone: siteConfig.timeZone,
});

function parseDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

export function formatCollectionDate(value: string) {
  const date = parseDate(value);
  return {
    weekday: collectionWeekday.format(date),
    day: collectionDay.format(date),
    label: collectionDate.format(date),
  };
}

export function formatGeneratedAt(value: string) {
  return collectionDate.format(new Date(value));
}
