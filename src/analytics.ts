type AnalyticsValue = string | number | boolean;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const configuredMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
const measurementId = configuredMeasurementId || (import.meta.env.PROD ? 'G-L9GY09ZCRL' : undefined);

function analyticsAllowed() {
  return Boolean(measurementId) && navigator.doNotTrack !== '1';
}

export function initAnalytics() {
  if (!analyticsAllowed() || document.querySelector('script[data-google-tag]')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => window.dataLayer.push(args);
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    page_title: document.title,
    page_location: window.location.href,
  });

  const script = document.createElement('script');
  script.async = true;
  script.dataset.googleTag = measurementId;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId!)}`;
  document.head.append(script);
}

export function trackEvent(name: string, parameters: Record<string, AnalyticsValue> = {}) {
  if (!analyticsAllowed()) return;
  window.gtag?.('event', name, parameters);
}
