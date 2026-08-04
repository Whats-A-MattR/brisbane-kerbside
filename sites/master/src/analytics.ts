const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics() {
  if (!measurementId || navigator.doNotTrack === '1' || document.querySelector('script[data-google-tag]')) return;

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
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.append(script);
}
