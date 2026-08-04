# Adding a council

A council is suitable when it runs a kerbside or hard-waste service and exposes a stable public schedule with enough geographic information to map its service areas. Prefer an official API or downloadable dataset with a clear reuse licence. A page that only supports address-by-address lookups may require permission before automation.

## 1. Create the site package

Copy the shape—not the Brisbane wording—of `sites/brisbane/` into `sites/<site-id>/`:

```text
sites/<site-id>/
  site.json
  config.ts
  EditorialPages.tsx
  etl.mjs
  public/
    _headers
    favicon.svg
    favicon-32.png
    apple-touch-icon.png
    og.png
    site.webmanifest
    data/
```

`site.json` controls the domain, locale, timezone, terminology, map view, official links, service rules, analytics default and homepage SEO. The editorial component contains the locally accurate guide, methodology, eligibility rules and privacy copy. Assets should be recognisably local while keeping the shared interface usable.

## 2. Translate the source

`etl.mjs` must export:

- `extract()` — fetch or read the council's official source.
- `transform(raw)` — return `{ schedule, areas }` in shared schema v1.

Do not leak source-specific field names beyond this adapter. Use stable slug IDs for areas. Include only dates the site should publish, sort collections by `startsOn`, and attach matching geometry to every scheduled area. The common runner validates the result before writing anything.

Run:

```sh
KERBSIDE_SITE=<site-id> pnpm data:update
KERBSIDE_SITE=<site-id> pnpm build
```

## 3. Register the output

Add an entry to `sites/registry.json`:

```json
{
  "id": "example",
  "kind": "council",
  "label": "Example City Council",
  "cloudflareProject": "example-kerbside",
  "githubEnvironment": "example",
  "analyticsEnabled": false,
  "adsEnabled": false
}
```

Create the matching Cloudflare Pages project and GitHub environment. Add the custom domain in Cloudflare, then set any council-specific GA4 and AdSense variables in that GitHub environment. Shared Cloudflare credentials remain repository secrets.

Leave analytics and ads disabled for the first deployment. Enable them only after the new domain has its own GA4 stream, privacy/consent setup and AdSense approval; these flags prevent repository-level Brisbane identifiers from being reused accidentally.

The deployment workflow reads the registry automatically; there is no second deploy matrix to edit. The master directory also discovers every `kind: council` entry at build time, adds it to suburb/council search, and creates `/councils/<site-id>/` automatically.

## On-demand councils without a dedicated site

If a council offers a booked service but does not publish reusable collection dates, add a verified entry to `sites/master/data/booking-councils.json` instead of inventing a schedule or a deploy target. Each entry records the official service, booking, item-guidance and suburb-coverage URLs together with concise local service details.

The master build creates a council overview and one answer-focused page per verified suburb. Those pages must describe the service as on demand, make property eligibility conditional on the official address check and link directly to Council. The verifier rejects an on-demand entry if it contains generated collection dates.

## 4. Launch deliberately

Before enabling the registry entry, verify:

- the council permits reuse and attribution is correct;
- collection dates, put-out dates and boundaries match official samples;
- editorial rules describe that council, not Brisbane;
- icons, social card, manifest, canonical URLs and sitemap use the new identity;
- privacy, consent, analytics and advertising are configured for the new domain;
- Search Console has the domain property and sitemap;
- the council's Pages project has the custom domain and redirects you want.

Start with one new council at a time. Source reliability and locally accurate content matter more than the number of generated domains.
