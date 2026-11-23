import { useState } from 'react';
import { siteConfig, sitePath } from '../site';
import type { Schedule } from '../types';

export function AreaUpdatesForm({ schedule }: { schedule: Schedule }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const areas = schedule.areaDirectory ?? [...new Map(schedule.collections.flatMap((collection) => collection.areas).map((area) => [area.id, area])).values()];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus('');
    const form = event.currentTarget;
    try {
      const response = await fetch(sitePath('/api/subscribe'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form).entries()), siteId: siteConfig.id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not save your subscription.');
      form.reset();
      setStatus(siteConfig.updates.successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save your subscription. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="updates-card" aria-labelledby="updates-title">
      <div className="updates-copy">
        <p className="eyebrow">Local collection alerts</p>
        <h2 id="updates-title">{siteConfig.updates.heading}</h2>
        <p>{siteConfig.updates.description}</p>
      </div>
      <form onSubmit={submit}>
        <label>First name<input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>{siteConfig.area.singular}<select name="suburb" required defaultValue=""><option value="" disabled>Select your {siteConfig.area.singular}</option>{areas.map((area) => <option key={area.id} value={area.name}>{area.name}</option>)}</select></label>
        <div className="updates-location-row">
          <label>Postcode<input name="postcode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{4}" maxLength={4} required /></label>
          <label>State<input name="state" autoComplete="address-level1" value={siteConfig.state} readOnly required /></label>
        </div>
        <label className="updates-consent"><input name="consent" type="checkbox" value="true" defaultChecked required /><span>{siteConfig.updates.consentLabel}</span></label>
        <button type="submit" disabled={pending}>{pending ? 'Joining…' : siteConfig.updates.submitLabel}</button>
        <p className="updates-status" role="status" aria-live="polite">{status}</p>
      </form>
    </section>
  );
}
