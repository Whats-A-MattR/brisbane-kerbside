import type { ReactNode } from 'react';
import { AdStrip } from '../../src/AdStrip';
import { BackToTop } from '../../src/BackToTop';
import { formatGeneratedAt } from '../../src/date';
import {
  ACCEPTED_ITEMS_URL,
  COUNCIL_CALENDAR_URL,
  DIRECTORY_URL,
  REPOSITORY_URL,
  SPONSOR_URL,
  sitePath,
} from '../../src/site';
import type { Schedule } from '../../src/types';

const PLACEMENT_URL = 'https://www.logan.qld.gov.au/residents/waste-and-recycling/kerbside-clean-up/how-and-where-to-place-items';
const FAQ_URL = 'https://www.logan.qld.gov.au/residents/waste-and-recycling/kerbside-clean-up/faqs';
const BOUNDARY_URL = 'https://www.data.qld.gov.au/dataset/locality-boundaries-queensland';

type EditorialLayoutProps = {
  active: 'about' | 'guide' | 'privacy';
  children: ReactNode;
};

function EditorialLayout({ active, children }: EditorialLayoutProps) {
  return (
    <main className="editorial-page">
      <header className="editorial-header">
        <a className="brand-mark" href={sitePath('/')} aria-label="Logan kerbside map home">LOG</a>
        <a className="editorial-name" href={sitePath('/')}>Kerbside clean-up map</a>
        <nav aria-label="Site navigation">
          <a href={sitePath('/')}>Map</a>
          <a href={sitePath('/guide/')} aria-current={active === 'guide' ? 'page' : undefined}>Guide</a>
          <a href={sitePath('/about/')} aria-current={active === 'about' ? 'page' : undefined}>About</a>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">Open source</a>
          <a className="sponsor-link" href={SPONSOR_URL} target="_blank" rel="noreferrer">Donate</a>
        </nav>
      </header>
      {children}
      <footer className="editorial-footer">
        <a href={sitePath('/')}>Collection map</a>
        <a href={sitePath('/guide/')}>Logan guide</a>
        <a href={sitePath('/about/')}>About the project</a>
        <a href={sitePath('/privacy/')} aria-current={active === 'privacy' ? 'page' : undefined}>Privacy & advertising</a>
        <a href={DIRECTORY_URL}>Find another council ↗</a>
      </footer>
      <BackToTop />
    </main>
  );
}

export function PrivacyPage() {
  return (
    <EditorialLayout active="privacy">
      <article className="editorial-article editorial-article--narrow">
        <p className="eyebrow">Project information</p>
        <h1>Privacy and advertising</h1>
        <p className="editorial-updated">Last updated 4 August 2026</p>

        <h2>What this site collects</h2>
        <p>
          Logan Kerbside Clean-up Map does not require an account and does not ask for names, street addresses or contact details. The site may use Google Analytics 4 to understand aggregate page visits, suburb searches and collection-period selections. Analytics is not loaded when your browser sends a Do Not Track signal.
        </p>

        <h2>Advertising</h2>
        <p>
          This site may display one small advertisement supplied by Google AdSense. Google and its partners may use cookies or similar technologies to show, measure and personalise advertising. You can manage personalised advertising in <a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">Google My Ad Center</a>.
        </p>

        <h2>Consent and third parties</h2>
        <p>
          Where required, a consent message is shown before Google uses cookies for analytics or advertising. Google processes information under its own <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>. Map tiles are supplied by OpenStreetMap and CARTO and may receive standard request information such as your IP address and browser details when the map loads.
        </p>

        <h2>Questions</h2>
        <p>
          This is an independent open-source project. Privacy questions can be raised through the <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">project issue tracker</a>.
        </p>
      </article>
    </EditorialLayout>
  );
}

export function AboutPage({ schedule }: { schedule: Schedule }) {
  return (
    <EditorialLayout active="about">
      <article className="editorial-article">
        <header className="editorial-hero">
          <p className="eyebrow">Independent, local, open</p>
          <h1>A clearer view of Logan’s two-week clean-up schedule.</h1>
          <p className="editorial-deck">
            Logan publishes its kerbside clean-up timetable as open data. This project turns that timetable into searchable suburb pages and a map without asking residents for an address.
          </p>
        </header>

        <section className="editorial-section editorial-section--feature">
          <div>
            <p className="eyebrow">Why it exists</p>
            <h2>The official facts, arranged around one practical question.</h2>
          </div>
          <div>
            <p>
              Logan City Council’s clean-up service moves across the city in scheduled periods of roughly two weeks. The official information is public and authoritative, but a resident often wants a faster answer: when does my suburb start, how long does the period run, and what should I do before the trucks arrive?
            </p>
            <p>
              Logan Kerbside Clean-up Map is an independent open-source presentation of that public information. It is not operated by, endorsed by or affiliated with Logan City Council. It does not determine whether a particular property is eligible, replace the flyer delivered by Council, or override a service update.
            </p>
          </div>
        </section>

        <section className="editorial-section">
          <p className="eyebrow">Methodology</p>
          <h2>Two official sources, one small static build</h2>
          <ol className="method-steps">
            <li>
              <strong>Read Council’s machine-readable schedule.</strong>
              <span>A weekly job downloads Logan City Council’s public ArcGIS CSV, including each suburb, collection start, collection end and special coverage detail.</span>
            </li>
            <li>
              <strong>Match official locality boundaries.</strong>
              <span>The job fetches Queensland Government locality polygons for Logan City and joins them to Council’s schedule by locality name.</span>
            </li>
            <li>
              <strong>Validate every scheduled area.</strong>
              <span>Dates are normalised, completed periods are removed and the shared schema checks that every schedule entry has matching geometry with the same timing and coverage note.</span>
            </li>
            <li>
              <strong>Pre-render every useful page.</strong>
              <span>The home schedule, guide, methodology, collection periods and suburb routes are written as static HTML. Canonicals, social metadata, structured data and the sitemap are verified before deployment. This build was refreshed {formatGeneratedAt(schedule.generatedAt)}.</span>
            </li>
          </ol>
        </section>

        <section className="editorial-section editorial-columns">
          <div>
            <p className="eyebrow">Schedule source</p>
            <h2>Logan City Council open data</h2>
            <p>
              The timing records come from Council’s <a href={schedule.source.url} target="_blank" rel="noreferrer">Logan City Council Kerbside Cleanup Schedule</a> item on ArcGIS Online. Council identifies the CSV as public open data and licenses it under Creative Commons Attribution 3.0 Australia.
            </p>
          </div>
          <div>
            <p className="eyebrow">Boundary source</p>
            <h2>Queensland locality polygons</h2>
            <p>
              Map shapes come from the Queensland Government’s <a href={BOUNDARY_URL} target="_blank" rel="noreferrer">Locality boundaries dataset</a>. They show official locality extents, not individual property eligibility or Council’s exact truck route.
            </p>
          </div>
        </section>

        <section className="editorial-section">
          <p className="eyebrow">An important map limit</p>
          <h2>Rochedale South is split by Underwood Road.</h2>
          <p>
            Council schedules the northern and southern parts of Rochedale South separately. The Queensland locality dataset supplies one whole-suburb polygon, not the operational split. The two search results and pages preserve Council’s north-or-south wording, while the map displays the full locality boundary with a visible coverage note. Residents near Underwood Road should use Council’s schedule and delivered flyer as the final authority.
          </p>
          <p>
            More generally, the map answers at suburb scale. Eligibility is limited to residential properties with a Council-provided waste collection service; commercial properties, schools and vacant land are excluded even when they sit inside a highlighted locality.
          </p>
        </section>

        <section className="editorial-section editorial-callout">
          <div>
            <p className="eyebrow">Corrections and contributions</p>
            <h2>Keep the evidence traceable.</h2>
            <p>
              If a source changes, a suburb is missing or the interface gives a misleading impression, report it with an official link or a reproducible example. The source adapter, generated schema and deployment workflow are public so corrections can be reviewed rather than hidden behind an opaque service.
            </p>
          </div>
          <div className="editorial-actions">
            <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">Report an issue ↗</a>
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">View the source ↗</a>
            <a className="sponsor-link" href={SPONSOR_URL} target="_blank" rel="noreferrer">Support the project</a>
          </div>
        </section>
      </article>
    </EditorialLayout>
  );
}

export function GuidePage() {
  return (
    <EditorialLayout active="guide">
      <article className="editorial-article">
        <header className="editorial-hero">
          <p className="eyebrow">Logan kerbside clean-up guide</p>
          <h1>Put it out at the right time—and make the pile collectable.</h1>
          <p className="editorial-deck">
            Logan’s service accepts both hard waste and prepared green waste, but the timing, two-cubic-metre limit and safety rules matter. This guide summarises Council’s current instructions and links back to the official detail.
          </p>
          <div className="editorial-hero-actions">
            <a className="primary-link" href={sitePath('/')}>Find your collection period</a>
            <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Check Council’s schedule ↗</a>
          </div>
        </header>

        <section className="editorial-section">
          <p className="eyebrow">Before collection starts</p>
          <h2>The six-point Logan preparation check</h2>
          <div className="guide-checks">
            <article><strong>1</strong><h3>Confirm the published period</h3><p>Search for your suburb, then check the official Council schedule and the flyer delivered to your property. Rochedale South has separate north and south dates around Underwood Road.</p></article>
            <article><strong>2</strong><h3>Wait for the right weekend</h3><p>Council allows items out on the weekend before the scheduled collection begins. Do not place a pile out more than one week before your start date.</p></article>
            <article><strong>3</strong><h3>Be ready by 6am</h3><p>Your items must be neatly placed and ready by 6am on the first day. The trucks work through the area during the published period, so the start date is not a promise of same-day pickup.</p></article>
            <article><strong>4</strong><h3>Stay inside 2 cubic metres</h3><p>The per-dwelling limit is a pile no larger than 2 metres wide, 1 metre high and 1 metre deep. Excess material may be left behind.</p></article>
            <article><strong>5</strong><h3>Keep access clear</h3><p>Do not block footpaths, driveways, letterboxes, water meters or power poles. Council says everything must be loadable by two people in under five minutes.</p></article>
            <article><strong>6</strong><h3>Separate and prepare green waste</h3><p>Cut branches and palm fronds into 1 metre lengths and tie them with natural string. Put leaves and grass in cardboard boxes, never plastic bags.</p></article>
          </div>
        </section>

        <AdStrip />

        <section className="editorial-section editorial-columns editorial-columns--lists">
          <div>
            <p className="eyebrow">Council currently accepts</p>
            <h2>Prepared green waste and selected hard waste</h2>
            <ul>
              <li>bundled tree and shrub clippings and palm fronds</li>
              <li>leaves and grass clippings in cardboard boxes</li>
              <li>furniture, carpet and linoleum</li>
              <li>wood products no longer than 1 metre</li>
              <li>stoves, dishwashers and washing machines with doors removed</li>
              <li>small amounts of timber, plasterboard, bricks and tiles</li>
              <li>mattresses</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Council does not accept</p>
            <h2>Hazardous, glass, refrigerated or unsafe items</h2>
            <ul>
              <li>tyres, batteries, gas cylinders and fire extinguishers</li>
              <li>fibro sheeting, hazardous or medical waste, oils and paint</li>
              <li>refrigerators, air conditioners and freezers</li>
              <li>glass or glass-containing items, including TVs and monitors</li>
              <li>tree stumps, rocks, dirt and concrete</li>
              <li>bean bags, bathtubs and undismantled oversized equipment</li>
              <li>items heavier than roughly 25 kilograms</li>
            </ul>
          </div>
        </section>

        <aside className="source-note">
          <strong>Rules can change.</strong>
          <p>Use Council’s complete <a href={ACCEPTED_ITEMS_URL} target="_blank" rel="noreferrer">accepted and unacceptable items page</a> and <a href={PLACEMENT_URL} target="_blank" rel="noreferrer">placement instructions</a> before making the pile.</p>
        </aside>

        <section className="editorial-section editorial-section--feature">
          <div>
            <p className="eyebrow">Reuse before disposal</p>
            <h2>Most collected hard waste goes to landfill.</h2>
          </div>
          <div>
            <p>
              Logan City Council says collected items other than green waste are disposed of in landfill. Usable items may have a better path through a charity, the Logan Recycling Market or a Council waste and recycling facility. Council says recyclable and suitable resaleable items can be dropped off free at its facilities, subject to the facility’s conditions.
            </p>
            <p>
              Green waste is handled separately so it can be chipped and composted. Mixing rubbish into green waste or using plastic bags prevents correct processing and may leave material uncollected.
            </p>
          </div>
        </section>

        <section className="editorial-section guide-faq">
          <p className="eyebrow">Common questions</p>
          <h2>Logan kerbside clean-up answers</h2>
          <article><h3>Who is eligible?</h3><p>Residential properties with a Council-provided waste collection service are eligible. Council excludes commercial properties, schools and vacant land. A highlighted suburb boundary does not establish eligibility for every property inside it.</p></article>
          <article><h3>Can I put out a mattress?</h3><p>Yes. Mattresses are currently on Council’s accepted hard-waste list.</p></article>
          <article><h3>Can televisions, computer monitors or fridges go out?</h3><p>No. Council excludes refrigerators, air conditioners, freezers, glass and items containing glass. Its examples include televisions, mirrors, computer monitors, glass tables and solar panels.</p></article>
          <article><h3>What if my collection is missed?</h3><p>First wait until the scheduled period has finished—Council describes this as 12 days after the start. Check whether a letterbox notice explains why the pile was rejected. If it was genuinely missed, contact Council within two weeks after the period ends. See the <a href={FAQ_URL} target="_blank" rel="noreferrer">official FAQ</a> for the current reporting process.</p></article>
          <article><h3>Will Council return something collected by mistake?</h3><p>No. Council says items are crushed in the collection vehicle and cannot be returned.</p></article>
          <article><h3>Is this an official Council website?</h3><p>No. This is an independent map generated from public data. Logan City Council’s pages and delivered flyer remain the authority for eligibility, timing, presentation and changed services.</p></article>
        </section>

        <section className="editorial-section editorial-callout">
          <div>
            <p className="eyebrow">Ready to check?</p>
            <h2>Find the next published period for your Logan suburb.</h2>
          </div>
          <div className="editorial-actions">
            <a className="primary-link" href={sitePath('/')}>Open the collection map</a>
            <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Official Council schedule ↗</a>
          </div>
        </section>
      </article>
    </EditorialLayout>
  );
}
