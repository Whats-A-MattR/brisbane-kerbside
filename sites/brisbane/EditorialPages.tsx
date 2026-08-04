import type { ReactNode } from 'react';
import { AdStrip } from '../../src/AdStrip';
import { BackToTop } from '../../src/BackToTop';
import { formatGeneratedAt } from '../../src/date';
import {
  ACCEPTED_ITEMS_URL,
  COUNCIL_CALENDAR_URL,
  REPOSITORY_URL,
  SPONSOR_URL,
  sitePath,
} from '../../src/site';
import type { Schedule } from '../../src/types';

type EditorialLayoutProps = {
  active: 'about' | 'guide' | 'privacy';
  children: ReactNode;
};

function EditorialLayout({ active, children }: EditorialLayoutProps) {
  return (
    <main className="editorial-page">
      <header className="editorial-header">
        <a className="brand-mark" href={sitePath('/')} aria-label="Brisbane kerbside map home">BNE</a>
        <a className="editorial-name" href={sitePath('/')}>Kerbside collection map</a>
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
        <a href={sitePath('/guide/')}>Brisbane guide</a>
        <a href={sitePath('/about/')}>About the project</a>
        <a href={sitePath('/privacy/')} aria-current={active === 'privacy' ? 'page' : undefined}>Privacy & advertising</a>
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
          Brisbane Kerbside Collection Map does not require an account and does not collect names, addresses or contact details. The site may use Google Analytics 4 to understand aggregate page visits, suburb searches and collection-date selections. Analytics is not loaded when your browser sends a Do Not Track signal.
        </p>

        <h2>Advertising</h2>
        <p>
          This site may display one small advertisement supplied by Google AdSense. Google and its partners may use cookies or similar technologies to show, measure and personalise advertising based on your visits to this and other websites. You can manage personalised advertising in <a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">Google My Ad Center</a>.
        </p>

        <h2>Consent and third parties</h2>
        <p>
          Where required, a consent message is shown before Google uses cookies for analytics or advertising. Google processes information under its own <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>. Map tiles are supplied by OpenStreetMap and CARTO and may receive standard request information such as your IP address and browser details when the map loads.
        </p>

        <h2>Questions</h2>
        <p>
          This is an independent open-source project. Privacy questions and requests can be raised through the <a href={`${REPOSITORY_URL}/issues`} target="_blank" rel="noreferrer">project issue tracker</a>.
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
          <p className="eyebrow">Independent, useful, open</p>
          <h1>Why this map exists—and how it stays current.</h1>
          <p className="editorial-deck">
            Brisbane’s kerbside schedule is public information. This project turns it into a fast, searchable map that is easier to use on the phone you are probably holding while deciding when to clear the garage.
          </p>
        </header>

        <section className="editorial-section editorial-section--feature">
          <div>
            <p className="eyebrow">The short version</p>
            <h2>A public-service utility, without the heavy machinery.</h2>
          </div>
          <div>
            <p>
              Brisbane Kerbside Collection Map is an independent open-source project. It is not operated by, endorsed by or affiliated with Brisbane City Council. The goal is deliberately narrow: help a resident find the next published large-item collection date, see the affected suburb area and reach the official Council information when they need the final word.
            </p>
            <p>
              There is no account, address form or app installation. The site is statically generated, so the schedule remains quick to load, indexable by search engines and usable on modest mobile connections.
            </p>
          </div>
        </section>

        <section className="editorial-section">
          <p className="eyebrow">Methodology</p>
          <h2>From Council data to a map</h2>
          <ol className="method-steps">
            <li>
              <strong>Fetch the published schedule.</strong>
              <span>A weekly automated job reads Brisbane City Council’s open-data API for suburb names, collection dates, items-out dates and geographic boundaries.</span>
            </li>
            <li>
              <strong>Normalise and validate it.</strong>
              <span>The job standardises names and dates, removes past collection weeks, checks that schedule and geometry records exist, then writes small static JSON and GeoJSON files.</span>
            </li>
            <li>
              <strong>Build every useful route.</strong>
              <span>The site pre-renders the main schedule, each published collection week and each suburb with a current upcoming date. Canonical URLs, metadata, structured data and the sitemap are checked before deployment.</span>
            </li>
            <li>
              <strong>Publish only after checks pass.</strong>
              <span>GitHub Actions runs the type checks and full static build before Cloudflare Pages receives an update. The current data build was refreshed {formatGeneratedAt(schedule.generatedAt)}.</span>
            </li>
          </ol>
        </section>

        <section className="editorial-section editorial-columns">
          <div>
            <p className="eyebrow">Source and licence</p>
            <h2>Traceable back to Council</h2>
            <p>
              Schedule and boundary records come from Brisbane City Council’s <a href={schedule.source.url} target="_blank" rel="noreferrer">Kerbside large item collection schedule</a>. Council publishes that dataset under a Creative Commons Attribution 4.0 licence. The application code is available separately under the MIT licence.
            </p>
          </div>
          <div>
            <p className="eyebrow">Limits</p>
            <h2>Useful is not the same as official</h2>
            <p>
              This map presents the currently published suburb-level schedule; it does not determine whether a specific property is eligible. Dates can also change because of severe weather or operational requirements. Check the <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">official Council calendar</a> before placing items out.
            </p>
          </div>
        </section>

        <section className="editorial-section editorial-callout">
          <div>
            <p className="eyebrow">Corrections and contributions</p>
            <h2>See something wrong?</h2>
            <p>
              The complete source, data job and deployment configuration are public. If the interface is confusing, a date looks stale or a source changes, open an issue with enough detail to reproduce it. Contributions are welcome; donations help cover the small ongoing costs of running and expanding the project.
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
          <p className="eyebrow">Brisbane large-item collection guide</p>
          <h1>Put the right things out, at the right time.</h1>
          <p className="editorial-deck">
            A practical guide to preparing a Brisbane kerbside pile without blocking the footpath, exceeding Council’s limit or leaving an item that will not be collected.
          </p>
          <div className="editorial-hero-actions">
            <a className="primary-link" href={sitePath('/')}>Find your collection date</a>
            <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Check Council’s calendar ↗</a>
          </div>
        </header>

        <section className="editorial-section">
          <p className="eyebrow">Before the truck arrives</p>
          <h2>The six-point preparation check</h2>
          <div className="guide-checks">
            <article><strong>1</strong><h3>Confirm the current date</h3><p>Each Brisbane suburb is scheduled for one collection week in the financial year. Weather or operational needs can change dates, so check again before putting anything out.</p></article>
            <article><strong>2</strong><h3>Wait for the right weekend</h3><p>Place items out only from the weekend before the collection starts—Council describes this as two days before the collection period.</p></article>
            <article><strong>3</strong><h3>Be ready by 6am</h3><p>Your pile must be on the kerb by 6am on the first day. Collection can happen during the scheduled week, and late additions may be missed.</p></article>
            <article><strong>4</strong><h3>Stay under 2 cubic metres</h3><p>The household limit is approximately one small box-trailer load. Council says piles larger than 2 cubic metres will not be collected.</p></article>
            <article><strong>5</strong><h3>Keep access clear</h3><p>Make a tidy pile without blocking the footpath or roadway. Avoid sharp or dangerous objects and make sure each item can be safely lifted by two people.</p></article>
            <article><strong>6</strong><h3>Make large items safe</h3><p>Remove doors from refrigerators and cupboards. If severe weather is expected, secure loose items and re-check Council updates.</p></article>
          </div>
        </section>

        <AdStrip />

        <section className="editorial-section editorial-columns editorial-columns--lists">
          <div>
            <p className="eyebrow">Generally accepted</p>
            <h2>Large household items</h2>
            <p>Brisbane City Council currently lists these broad categories as acceptable:</p>
            <ul>
              <li>bath and laundry tubs</li>
              <li>bicycles and sporting equipment</li>
              <li>carpet and rugs</li>
              <li>electronic waste, including televisions and computers</li>
              <li>furniture and white goods</li>
              <li>small household appliances</li>
              <li>wood products within Council’s stated size limit</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">Not accepted</p>
            <h2>Hazardous, loose or building waste</h2>
            <p>Common exclusions include:</p>
            <ul>
              <li>batteries, chemicals, oils, liquids and gas bottles</li>
              <li>bricks, concrete, dirt, stones and commercial building waste</li>
              <li>car parts and tyres</li>
              <li>garden waste and ordinary household rubbish</li>
              <li>glass and mirrors</li>
              <li>hazardous materials, including suspect fibro or asbestos products</li>
            </ul>
          </div>
        </section>

        <aside className="source-note">
          <strong>Lists can change.</strong>
          <p>Use Council’s complete <a href={ACCEPTED_ITEMS_URL} target="_blank" rel="noreferrer">acceptable and unacceptable items page</a> for the latest rules and item-specific advice.</p>
        </aside>

        <section className="editorial-section editorial-section--feature">
          <div>
            <p className="eyebrow">Before throwing it away</p>
            <h2>Reuse may be the easier option.</h2>
          </div>
          <div>
            <p>
              Kerbside collection is intended for heavy or bulky household items that do not fit in a wheelie bin. If something is still usable, consider offering it to friends or family, donating it to a charity or using a reuse organisation. Council also points residents to Treasure Troves and resource recovery centres for items that need another disposal path.
            </p>
            <p>
              Paint, tyres, batteries, gas bottles and hazardous material need specialist handling. Leaving an unacceptable item does not make it collectable: Council may issue a notice requiring removal, and illegal-dumping penalties can apply if material remains after the collection period.
            </p>
          </div>
        </section>

        <section className="editorial-section guide-faq">
          <p className="eyebrow">Common questions</p>
          <h2>Brisbane kerbside collection answers</h2>
          <article><h3>Is the service available to every property?</h3><p>Council says residential households in the Brisbane local government area are eligible, including houses and multi-unit dwellings. Commercial properties, caravan parks, schools and vacant land are excluded. Confirm property eligibility with Council if your situation is unusual.</p></article>
          <article><h3>Can I put out a mattress?</h3><p>Yes. Council currently lists mattresses as accepted kerbside items.</p></article>
          <article><h3>Can televisions and computers go out?</h3><p>Yes. Electronic waste such as televisions and computer monitors is currently accepted.</p></article>
          <article><h3>Can I put out paint, glass or tyres?</h3><p>No. Council directs these items to other disposal or recycling options. Do not place paint, glass, mirrors or tyres in a kerbside pile.</p></article>
          <article><h3>Why is my suburb missing from the search?</h3><p>The map only lists current and future dates present in the published open dataset. A suburb may be absent after its collection has passed or before the next financial year’s date is published.</p></article>
          <article><h3>Is this the official Council calendar?</h3><p>No. This is an independent presentation of Council’s open data. Use the official calendar for final confirmation, especially during severe weather or service changes.</p></article>
        </section>

        <section className="editorial-section editorial-callout">
          <div>
            <p className="eyebrow">Ready to check?</p>
            <h2>Find the next published week for your suburb.</h2>
          </div>
          <div className="editorial-actions">
            <a className="primary-link" href={sitePath('/')}>Open the collection map</a>
            <a href={COUNCIL_CALENDAR_URL} target="_blank" rel="noreferrer">Official Council calendar ↗</a>
          </div>
        </section>
      </article>
    </EditorialLayout>
  );
}
