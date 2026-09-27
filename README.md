# Kerbside Site Factory

This repository builds fast, council-specific kerbside collection sites from public data and a dynamic directory at [When's Kerbside?](https://whenskerbside.com). It currently packages [Brisbane Kerbside Collection Map](https://brisbanekerbside.app) and [Logan Kerbside Clean-up Map](https://logankerbside.app), plus source-backed directory pages for councils that use on-demand bookings instead of public suburb dates.

Each council keeps its own domain, content, branding, public assets, data adapter, analytics and Cloudflare Pages project. The React app, static renderer, schema validation and GitHub Actions machinery are shared.

## Architecture

```text
Council API or download
        ↓
sites/<council>/etl.mjs
        ↓
shared schedule schema + GeoJSON
        ↓
shared Vite/React app + council content/assets/config
        ↓
dist/<council> (fully pre-rendered)
        ↓
that council's Cloudflare Pages project and domain

sites/registry.json + every generated council schedule
        ↓
When's Kerbside directory, search and council overview pages
        ↓
dist/master → whenskerbside.com
```

The sites are statically rendered. An optional Cloudflare Pages Function handles email signup, and an optional scheduled Worker uses D1 to prevent repeat notices. The weekly data workflow refreshes every registered council and commits only the generated data. The deployment workflow reads the same registry and builds/deploys each site independently.

## Repository layout

- `src/` — shared React interface, map and schema types.
- `scripts/` — shared data runner, validation, static rendering and SEO checks.
- `sites/registry.json` — deployable council and directory sites and their Cloudflare targets.
- `sites/brisbane/` — Brisbane config, editorial content, source adapter and public assets.
- `sites/logan/` — Logan’s separate two-week schedule adapter, local content and assets.
- `sites/master/` — the master directory UI and assets. Scheduled council data is derived from the registry; verified on-demand service and suburb data lives in `sites/master/data/booking-councils.json`.
- `dist/<site-id>/` — generated static output; never committed.

The shared schedule contract is versioned with `schemaVersion: 1` and documented in [`schema/schedule.schema.json`](schema/schedule.schema.json). A collection has `startsOn`, optional `endsOn`, `putOutFrom` and a list of generic `areas`; areas can carry an honest coverage note when operational boundaries differ from official locality polygons. An optional top-level `areaDirectory` retains known areas when their latest collection has passed and their next date is not yet published. A council adapter is responsible for translating its source fields into that contract. GeoJSON features repeat the matching timing and area properties. Builds fail if schedule, directory and geometry records disagree.

## Local development

Requires Node.js 22 and pnpm 11.

```sh
pnpm install
pnpm data:update
pnpm dev
```

Brisbane is the default. To select a site explicitly:

```sh
KERBSIDE_SITE=brisbane pnpm dev
KERBSIDE_SITE=brisbane pnpm build
KERBSIDE_SITE=logan pnpm dev
KERBSIDE_SITE=logan pnpm build
pnpm dev:master
KERBSIDE_SITE=master pnpm build
```

`pnpm build` writes `dist/<selected-site>` and checks all pre-rendered routes, canonicals, sitemap entries and social cards. `pnpm data:update:all` refreshes scheduled council sources only; `pnpm build:all` builds every council plus the master directory. The master verifier also ensures on-demand entries never generate or imply a scheduled collection date.

Copy `.env.example` to `.env.local` only to test public analytics or advertising identifiers. API tokens and credentials must never use a `VITE_` variable or enter the repository.

## Local email updates

The Brisbane and Logan builds inject their own `UpdatesFormBuilder` into the shared council app. The form's heading, consent text and success copy live in each council's `site.json`; a site can replace `sites/<site-id>/UpdatesForm.tsx` to provide a different builder. The When's Kerbside home page has a separate builder that asks for a scheduled council before showing its suburb list. All three forms collect first name, email, suburb, postcode and state, with the explicit opt-in selected by default.

The shared Pages Function at `functions/api/subscribe.ts` validates the selected area against that council's published schedule and upserts the contact to Plunk with `siteId`, signup source and consent timestamp. It never exposes the Plunk secret to the browser. Add `PLUNK_API_KEY` as a secret to the Brisbane, Logan and master Pages projects. Configure these runtime variables in each Pages project:

- `ALLOWED_ORIGIN` — that site's canonical HTTPS origin.
- `SITE_ID` — set to `brisbane`, `logan`, or `master` on the matching Pages project. The master form accepts any enabled scheduled council in the generated notification catalog.

Council schedule URLs, sender addresses and notice lead times come from each enabled council's `site.json` under `updates.notifications`. Run `pnpm notifications:config` after changing that metadata or the site registry. This creates `workers/sites.generated.json`, which both the Pages Function and Worker use. `pnpm notifications:config:check` checks that the generated file is current.

The scheduled Worker in `workers/notifications.ts` pages through subscribed Plunk contacts once a day, filters them by council and area, and sends notices before collection and items-out dates. Optional area events such as free tip days can be added to its `EVENTS_JSON` variable, with a `siteId`, stable `id`, `title`, `date`, and `suburbs` or `postcodes` list. Set `daysBefore` to change the default seven-day lead time. An event may include `sponsorOffer: {"name":"...","title":"...","url":"https://..."}`; the same email is sent by us to the matched audience, without passing subscriber details to the sponsor. A Plunk **marketing** template is required; the Worker overrides its subject and body while Plunk enforces opt-outs and appends its unsubscribe footer. Do not use a transactional template for these emails.

To deploy the job, create the `kerbside-local-updates` D1 database, place its ID in `wrangler.notifications.jsonc`, apply `migrations/0001_sent_notifications.sql`, set `PLUNK_API_KEY` and `PLUNK_MARKETING_TEMPLATE_ID` as Worker secrets with Wrangler, and run `pnpm deploy:notifications`. Verify the configured sender domain in Plunk before the cron sends email. A D1 `pending` row stays reserved if Plunk's response is uncertain; inspect the Worker log and Plunk activity before manually clearing one. This favors avoiding duplicate messages. Privacy pages explain what the opt-in stores and how sponsor placements are handled; subscriber details are not shared with sponsors.

Keep this feature branch unmerged until the three Pages projects have their signup variables and secret, and the Worker has its D1 binding, Plunk secrets and verified sender. The forms are enabled in the metadata and need those services to accept signups.

## Adding a council

See [docs/adding-a-council.md](docs/adding-a-council.md). A new council is a self-contained site package plus one registry entry; shared code should not acquire council API fields or branding.

## GitHub and Cloudflare

Every push to `main` builds the registered sites on GitHub and deploys each `dist/<site-id>` directory to the Cloudflare Pages project in `sites/registry.json`. Council entries use `kind: council`; the dynamic directory uses `kind: directory` and is not treated as a data adapter by the weekly ETL job.

Use `vMAJOR.MINOR.PATCH` GitHub release tags for site version milestones. The first baseline is `v1.0.0`. Tags record a known code state; deployment remains on `main`, including the workflow run after weekly data refreshes. A data refresh can therefore deploy without creating another release tag.

The workflow uses these GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN` — Account / Cloudflare Pages / Edit.
- `CLOUDFLARE_ACCOUNT_ID` — the account containing the Pages projects.

Each registry entry names a GitHub environment. Put council-specific public build variables in that environment:

- `GA_MEASUREMENT_ID` — optional GA4 override; the site config can provide a default.
- `ADSENSE_CLIENT` — AdSense publisher ID beginning with `ca-pub-`.
- `ADSENSE_SLOT` — numeric responsive display-ad unit ID.

Repository-level values still work as a shared fallback. Keep Auto ads disabled if the intended experience is the single restrained placement supplied by this project.

The registry also contains explicit `analyticsEnabled` and `adsEnabled` switches. New councils start with both disabled so Brisbane’s repository-level identifiers cannot leak into a new domain before its own analytics stream, consent setup and AdSense approval exist.

No Cloudflare credentials belong in source files, council folders or local `.env` files.

## Contributing and licence

Issues and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). Code is MIT licensed. Council data retains the licence declared by its publisher and is attributed in each site package.

The sites are independent community projects, not official council services. Always confirm important collection details with the relevant council.
