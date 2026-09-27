import { useState } from 'react';
import masterSite from '../site.json';
import notificationSites from '../../../workers/sites.generated.json';
import type { MasterData } from './types';

export function MasterUpdatesForm({ data }: { data: MasterData }) {
  const [councilId, setCouncilId] = useState('');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const councils = data.councils.filter((council) => council.serviceModel === 'scheduled' && notificationSites.some((site) => site.id === council.id));
  const selectedCouncil = councils.find((council) => council.id === councilId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCouncil) return;
    setPending(true);
    setStatus('');
    const form = event.currentTarget;
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(form).entries()), siteId: selectedCouncil.id, signupSource: 'master-directory' }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not save your subscription.');
      form.reset();
      setCouncilId('');
      setStatus(masterSite.updates.successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save your subscription. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="updates-card" aria-labelledby="master-updates-title">
      <div className="updates-copy">
        <p className="eyebrow">Local collection alerts</p>
        <h2 id="master-updates-title">{masterSite.updates.heading}</h2>
        <p>{masterSite.updates.description}</p>
      </div>
      <form onSubmit={submit}>
        <label>First name<input name="firstName" autoComplete="given-name" required maxLength={80} /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Council area<select name="council" value={councilId} onChange={(event) => setCouncilId(event.target.value)} required><option value="">Select a council</option>{councils.map((council) => <option key={council.id} value={council.id}>{council.councilName}</option>)}</select></label>
        <label>Suburb<select key={selectedCouncil?.id ?? 'none'} name="suburb" required disabled={!selectedCouncil} defaultValue=""><option value="">Select your suburb</option>{selectedCouncil?.areaDetails.map((area) => <option key={area.id} value={area.name}>{area.name}</option>)}</select></label>
        <div className="updates-location-row">
          <label>Postcode<input name="postcode" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{4}" maxLength={4} required /></label>
          <label>State<input name="state" autoComplete="address-level1" value={selectedCouncil?.state ?? ''} readOnly required /></label>
        </div>
        <label className="updates-consent"><input name="consent" type="checkbox" value="true" defaultChecked required /><span>{masterSite.updates.consentLabel}</span></label>
        <button type="submit" disabled={pending || !selectedCouncil}>{pending ? 'Joining…' : masterSite.updates.submitLabel}</button>
        <p className="updates-status" role="status" aria-live="polite">{status}</p>
      </form>
    </section>
  );
}
