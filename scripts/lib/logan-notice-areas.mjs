import { readFile } from 'node:fs/promises';

const noticeUrl = new URL('../../sites/logan/storm-notice.json', import.meta.url);

export async function withLoganNoticeAreas(siteId, schedule) {
  if (siteId !== 'logan') return schedule;
  const notice = JSON.parse(await readFile(noticeUrl, 'utf8'));
  if (!['advisory', 'delayed'].includes(notice.status) || !notice.areaIds.length) return schedule;
  const directory = new Map((schedule.areaDirectory ?? []).map((area) => [area.id, area]));
  for (const collection of schedule.collections) {
    for (const area of collection.areas) {
      if (!directory.has(area.id)) directory.set(area.id, { ...area, nextCollectionId: collection.id });
    }
  }
  // Carry identity, not a past collection or a claim it occurred.
  for (const [i, id] of notice.areaIds.entries()) {
    if (!directory.has(id) && notice.areaNames[i]) directory.set(id, { id, name: notice.areaNames[i] });
  }
  return { ...schedule, areaDirectory: [...directory.values()] };
}
