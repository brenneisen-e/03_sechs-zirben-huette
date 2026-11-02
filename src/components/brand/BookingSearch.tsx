'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AvailabilityCalendar, type CalendarTarget } from '@/components/brand/AvailabilityCalendar';
import { useAvailability } from '@/lib/availability';
import {
  beds24FormUrl,
  type BookingQuery,
  DEFAULT_QUERY,
  MAX_GUESTS,
  nightsBetween,
  openBeds24Form,
  readBookingQuery,
} from '@/lib/booking';

// Kompakte Suche: Anreise, Abreise, Personen. Anreise und Abreise wählt man im
// Kalender mit freien und belegten Nächten (AvailabilityCalendar, Daten aus
// Beds24 über /api/availability). „Anfragen“ (roter Knopf) öffnet
// direkt das Beds24-Buchungsformular mit Preisaufstellung in einem neuen
// Fenster (lib/booking.ts). Hero auf Grün (schmal untereinander, „bar“ als
// Leiste in einer Zeile im Aufmacher), Buchungsbereich auf Leinen. Im
// Buchungsbereich steht der Kalender fest im Kästchen (inline), sonst öffnet
// er sich am Datumsfeld.

interface Props {
  variant: 'hero' | 'bar' | 'section';
  className?: string;
}

export function BookingSearch({ variant, className = '' }: Props) {
  const { t, language } = useLanguage();
  const s = t.buchung.search;
  const id = useId();
  const [query, setQuery] = useState<BookingQuery>(DEFAULT_QUERY);
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [target, setTarget] = useState<CalendarTarget>('arrival');
  const [ready, setReady] = useState(false);
  const datesRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Verfügbarkeit nach dem ersten Zeichnen laden, damit der Kalender sofort steht
  const availability = useAvailability(ready);

  useEffect(() => {
    setQuery(readBookingQuery(new URLSearchParams(window.location.search)));
    setReady(true);
  }, []);

  const nights = nightsBetween(query.arrival, query.departure);
  // Leiste und Hero stehen auf Grün
  const onHero = variant !== 'section';
  const bar = variant === 'bar';
  const inline = variant === 'section';

  const openCalendar = (which: CalendarTarget, trigger: HTMLButtonElement) => {
    if (inline) {
      // Kalender steht schon da: nur festlegen, was der nächste Klick wählt
      setTarget(which === 'departure' && !query.arrival ? 'arrival' : which);
      return;
    }
    triggerRef.current = trigger;
    // Kalender am ganzen Feldraster ausrichten
    setAnchor(datesRef.current?.parentElement ?? trigger);
    setTarget(which === 'departure' && !query.arrival ? 'arrival' : which);
    setCalendarOpen(true);
  };

  const closeCalendar = useCallback(() => {
    setCalendarOpen(false);
    triggerRef.current?.focus();
  }, []);

  const changeDates = (arrival: string | undefined, departure: string | undefined) => {
    setError('');
    setQuery((q) => ({ ...q, arrival, departure }));
  };

  const formatDate = (iso?: string) =>
    iso
      ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(`${iso}T12:00:00Z`))
      : '';

  const book = () => {
    if (!query.arrival || !query.departure) {
      setError(s.required);
      return;
    }
    if (nightsBetween(query.arrival, query.departure) < 1) {
      setError(s.invalid);
      return;
    }
    if (query.adults + query.children > MAX_GUESTS) {
      setError(s.maxGuests);
      return;
    }
    const url = beds24FormUrl(query, language);
    if (!url) return;
    setError('');
    setCalendarOpen(false);
    openBeds24Form(url);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    book();
  };

  const label = onHero ? 'text-holz' : 'text-rinde';
  const field = `mt-1 block w-full min-h-[48px] rounded-[4px] border px-3 text-[1rem] [color-scheme:light] ${
    onHero
      ? 'border-transparent bg-leinen text-rinde'
      : 'border-zirbe/40 bg-white text-rinde focus:border-zirbe'
  }`;
  const adultOptions = Array.from({ length: MAX_GUESTS }, (_, i) => i + 1);
  const childOptions = Array.from({ length: MAX_GUESTS - query.adults + 1 }, (_, i) => i);

  const status = (
    <p
      className={`min-h-[1.5rem] text-[0.9375rem] ${bar ? '' : 'mt-2'} ${
        onHero ? 'text-leinen' : 'text-rinde'
      }`}
      aria-live="polite"
    >
      {error || (nights > 0 ? `${nights} ${nights === 1 ? s.night : s.nights}` : ' ')}
    </p>
  );
  const hint = (
    <p
      className={`text-[0.875rem] ${bar ? '' : 'mt-2'} ${
        onHero ? 'text-leinen/80' : 'text-rinde/75'
      }`}
    >
      {s.hint}
    </p>
  );

  return (
    <form onSubmit={submit} className={className} aria-label={s.title} noValidate>
      <div
        className={
          bar
            ? 'grid grid-cols-[repeat(4,minmax(0,1fr))_auto] items-end gap-3'
            : 'grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-2'
        }
      >
        <div ref={datesRef} className="contents">
          {(['arrival', 'departure'] as const).map((which) => {
            const value = which === 'arrival' ? query.arrival : query.departure;
            const active = (inline || calendarOpen) && target === which;
            return (
              <div key={which} className={`text-[0.9375rem] ${label}`}>
                <span id={`${id}-${which}-label`}>
                  {which === 'arrival' ? s.arrival : s.departure}
                </span>
                <button
                  type="button"
                  aria-haspopup={inline ? undefined : 'dialog'}
                  aria-expanded={inline ? undefined : calendarOpen}
                  aria-labelledby={`${id}-${which}-label ${id}-${which}-value`}
                  onClick={(e) => openCalendar(which, e.currentTarget)}
                  className={`${field} flex items-center gap-2 text-left ${
                    active ? 'ring-2 ring-zirbe ring-offset-1' : ''
                  }`}
                >
                  <CalendarDays size={18} aria-hidden className="flex-none text-zirbe" />
                  <span
                    id={`${id}-${which}-value`}
                    className={`truncate ${value ? '' : 'text-rinde/55'}`}
                  >
                    {value ? formatDate(value) : s.calendar.placeholder}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <label htmlFor={`${id}-ad`} className={`text-[0.9375rem] ${label}`}>
          {s.adults}
          <select
            id={`${id}-ad`}
            value={query.adults}
            onChange={(e) => {
              const adults = Number(e.target.value);
              setQuery((q) => ({
                ...q,
                adults,
                children: Math.min(q.children, MAX_GUESTS - adults),
              }));
            }}
            className={field}
          >
            {adultOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-ch`} className={`text-[0.9375rem] ${label}`}>
          {s.children}
          <select
            id={`${id}-ch`}
            value={query.children}
            onChange={(e) => setQuery((q) => ({ ...q, children: Number(e.target.value) }))}
            className={field}
          >
            {childOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {bar && (
          <button type="submit" className="brand-cta brand-cta--compact">
            {t.brand.book}
          </button>
        )}
      </div>

      {inline && (
        <div className="mt-4 rounded-[4px] border border-zirbe/15 bg-leinen p-4 sm:p-5">
          <AvailabilityCalendar
            open
            inline
            anchor={null}
            availability={availability}
            arrival={query.arrival}
            departure={query.departure}
            target={target}
            onTargetChange={setTarget}
            onChange={changeDates}
            onClose={() => undefined}
            onBook={book}
          />
        </div>
      )}

      {bar ? (
        // Leiste: Nächte bzw. Hinweis und Erklärung in einer Zeile darunter
        <div className="mt-2 flex items-baseline justify-between gap-6">
          {status}
          {hint}
        </div>
      ) : (
        <>
          {/* fest eingebauter Kalender zeigt Nächte und Hinweise selbst */}
          {inline
            ? error && (
                <p className="mt-2 text-[0.9375rem] text-rinde" aria-live="polite">
                  {error}
                </p>
              )
            : status}
          <button
            type="submit"
            className={`brand-cta ${inline ? 'mt-4' : 'mt-2'} w-full ${onHero ? 'sm:w-auto' : ''}`}
          >
            {t.brand.book}
          </button>
          {hint}
        </>
      )}
      {!inline && (
        <AvailabilityCalendar
          open={calendarOpen}
          anchor={anchor}
          availability={availability}
          arrival={query.arrival}
          departure={query.departure}
          target={target}
          onTargetChange={setTarget}
          onChange={changeDates}
          onClose={closeCalendar}
          onBook={book}
        />
      )}
    </form>
  );
}
