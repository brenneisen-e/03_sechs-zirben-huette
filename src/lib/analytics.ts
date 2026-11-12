// Google Analytics 4 für die öffentliche Website (nicht Admin Center, nicht
// Gäste-App). Gleicher Aufbau wie im Repo der Natberger Hütte.
//
// Die Mess-ID („G-…“) ist öffentlich und steht im Seitenquelltext — kein
// Geheimnis. Solange sie leer ist, lädt nichts und es erscheint kein Banner.
// Geladen wird Google Analytics erst NACH der Einwilligung des Besuchers
// (src/components/layout/AnalyticsConsent.tsx); ohne Einwilligung geht keine
// Anfrage an Google.

export const GA_MEASUREMENT_ID: string = '';

/** localStorage: 'granted' | 'denied' — fehlt der Eintrag, wird gefragt */
export const CONSENT_KEY = 'analytics_consent';

/** Öffnet das Banner erneut (Link „Cookie-Einstellungen“ im Fuß) */
export const CONSENT_OPEN_EVENT = 'analytics-consent-open';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;

/** Google Analytics laden — nur nach Einwilligung aufrufen */
export function loadGoogleAnalytics(): void {
  if (loaded || !GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** Ereignis melden (z.B. gesendete Buchungsanfrage) — ohne Einwilligung wirkungslos */
export function trackEvent(name: string, params?: Record<string, string | number>): void {
  if (typeof window !== 'undefined' && window.gtag) window.gtag('event', name, params || {});
}
