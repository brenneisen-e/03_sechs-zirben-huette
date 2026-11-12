'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CONSENT_KEY,
  CONSENT_OPEN_EVENT,
  GA_MEASUREMENT_ID,
  loadGoogleAnalytics,
} from '@/lib/analytics';

// Einwilligung für Google Analytics: Banner unten, beide Knöpfe gleich
// deutlich. Ohne „Einverstanden“ wird nichts von Google geladen. Die Wahl
// bleibt im Browser gespeichert und lässt sich über „Cookie-Einstellungen“
// im Fuß jederzeit ändern. Der Text bleibt bewusst kurz und freundlich;
// Einzelheiten wie die Verarbeitung in den USA stehen in der
// Datenschutzerklärung, auf die das Banner verlinkt.
export function AnalyticsConsent() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  // Nur die öffentliche Website wird gezählt
  const internal = !!pathname && (pathname.startsWith('/admin') || pathname.startsWith('/gaeste'));

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || internal) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(CONSENT_KEY);
    } catch {
      /* ohne Speicher wird bei jedem Besuch gefragt */
    }
    if (stored === 'granted') loadGoogleAnalytics();
    else if (stored !== 'denied') setOpen(true);

    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
  }, [internal]);

  const decide = (granted: boolean) => {
    try {
      localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied');
    } catch {
      /* Wahl gilt dann nur für diesen Besuch */
    }
    setOpen(false);
    if (granted) loadGoogleAnalytics();
    // Widerruf: Google Analytics ist evtl. schon geladen — nach dem Neuladen
    // der Seite wird es nicht mehr eingebunden
    else if (window.gtag) window.location.reload();
  };

  if (!GA_MEASUREMENT_ID || internal || !open) return null;

  return (
    <div
      role="dialog"
      aria-label={t.consent.title}
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl bg-leinen p-5 text-rinde shadow-2xl ring-1 ring-black/10 sm:p-6"
    >
      <h2 className="text-lg font-bold">{t.consent.title}</h2>
      <p className="mt-2 text-sm leading-relaxed">{t.consent.text}</p>
      <Link
        href="/datenschutz"
        className="mt-2 inline-block text-sm font-semibold text-zirbe underline underline-offset-2"
      >
        {t.consent.more}
      </Link>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => decide(false)}
          className="min-h-12 flex-1 rounded-full border-2 border-zirbe px-5 font-bold text-zirbe transition-colors hover:bg-white"
        >
          {t.consent.decline}
        </button>
        <button
          type="button"
          onClick={() => decide(true)}
          className="min-h-12 flex-1 rounded-full border-2 border-zirbe bg-zirbe px-5 font-bold text-leinen transition-colors hover:bg-primary-dark"
        >
          {t.consent.accept}
        </button>
      </div>
    </div>
  );
}
