# Brisbane Kerbside Collection Map

[brisbanekerbside.app](https://brisbanekerbside.app) makes Brisbane City
Council's large-item kerbside collection schedule easier to scan. Choose a
collection week to highlight every scheduled suburb on the map, or open a
dedicated page for a suburb.

## How it works

The site has no application server or database. A weekly GitHub Actions job
fetches Brisbane City Council's open dataset and commits two generated files:

- `schedule.json` contains the upcoming collection weeks and suburb names.
- `areas.geojson` contains the map geometry used by Leaflet.

Vite then builds a React app and pre-renders the home page plus a dedicated
page for every upcoming collection week and suburb. GitHub Actions builds and
deploys the result to Cloudflare Pages at the custom domain.

## Local development

Requires Node.js 22 and pnpm 11.

```sh
pnpm install
pnpm data:update
pnpm dev
```

Run `pnpm build` to generate the complete static site.

Copy `.env.example` to `.env.local` if you want to test analytics or the ad
placement locally. These IDs are public identifiers and must not be used for
API credentials or other secrets.

## Deployment

Every push to `main` is type-checked, built on GitHub Actions and deployed to
the `brisbane-kerbside` Cloudflare Pages project. The workflow requires these
GitHub Actions repository secrets:

- `CLOUDFLARE_API_TOKEN` — a token with Account / Cloudflare Pages / Edit.
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account containing the Pages project.

The build also reads these GitHub Actions repository variables (Settings →
Secrets and variables → Actions → Variables):

- `GA_MEASUREMENT_ID` — optional override for the production GA4 web stream ID.
- `ADSENSE_CLIENT` — the AdSense publisher ID beginning with `ca-pub-`.
- `ADSENSE_SLOT` — the numeric ID of one responsive display ad unit.

Production analytics uses `G-L9GY09ZCRL` by default; local development remains
untracked unless an ID is supplied in `.env.local`. The ad unit is omitted when
its variables are blank. The site respects the browser's Do Not Track setting. `pnpm build` validates the
generated sitemap, canonical URLs and social-card metadata for every static
page before deployment.

## Analytics, ads and search setup

1. GA4 is configured for the `G-L9GY09ZCRL` web stream. Use the optional
   `GA_MEASUREMENT_ID` repository variable only if that production stream changes.
2. Apply for AdSense with the same production domain. Once approved, create a
   responsive display ad unit and add its publisher and slot IDs to the two
   AdSense repository variables. The build then publishes the required account
   metadata and `ads.txt`. Keep Auto ads disabled if you only want the single
   restrained strip supplied by this project.
3. In AdSense, configure Privacy & messaging before serving ads internationally.
   Google requires a certified consent-management platform for relevant users
   in the EEA, UK and Switzerland.
4. Add the domain property to Google Search Console using the DNS verification
   record, then submit `https://brisbanekerbside.app/sitemap.xml` in the
   Sitemaps report.

The restrained ad placement appears below the map on the main schedule and once
inside the detailed kerbside guide. Generated suburb, collection and privacy
pages do not request an ad unit. Local development shows a labelled preview;
production renders nothing until valid AdSense variables are configured.

No Cloudflare credentials belong in the repository or in local `.env` files.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md)
for the project conventions. You can also support ongoing hosting and
maintenance through [GitHub Sponsors](https://github.com/sponsors/Whats-A-MattR).

## Data and licence

Source code is available under the [MIT License](LICENSE).

Schedule and boundary data is sourced from
[Brisbane City Council Open Data](https://data.brisbane.qld.gov.au/explore/dataset/kerbside-large-item-collection-schedule/)
and remains licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
This is an independent project and is not an official Brisbane City Council
service. Collection dates can change; confirm important details against the
[official Council calendar](https://www.brisbane.qld.gov.au/bins-waste-and-recycling/kerbside-collection/kerbside-collection-calendar).
