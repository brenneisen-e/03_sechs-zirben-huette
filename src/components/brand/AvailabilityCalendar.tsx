'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { addDays, nightsBetween } from '@/lib/booking';
import { type Availability, isNightOpen, latestDeparture, minStayFor } from '@/lib/availability';

// Kalender der Buchungssuche: aktueller und folgender Monat nebeneinander
// (Handy untereinander), freie Nächte weiß, belegte Nächte in Moos, Wechseltage
// halb/halb (oben links die Nacht davor, unten rechts die Nacht ab diesem Tag).
// Blättern bis zum „Buchbar bis“-Datum bzw. Ende des Beds24-Fensters, Sprung
// per Monatsauswahl. Anreise und Abreise per Klick; ist der Zeitraum
// vollständig, führt „Anfragen“ direkt ins Beds24-Formular.
//
// Liegt per Portal über der Seite (der Hero schneidet mit overflow-hidden ab):
// ab 640 px als Aufklapper am Suchfeld, schmaler als Blatt von unten.

export type CalendarTarget = 'arrival' | 'departure';

interface Props {
  open: boolean;
  anchor: HTMLElement | null;
  availability: Availability;
  arrival?: string;
  departure?: string;
  target: CalendarTarget;
  onTargetChange: (target: CalendarTarget) => void;
  onChange: (arrival: string | undefined, departure: string | undefined) => void;
  onClose: () => void;
  onBook: () => void;
}

const LOCALES: Record<string, string> = {
  de: 'de-AT',
  en: 'en-GB',
  it: 'it-IT',
  sl: 'sl-SI',
};

type DayState = 'past' | 'free' | 'booked' | 'arrival-only' | 'departure-only';

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

function monthDiff(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number) as [number, number];
  const [yb, mb] = b.split('-').map(Number) as [number, number];
  return (yb - ya) * 12 + (mb - ma);
}

/** Tage eines Monats mit führenden Lücken (Woche beginnt am Montag) */
function monthGrid(key: string): (string | null)[] {
  const first = `${key}-01`;
  const weekday = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const days: (string | null)[] = Array.from({ length: weekday }, () => null);
  for (let day = first; monthKey(day) === key; day = addDays(day, 1)) days.push(day);
  return days;
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

export function AvailabilityCalendar({
  open,
  anchor,
  availability: a,
  arrival,
  departure,
  target,
  onTargetChange,
  onChange,
  onClose,
  onBook,
}: Props) {
  const { t, language } = useLanguage();
  const s = t.buchung.search;
  const c = s.calendar;
  const locale = LOCALES[language] ?? 'de-AT';

  const firstMonth = monthKey(a.from);
  // Abreise am Tag nach der letzten buchbaren Nacht muss erreichbar sein
  const lastMonth = monthKey(addDays(a.to, 1));
  const clampMonth = useCallback(
    (key: string) =>
      monthDiff(firstMonth, key) < 0 ? firstMonth : monthDiff(key, lastMonth) < 0 ? lastMonth : key,
    [firstMonth, lastMonth],
  );

  const [view, setView] = useState(() => clampMonth(monthKey(arrival ?? a.from)));
  const [hover, setHover] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState<string>(arrival ?? a.from);
  const [message, setMessage] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  }>({
    left: 16,
    width: 720,
    top: 0,
    maxHeight: 600,
  });

  useEffect(() => setMounted(true), []);

  // Beim Öffnen: Monat der Anreise (bzw. heute) zeigen
  useEffect(() => {
    if (!open) return;
    const start = target === 'departure' && departure ? departure : (arrival ?? a.from);
    setView(clampMonth(monthKey(start)));
    setFocusDay(start < a.from ? a.from : start);
    setMessage('');
    // nur beim Öffnen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Daten kamen nach dem Öffnen: Ansicht in den gültigen Bereich holen
  useEffect(() => {
    setView((v) => clampMonth(v));
  }, [clampMonth]);

  // Position am Suchfeld (ab 640 px) bzw. Blatt von unten
  const place = useCallback(() => {
    if (!anchor) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isNarrow = vw < 640;
    setNarrow(isNarrow);
    if (isNarrow) {
      setPos({ left: 0, width: vw, bottom: 0, maxHeight: Math.round(vh * 0.92) });
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(720, vw - 32);
    const left = Math.min(Math.max(16, rect.left), vw - width - 16);
    const below = vh - rect.bottom - 16;
    const above = rect.top - 16;
    if (below >= 520 || below >= above) {
      setPos({ left, width, top: rect.bottom + 8, maxHeight: Math.max(280, below - 8) });
    } else {
      setPos({ left, width, bottom: vh - rect.top + 8, maxHeight: Math.max(280, above - 8) });
    }
  }, [anchor]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  // Schließen: Escape, Klick daneben
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (panelRef.current?.contains(node) || anchor?.contains(node)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, anchor, onClose]);

  // Fokus beim Öffnen in den Kalender
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLButtonElement>('button[data-day][tabindex="0"]')?.focus();
    }, 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const pickingDeparture = target === 'departure' && !!arrival;
  const maxDeparture = useMemo(
    () => (pickingDeparture && arrival ? latestDeparture(a, arrival) : null),
    [a, arrival, pickingDeparture],
  );
  const minNights = arrival ? minStayFor(a, arrival) : 1;

  const dayState = useCallback(
    (day: string): DayState => {
      if (day < a.from || day > addDays(a.to, 1)) return 'past';
      const night = isNightOpen(a, day);
      // heute: die Nacht davor zählt nicht
      const before = day === a.from ? night : isNightOpen(a, addDays(day, -1));
      if (night && before) return 'free';
      if (night) return 'arrival-only';
      if (before) return 'departure-only';
      return 'booked';
    },
    [a],
  );

  const isValidDeparture = useCallback(
    (day: string) => !!arrival && !!maxDeparture && day > arrival && day <= maxDeparture,
    [arrival, maxDeparture],
  );

  const selectable = useCallback(
    (day: string) => {
      if (pickingDeparture && isValidDeparture(day)) return true;
      return isNightOpen(a, day);
    },
    [a, pickingDeparture, isValidDeparture],
  );

  const choose = (day: string) => {
    setMessage('');
    if (pickingDeparture && arrival && isValidDeparture(day)) {
      const nights = nightsBetween(arrival, day);
      if (nights < minNights) {
        setMessage(fill(c.tooShort, { n: minNights }));
        return;
      }
      onChange(arrival, day);
      onTargetChange('arrival');
      return;
    }
    if (isNightOpen(a, day)) {
      onChange(day, undefined);
      onTargetChange('departure');
    }
  };

  // Vorschau beim Überfahren der Abreise
  const rangeEnd =
    departure ?? (pickingDeparture && hover && isValidDeparture(hover) ? hover : undefined);
  const inRange = (day: string) => !!arrival && !!rangeEnd && day > arrival && day < rangeEnd;

  const moveFocus = (day: string) => {
    const next = day < a.from ? a.from : day > addDays(a.to, 1) ? addDays(a.to, 1) : day;
    setFocusDay(next);
    const key = monthKey(next);
    if (monthDiff(view, key) < 0) setView(clampMonth(key));
    else if (monthDiff(view, key) > 1) setView(clampMonth(addMonths(key, -1)));
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLButtonElement>(`button[data-day="${next}"]`)?.focus();
    });
  };

  const onDayKey = (e: React.KeyboardEvent, day: string) => {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const delta = step[e.key];
    if (delta !== undefined) {
      e.preventDefault();
      moveFocus(addDays(day, delta));
    }
  };

  const months = [view, addMonths(view, 1)];
  const monthOptions = useMemo(() => {
    const count = Math.max(0, monthDiff(firstMonth, lastMonth));
    return Array.from({ length: count + 1 }, (_, i) => addMonths(firstMonth, i));
  }, [firstMonth, lastMonth]);
  const lastStart = monthDiff(firstMonth, lastMonth) >= 1 ? addMonths(lastMonth, -1) : lastMonth;

  const monthLabel = (key: string) =>
    new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${key}-01T12:00:00Z`),
    );
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
          new Date(Date.UTC(2024, 0, 1 + i, 12)), // 1.1.2024 war ein Montag
        ),
      ),
    [locale],
  );
  const longDate = (day: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' }).format(
      new Date(`${day}T12:00:00Z`),
    );

  const stateLabel: Record<DayState, string> = {
    past: '',
    free: c.dayFree,
    booked: c.dayBooked,
    'arrival-only': c.dayArrivalOnly,
    'departure-only': c.dayDepartureOnly,
  };

  const nights = nightsBetween(arrival, departure);
  let status: string;
  if (message) status = message;
  else if (a.status === 'loading') status = c.loading;
  else if (arrival && departure) status = `${nights} ${nights === 1 ? s.night : s.nights}`;
  else if (pickingDeparture)
    status = minNights > 1 ? fill(c.minStay, { n: minNights }) : c.chooseDeparture;
  else status = c.chooseArrival;

  if (!open || !mounted) return null;

  const panel = (
    <>
      {narrow && (
        <div aria-hidden="true" className="fixed inset-0 z-[90] bg-rinde/45" onClick={onClose} />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={narrow ? true : undefined}
        aria-label={c.dialog}
        className={`brand-cal fixed z-[91] overflow-y-auto bg-leinen text-rinde shadow-[0_18px_48px_rgba(20,26,22,0.28)] ${
          narrow ? 'rounded-t-[8px]' : 'rounded-[6px]'
        }`}
        style={{
          left: pos.left,
          width: pos.width,
          top: pos.top,
          bottom: pos.bottom,
          maxHeight: pos.maxHeight,
        }}
      >
        <div className="p-4 sm:p-5">
          {/* Kopf: blättern und Monat wählen */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="brand-cal-nav"
              onClick={() => setView((v) => clampMonth(addMonths(v, -1)))}
              disabled={monthDiff(firstMonth, view) <= 0}
              aria-label={c.prev}
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
            <label className="sr-only" htmlFor="brand-cal-jump">
              {c.jump}
            </label>
            <select
              id="brand-cal-jump"
              value={view}
              onChange={(e) => setView(clampMonth(e.target.value))}
              className="min-h-[44px] flex-1 rounded-[4px] border border-zirbe/30 bg-white px-3 text-[1rem] text-rinde [color-scheme:light] sm:flex-none"
            >
              {monthOptions.map((key) => (
                <option key={key} value={key}>
                  {monthLabel(key)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="brand-cal-nav"
              onClick={() => setView((v) => clampMonth(addMonths(v, 1)))}
              disabled={monthDiff(view, lastStart) <= 0}
              aria-label={c.next}
            >
              <ChevronRight size={20} aria-hidden />
            </button>
            <button
              type="button"
              className="brand-cal-nav ml-auto"
              onClick={onClose}
              aria-label={c.close}
            >
              <X size={20} aria-hidden />
            </button>
          </div>

          {/* zwei Monate */}
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {months.map((key) => {
              if (monthDiff(key, lastMonth) < 0) return null;
              return (
                <div key={key}>
                  <p className="mb-2 text-center text-[1rem] font-medium text-zirbe">
                    {monthLabel(key)}
                  </p>
                  <div
                    className="grid grid-cols-7 gap-[3px]"
                    role="grid"
                    aria-label={monthLabel(key)}
                  >
                    {weekdays.map((w) => (
                      <span
                        key={w}
                        role="columnheader"
                        className="pb-1 text-center text-[0.75rem] uppercase tracking-wide text-rinde/60"
                      >
                        {w}
                      </span>
                    ))}
                    {monthGrid(key).map((day, i) => {
                      if (!day) return <span key={`gap-${i}`} aria-hidden="true" />;
                      const state = dayState(day);
                      const isStart = day === arrival;
                      const isEnd = day === rangeEnd;
                      const can = state !== 'past' && selectable(day);
                      const label = [longDate(day), stateLabel[state]].filter(Boolean).join(', ');
                      return (
                        <button
                          key={day}
                          type="button"
                          data-day={day}
                          data-state={state}
                          data-range={
                            isStart || isEnd ? 'edge' : inRange(day) ? 'inside' : undefined
                          }
                          tabIndex={day === focusDay ? 0 : -1}
                          aria-disabled={!can}
                          aria-pressed={isStart || isEnd}
                          aria-label={label}
                          className="brand-cal-day"
                          onClick={() => can && choose(day)}
                          onMouseEnter={() => setHover(day)}
                          onMouseLeave={() => setHover(null)}
                          onFocus={() => setFocusDay(day)}
                          onKeyDown={(e) => onDayKey(e, day)}
                        >
                          {Number(day.slice(8))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legende */}
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.875rem] text-rinde/80">
            <li className="flex items-center gap-2">
              <span className="brand-cal-swatch" data-state="free" aria-hidden="true" />
              {c.free}
            </li>
            <li className="flex items-center gap-2">
              <span className="brand-cal-swatch" data-state="booked" aria-hidden="true" />
              {c.booked}
            </li>
            <li className="flex items-center gap-2">
              <span className="brand-cal-swatch" data-state="arrival-only" aria-hidden="true" />
              {c.changeover}
            </li>
            <li className="flex items-center gap-2">
              <span className="brand-cal-swatch" data-range="edge" aria-hidden="true" />
              {c.selected}
            </li>
          </ul>
          {a.status === 'error' && (
            <p className="mt-2 text-[0.875rem] text-rinde/75">{c.unavailable}</p>
          )}
          {a.status === 'ready' && (
            <p className="mt-2 text-[0.875rem] text-rinde/65">
              {fill(c.bookableUntil, {
                date: new Intl.DateTimeFormat(locale, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(`${a.to}T12:00:00Z`)),
              })}
            </p>
          )}

          {/* Fuß: Status, zurücksetzen, anfragen */}
          <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 flex flex-wrap items-center gap-3 border-t border-zirbe/15 bg-leinen px-4 pb-4 pt-4 sm:-mx-5 sm:-mb-5 sm:px-5 sm:pb-5">
            <p className="min-w-0 flex-1 text-[0.9375rem] text-rinde" aria-live="polite">
              {status}
            </p>
            {(arrival || departure) && (
              <button
                type="button"
                className="min-h-[44px] px-2 text-[0.9375rem] text-zirbe underline underline-offset-4 hover:no-underline"
                onClick={() => {
                  setMessage('');
                  onChange(undefined, undefined);
                  onTargetChange('arrival');
                }}
              >
                {c.reset}
              </button>
            )}
            {arrival && departure ? (
              <button type="button" className="brand-cta brand-cta--compact" onClick={onBook}>
                {t.brand.book}
              </button>
            ) : (
              <button
                type="button"
                className="min-h-[44px] rounded-[4px] bg-zirbe px-4 text-[0.9375rem] text-leinen hover:bg-[#2f4a41]"
                onClick={onClose}
              >
                {c.done}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
