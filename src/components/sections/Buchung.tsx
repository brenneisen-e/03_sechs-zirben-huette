'use client';

import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { BookingSearch } from '@/components/brand/BookingSearch';

// Buchungsbereich: grüner Satz und die Suche (Anreise, Abreise, Personen).
// „Anfragen“ öffnet direkt das Beds24-Buchungsformular mit Preisaufstellung
// in einem neuen Fenster (lib/booking.ts) — kein eingebetteter Beds24-Kalender
// mehr. Der Belegungskalender steht hier fest im Kästchen (aktueller und
// Folgemonat, blättern bis „Buchbar bis“). Preise, Mindestaufenthalt und
// Zusatzkosten zeigt nur Beds24.

export function Buchung() {
  const { t } = useLanguage();
  const { getText } = useContentTexts();
  const b = t.buchung;

  return (
    <section id="buchung" aria-labelledby="buchung-title" className="brand-section bg-leinen">
      <div className="brand-container grid gap-4 lg:grid-cols-12 lg:gap-6">
        <h2 id="buchung-title" data-text-key="buchung_title" className="sr-only">
          {getText('buchung_title')}
        </h2>
        <div className="on-zirbe flex flex-col justify-between gap-4 rounded-[4px] bg-zirbe p-5 text-leinen md:p-6 lg:col-span-5 lg:self-start">
          <p className="text-[1.25rem] leading-snug md:text-[1.5rem]">{b.direct.title}</p>
          <p className="flex items-center gap-2 text-[0.9375rem] text-leinen/85">
            <ShieldCheck size={18} aria-hidden />
            {b.secure}
          </p>
        </div>
        <div className="rounded-[4px] border border-zirbe/15 bg-white p-5 md:p-6 lg:col-span-7">
          <h3 className="text-[1.125rem] text-zirbe">{b.search.title}</h3>
          <BookingSearch variant="section" className="mt-3" />
        </div>
      </div>
    </section>
  );
}
