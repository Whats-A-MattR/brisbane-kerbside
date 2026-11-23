import noticeData from './storm-notice.json';

const notice = noticeData as {
  status: 'none' | 'advisory' | 'delayed';
  councilId: string;
  collectionId: string | null;
  areaIds: string[];
  areaNames: string[];
  originalEnd: string | null;
  checkedOn: string;
  source: string;
};

export function hasLoganStormNotice(councilId: string, collectionId?: string, areaId?: string) {
  if (councilId !== notice.councilId || notice.status === 'none') return false;
  if (collectionId === undefined && areaId === undefined) return true;
  return notice.status === 'delayed'
    && (collectionId === undefined || collectionId === notice.collectionId)
    && (areaId === undefined || notice.areaIds.includes(areaId));
}

export function hasLoganAreaAdvisory(councilId: string, areaId: string) {
  return councilId === notice.councilId && notice.status !== 'none' && notice.areaIds.includes(areaId);
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Brisbane',
  }).format(new Date(`${value}T12:00:00Z`));
}

export function LoganStormNotice({ className }: { className: string }) {
  const delayed = notice.status === 'delayed';
  return (
    <aside className={className} aria-label={delayed ? 'Storm delay' : 'Council advisory'}>
      <p>{delayed && notice.collectionId && notice.originalEnd ? (
        <><strong>Storm delay: {new Intl.ListFormat('en-AU').format(notice.areaNames)}.</strong> Logan City Council reported delays to the collection originally scheduled for {displayDate(notice.collectionId)} to {displayDate(notice.originalEnd)}. Check Council for current collection instructions.</>
      ) : (
        <><strong>Check Council for kerbside updates.</strong> The published dates do not confirm whether a weather interruption has ended.</>
      )}</p>
      <p><small>Source checked <time dateTime={notice.checkedOn}>{displayDate(notice.checkedOn)}</time>. </small><a href={notice.source}>Check Logan City Council ↗</a></p>
    </aside>
  );
}
