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

There is no application server or database. The weekly data workflow refreshes every registered council and commits only the generated data. The deployment workflow reads the same registry and builds/deploys each site independently.

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

## Adding a council

See [docs/adding-a-council.md](docs/adding-a-council.md). A new council is a self-contained site package plus one registry entry; shared code should not acquire council API fields or branding.

## GitHub and Cloudflare

Every push to `main` builds the registered sites on GitHub and deploys each `dist/<site-id>` directory to the Cloudflare Pages project in `sites/registry.json`. Council entries use `kind: council`; the dynamic directory uses `kind: directory` and is not treated as a data adapter by the weekly ETL job.

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
