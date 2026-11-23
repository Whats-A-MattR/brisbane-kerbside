import notificationSites from './sites.generated.json';

interface Env {
  DB: D1Database;
  PLUNK_API_KEY: string;
  PLUNK_MARKETING_TEMPLATE_ID: string;
  EVENTS_JSON?: string;
}

type Site = {
  id: string;
  name: string;
  placeName: string;
  serviceName: string;
  siteUrl: string;
  scheduleUrl: string;
  fromEmail: string;
  locale: string;
  timeZone: string;
  state: string;
  collectionLeadDays: number;
  itemsOutLeadDays: number;
};
type AreaEvent = { id: string; siteId: string; title: string; date: string; url?: string; suburbs?: string[]; postcodes?: string[]; state?: string; daysBefore?: number; sponsorOffer?: { name: string; title: string; url: string } };
type Contact = { id: string; email: string; subscribed: boolean; data?: Record<string, unknown> };
type ContactPage = { data: Contact[]; cursor?: string; hasMore: boolean };

const API = 'https://next-api.useplunk.com';
const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const httpsUrl = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Email links must use HTTPS.');
  return esc(url.toString());
};

function localToday(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function daysBetween(today: string, date: string) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

async function plunk<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${env.PLUNK_API_KEY}`, ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`Plunk API returned ${response.status} for ${path.split('?')[0]}`);
  return response.json() as Promise<T>;
}

async function contacts(env: Env) {
  const found: Contact[] = [];
  let cursor = '';
  for (let page = 0; page < 1000; page++) {
    const query = new URLSearchParams({ limit: '100', subscribed: 'true' });
    if (cursor) query.set('cursor', cursor);
    const response = await plunk<ContactPage>(env, `/contacts?${query}`);
    if (!Array.isArray(response.data)) throw new Error('Plunk returned an invalid contact page.');
    found.push(...response.data);
    if (!response.hasMore || !response.cursor) return found;
    cursor = response.cursor;
  }
  throw new Error('Plunk contact pagination exceeded the safety limit.');
}

function matches(contact: Contact, site: Site) {
  const data = contact.data ?? {};
  if (String(data.siteId ?? '') !== site.id) return false;
  const contactState = String(data.state ?? '').trim().toUpperCase();
  if (contactState !== site.state.toUpperCase()) return false;
  return Boolean(data.suburb && /^\d{4}$/.test(String(data.postcode ?? '')));
}

function eventMatches(contact: Contact, event: AreaEvent) {
  const suburb = String(contact.data?.suburb ?? '').trim().toLocaleLowerCase();
  const postcode = String(contact.data?.postcode ?? '').trim();
  const state = String(contact.data?.state ?? '').trim().toUpperCase();
  if (event.state && event.state.toUpperCase() !== state) return false;
  return Boolean(event.suburbs?.some((name) => name.toLocaleLowerCase() === suburb) || event.postcodes?.includes(postcode));
}

function escapeContactEvent(contact: Contact, site: Site, event: AreaEvent) {
  const title = esc(event.title);
  const suburb = esc(String(contact.data?.suburb ?? 'your area'));
  const name = esc(String(contact.data?.firstName ?? 'there'));
  const date = new Date(`${event.date}T12:00:00Z`).toLocaleDateString(site.locale, { timeZone: site.timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const url = httpsUrl(event.url ?? `${site.siteUrl}/`);
  const subject = `${event.title} near ${String(contact.data?.suburb ?? 'you')}`;
  const offer = event.sponsorOffer ? `<p>Local offer from ${esc(event.sponsorOffer.name)}: <a href="${httpsUrl(event.sponsorOffer.url)}">${esc(event.sponsorOffer.title)}</a></p>` : '';
  const body = `<p>Hi ${name},</p><p>${title} is coming up near ${suburb} on <strong>${esc(date)}</strong>.</p><p><a href="${url}">See local details</a></p>${offer}<p>You’re receiving this because you opted in to ${esc(site.name)} area updates.</p>`;
  return { subject, body };
}

async function notify(env: Env, site: Site, contact: Contact, event: AreaEvent, detail: string) {
  const rawKey = `${site.id}:${contact.id}:${event.id}`;
  const key = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))))
    .map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const { subject, body } = escapeContactEvent(contact, site, event);
  const withDetail = detail ? body.replace('<p><a href=', `<p>${esc(detail)}</p><p><a href=`) : body;
  const now = new Date().toISOString();
  const reserved = await env.DB.prepare(`INSERT OR IGNORE INTO sent_notifications (notification_key, status, updated_at)
    VALUES (?, 'pending', ?)`).bind(key, now).run();
  if (!reserved.meta.changes) return false;

  try {
    const response = await fetch(`${API}/v1/send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.PLUNK_API_KEY}`, 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({ to: contact.email, from: { name: site.name, email: site.fromEmail }, template: env.PLUNK_MARKETING_TEMPLATE_ID, subject, body: withDetail }),
    });
    if (response.status === 409) {
      const duplicate = await response.json() as { error?: { code?: string; details?: { originalStatusCode?: number } } };
      if (duplicate.error?.code !== 'IDEMPOTENCY_KEY_REUSED' || duplicate.error.details?.originalStatusCode !== 200) {
        throw new Error('Plunk rejected the idempotency key without a confirmed earlier send.');
      }
    } else if (!response.ok) {
      throw new Error(`Plunk send returned ${response.status}`);
    }
    await env.DB.prepare("UPDATE sent_notifications SET status = 'sent', updated_at = ? WHERE notification_key = ?").bind(new Date().toISOString(), key).run();
    return true;
  } catch (error) {
    // A network error may occur after Plunk accepted the send. Keep the reservation
    // until its outcome is reconciled so a later run cannot duplicate the email.
    console.error('Notification outcome needs reconciliation', { key, siteId: site.id, eventId: event.id, error });
    throw error;
  }
}

async function process(env: Env) {
  if (!env.PLUNK_API_KEY || !env.PLUNK_MARKETING_TEMPLATE_ID) throw new Error('Missing Plunk API key or marketing template ID.');
  const sites: Site[] = notificationSites;
  if (!sites.length) throw new Error('No enabled council sites in notification metadata.');
  const events = env.EVENTS_JSON ? JSON.parse(env.EVENTS_JSON) as AreaEvent[] : [];
  const [subscribers, scheduleResponses] = await Promise.all([
    contacts(env),
    Promise.all(sites.map((site) => fetch(site.scheduleUrl, { cf: { cacheTtl: 0 } }))),
  ]);
  let sent = 0;

  for (const [index, site] of sites.entries()) {
    const response = scheduleResponses[index];
    if (!response.ok) throw new Error(`[${site.id}] Schedule fetch returned ${response.status}.`);
    const schedule = await response.json() as { collections?: Array<{ id: string; startsOn: string; putOutFrom?: string; areas: Array<{ name: string }> }> };
    const today = localToday(site.timeZone);
    const collectionEvents: AreaEvent[] = (schedule.collections ?? []).flatMap((collection) => [
      { id: `${collection.id}:collection`, siteId: site.id, title: `${site.placeName} ${site.serviceName} starts`, date: collection.startsOn, suburbs: collection.areas.map((area) => area.name), daysBefore: site.collectionLeadDays },
      ...(collection.putOutFrom ? [{ id: `${collection.id}:items-out`, siteId: site.id, title: `Items can go out for ${site.serviceName}`, date: collection.putOutFrom, suburbs: collection.areas.map((area) => area.name), daysBefore: site.itemsOutLeadDays }] : []),
    ]);
    const siteEvents = [...collectionEvents, ...events.filter((event) => event.siteId === site.id).map((event) => ({ ...event, daysBefore: event.daysBefore ?? 7 }))];
    for (const contact of subscribers) {
      if (!contact.subscribed || !contact.email || !matches(contact, site)) continue;
      for (const event of siteEvents) {
        if (daysBetween(today, event.date) !== event.daysBefore || !eventMatches(contact, event)) continue;
        const detail = event.id.endsWith(':items-out') ? 'Items can go out from the weekend before the collection starts.' : '';
        if (await notify(env, site, contact, event, detail)) sent++;
      }
    }
  }
  console.log(`Daily notification run checked ${subscribers.length} Plunk contacts and sent ${sent} local updates.`);
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(process(env));
  },
};
