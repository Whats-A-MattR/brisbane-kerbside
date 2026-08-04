const brisbaneDate = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Australia/Brisbane',
});

const brisbaneWeekday = new Intl.DateTimeFormat('en-AU', {
  weekday: 'short',
  timeZone: 'Australia/Brisbane',
});

const brisbaneDay = new Intl.DateTimeFormat('en-AU', {
  day: '2-digit',
  timeZone: 'Australia/Brisbane',
});

function parseDate(value: string) {
  return new Date(`${value}T00:00:00+10:00`);
}

export function formatCollectionDate(value: string) {
  const date = parseDate(value);
  return {
    weekday: brisbaneWeekday.format(date),
    day: brisbaneDay.format(date),
    label: brisbaneDate.format(date),
  };
}

export function formatGeneratedAt(value: string) {
  return brisbaneDate.format(new Date(value));
}
