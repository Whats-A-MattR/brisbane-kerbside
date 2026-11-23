import notificationSites from '../../workers/sites.generated.json';

interface Env {
  PLUNK_API_KEY: string;
  SITE_ID?: string;
  ALLOWED_ORIGIN?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequestPost({ request, env }: PagesContext) {
  const origin = request.headers.get('origin');
  const allowedOrigin = env.ALLOWED_ORIGIN ?? new URL(request.url).origin;
  if (origin && origin !== allowedOrigin) return json({ error: 'Request origin is not allowed.' }, 403);
  if (!env.PLUNK_API_KEY) return json({ error: 'Subscriptions are temporarily unavailable.' }, 503);

  let input: Record<string, unknown>;
  try {
    const body = await request.text();
    if (body.length > 4096) return json({ error: 'Please check the form and try again.' }, 413);
    input = JSON.parse(body) as Record<string, unknown>;
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid form');
  } catch {
    return json({ error: 'Please check the form and try again.' }, 400);
  }

  const siteId = typeof input.siteId === 'string' ? input.siteId.trim() : '';
  const site = notificationSites.find((item) => item.id === siteId);
  const allowedSite = env.SITE_ID === 'master' ? Boolean(site) : siteId === env.SITE_ID;
  const firstName = typeof input.firstName === 'string' ? input.firstName.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const suburb = typeof input.suburb === 'string' ? input.suburb.trim() : '';
  const postcode = typeof input.postcode === 'string' ? input.postcode.trim() : '';
  const state = typeof input.state === 'string' ? input.state.trim().toUpperCase() : '';
  if (!site || !allowedSite || input.consent !== 'true' || !firstName || firstName.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !suburb || suburb.length > 100 || !/^\d{4}$/.test(postcode) || state !== site.state) {
    return json({ error: 'Please complete each field and confirm you want local email updates.' }, 400);
  }

  try {
    const scheduleResponse = await fetch(site.scheduleUrl);
    if (!scheduleResponse.ok) return json({ error: 'We could not verify your area right now. Please try again shortly.' }, 503);
    const schedule = await scheduleResponse.json() as { areaDirectory?: { name: string }[]; collections?: { areas?: { name: string }[] }[] };
    const knownAreas = new Set([
      ...(schedule.areaDirectory ?? []).map((area) => area.name.toLocaleLowerCase()),
      ...(schedule.collections ?? []).flatMap((collection) => (collection.areas ?? []).map((area) => area.name.toLocaleLowerCase())),
    ]);
    if (!knownAreas.has(suburb.toLocaleLowerCase())) return json({ error: 'Please choose an area in the selected council schedule.' }, 400);
  } catch {
    return json({ error: 'We could not verify your area right now. Please try again shortly.' }, 503);
  }

  try {
    const response = await fetch('https://next-api.useplunk.com/contacts', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.PLUNK_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        subscribed: true,
        data: { firstName, suburb, postcode, state, siteId, consentAt: new Date().toISOString(), signupSource: input.signupSource === 'master-directory' ? 'master-directory' : siteId },
      }),
    });
    if (!response.ok) {
      console.error('Plunk contact upsert failed', response.status);
      return json({ error: 'We could not save your subscription right now. Please try again shortly.' }, 502);
    }
    return json({ ok: true }, 201);
  } catch {
    return json({ error: 'We could not reach the subscription service. Please try again shortly.' }, 502);
  }
}
