import notice from './storm-notice.json';

export function hasLoganStormNotice(councilId: string, collectionId?: string, areaId?: string) {
  return notice.active && councilId === notice.councilId
    && (collectionId === undefined || collectionId === notice.collectionId)
    && (areaId === undefined || notice.areaIds.includes(areaId));
}

export function LoganStormNotice({ className }: { className: string }) {
  return (
    <aside className={className} aria-label="Storm delay">
      <p><strong>Storm delay: Browns Plains and Regents Park.</strong> Logan City Council reported delays to the collection originally scheduled for 9–20 November. No restart date was listed when checked on <time dateTime={notice.checkedOn}>22 November 2026</time>.</p>
      <p><a href={notice.source}>Check Logan City Council’s severe weather notice for updates ↗</a></p>
    </aside>
  );
}
