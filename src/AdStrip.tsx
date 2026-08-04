import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const client = import.meta.env.VITE_ADSENSE_CLIENT?.trim();
const slot = import.meta.env.VITE_ADSENSE_SLOT?.trim();
const enabled = Boolean(client && slot);
const preview = import.meta.env.DEV && !enabled;

export function AdStrip() {
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || requested.current) return;
    requested.current = true;

    const requestAd = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.warn('The advertisement could not be loaded.', error);
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-adsense-client]');
    if (existingScript) {
      requestAd();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.adsenseClient = client!;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client!)}`;
    script.addEventListener('load', requestAd, { once: true });
    document.head.append(script);
  }, []);

  if (!enabled && !preview) return null;

  return (
    <aside className={`map-ad${preview ? ' map-ad--preview' : ''}`} aria-label="Advertisement">
      <span className="map-ad-label">Advertisement</span>
      {enabled ? (
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      ) : (
        <span className="map-ad-placeholder">Small ad strip preview</span>
      )}
    </aside>
  );
}
