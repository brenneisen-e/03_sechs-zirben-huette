// Öffentliche Verfügbarkeit für den Kalender der Website (BookingSearch).
//
// Liest aus Beds24 nur, welche Nächte gesperrt/belegt sind und den
// Mindestaufenthalt — keine Preise, keine Gastdaten. Zeitraum: heute bis zum
// „Buchbar bis“-Datum (bookingHorizon.ts), sonst bis zum Ende des
// Beds24-Fensters (rund zwei Jahre). Zwischengespeichert in
// settings.public_availability_cache; der Beds24-Webhook leert den Speicher
// bei jeder Buchung, damit belegte Zeiträume sofort erscheinen.

import { addDaysIso, fetchBeds24Availability, getSetting, setSetting } from '@/lib/server/beds24';
import { todayVienna } from '@/lib/server/bookingCutoff';

const KEY_CACHE = 'public_availability_cache';
const KEY_LAST_ATTEMPT = 'public_availability_last_attempt';
const KEY_HORIZON = 'booking_horizon';

const MAX_AGE_MS = 10 * 60 * 1000;
/** Nach einem Fehlschlag Beds24 frühestens nach dieser Zeit erneut fragen */
const RETRY_AFTER_MS = 2 * 60 * 1000;
/** Beds24 führt rund zwei Jahre im Voraus */
const WINDOW_DAYS = 729;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface PublicAvailability {
  /** erste angezeigte Nacht (heute) */
  from: string;
  /** letzte buchbare Nacht */
  to: string;
  /** gesperrte Nächte als Zeiträume [erste, letzte Nacht] */
  closed: [string, string][];
  /** Mindestaufenthalt je Anreisenacht als Zeiträume [erste, letzte Nacht, Nächte] */
  minStay: [string, string, number][];
  fetchedAt: string;
}

function toRuns(nights: string[]): [string, string][] {
  const runs: [string, string][] = [];
  for (const night of nights) {
    const last = runs.at(-1);
    if (last && addDaysIso(last[1], 1) === night) last[1] = night;
    else runs.push([night, night]);
  }
  return runs;
}

function minStayRuns(map: Record<string, number>): [string, string, number][] {
  const runs: [string, string, number][] = [];
  for (const night of Object.keys(map).sort()) {
    const value = map[night];
    if (!value) continue;
    const last = runs.at(-1);
    if (last && last[2] === value && addDaysIso(last[1], 1) === night) last[1] = night;
    else runs.push([night, night, value]);
  }
  return runs;
}

function parseCache(raw: string | null): PublicAvailability | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PublicAvailability;
    return data && Array.isArray(data.closed) && typeof data.fetchedAt === 'string' ? data : null;
  } catch {
    return null;
  }
}

async function refresh(db: D1Database): Promise<PublicAvailability> {
  const today = todayVienna();
  const horizon = await getSetting(db, KEY_HORIZON).catch(() => null);
  const windowEnd = addDaysIso(today, WINDOW_DAYS);
  const to = horizon && ISO_DATE.test(horizon) && horizon < windowEnd ? horizon : windowEnd;

  const { availability, error } = await fetchBeds24Availability(db, today, to);
  if (!availability) throw new Error(error || 'Beds24 nicht erreichbar');

  const result: PublicAvailability = {
    from: today,
    to,
    closed: toRuns(availability.closedNights),
    minStay: minStayRuns(availability.minStay),
    fetchedAt: new Date().toISOString(),
  };
  await setSetting(db, KEY_CACHE, JSON.stringify(result));
  return result;
}

export async function getPublicAvailability(db: D1Database): Promise<PublicAvailability | null> {
  const cached = parseCache(await getSetting(db, KEY_CACHE).catch(() => null));
  const age = cached ? Date.now() - Date.parse(cached.fetchedAt) : Infinity;
  if (cached && age < MAX_AGE_MS && cached.from === todayVienna()) return cached;

  const lastAttempt = Date.parse((await getSetting(db, KEY_LAST_ATTEMPT).catch(() => null)) ?? '');
  if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < RETRY_AFTER_MS) return cached;
  await setSetting(db, KEY_LAST_ATTEMPT, new Date().toISOString());
  try {
    return await refresh(db);
  } catch {
    return cached;
  }
}

/** Zwischenspeicher verwerfen (neue/geänderte Buchung, „Buchbar bis“ geändert) */
export async function invalidatePublicAvailability(db: D1Database): Promise<void> {
  await db
    .prepare('DELETE FROM settings WHERE key IN (?, ?)')
    .bind(KEY_CACHE, KEY_LAST_ATTEMPT)
    .run()
    .catch(() => undefined);
}
