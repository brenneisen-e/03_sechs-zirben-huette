'use client';

// Verfügbarkeit für den Kalender der Buchungssuche (BookingSearch →
// AvailabilityCalendar). Daten von /api/availability (Beds24, nur gesperrte
// Nächte und Mindestaufenthalt). Einmal je Seitenaufruf geladen und zwischen
// allen Suchfeldern geteilt (Hero-Leiste, Hero schmal, Buchungsbereich).

import { useEffect, useState } from 'react';
import { addDays, todayIso } from '@/lib/booking';

/** Beds24 führt rund zwei Jahre im Voraus — Rückfall ohne Daten */
const FALLBACK_WINDOW_DAYS = 729;

interface ApiResponse {
  available?: boolean;
  from?: string;
  to?: string;
  closed?: [string, string][];
  minStay?: [string, string, number][];
}

export interface Availability {
  status: 'loading' | 'ready' | 'error';
  /** erste Nacht (heute) */
  from: string;
  /** letzte buchbare Nacht */
  to: string;
  closed: Set<string>;
  minStay: Map<string, number>;
}

function expand(from: string, to: string, visit: (night: string) => void) {
  let guard = 0;
  for (let night = from; night <= to && guard < 1000; night = addDays(night, 1), guard++) {
    visit(night);
  }
}

function fromApi(data: ApiResponse): Availability | null {
  if (!data.available || !data.from || !data.to) return null;
  const closed = new Set<string>();
  for (const [a, b] of data.closed ?? []) expand(a, b, (n) => closed.add(n));
  const minStay = new Map<string, number>();
  for (const [a, b, n] of data.minStay ?? []) expand(a, b, (night) => minStay.set(night, n));
  return { status: 'ready', from: data.from, to: data.to, closed, minStay };
}

function fallback(status: 'loading' | 'error'): Availability {
  const today = todayIso();
  return {
    status,
    from: today,
    to: addDays(today, FALLBACK_WINDOW_DAYS),
    closed: new Set(),
    minStay: new Map(),
  };
}

let pending: Promise<Availability> | null = null;

function loadAvailability(): Promise<Availability> {
  pending ??= fetch('/api/availability')
    .then((res) => (res.ok ? (res.json() as Promise<ApiResponse>) : {}))
    .then((data) => fromApi(data) ?? fallback('error'))
    .catch(() => {
      pending = null; // beim nächsten Öffnen erneut versuchen
      return fallback('error');
    });
  return pending;
}

/** Lädt erst, wenn `enabled` (Kalender geöffnet bzw. Seite bereit) */
export function useAvailability(enabled: boolean): Availability {
  const [state, setState] = useState<Availability>(() => fallback('loading'));
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void loadAvailability().then((a) => {
      if (active) setState(a);
    });
    return () => {
      active = false;
    };
  }, [enabled]);
  return state;
}

/** Nacht buchbar? (innerhalb des Fensters und nicht gesperrt) */
export function isNightOpen(a: Availability, night: string): boolean {
  return night >= a.from && night <= a.to && !a.closed.has(night);
}

/** Späteste Abreise bei Anreise `arrival`: Tag nach der letzten freien Nacht am Stück */
export function latestDeparture(a: Availability, arrival: string): string | null {
  if (!isNightOpen(a, arrival)) return null;
  let night = arrival;
  let guard = 0;
  while (isNightOpen(a, addDays(night, 1)) && guard < 1000) {
    night = addDays(night, 1);
    guard++;
  }
  return addDays(night, 1);
}

export function minStayFor(a: Availability, arrival: string): number {
  return a.minStay.get(arrival) ?? 1;
}
