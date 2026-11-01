// „Buchbar bis“: Alles nach einem festen Datum bleibt bei Beds24 gesperrt.
//
// Beds24 schiebt sein Buchungsfenster (rund zwei Jahre) jeden Tag um einen Tag
// weiter. Jeder neu hinzukommende Tag startet mit den Standardwerten — also
// frei, und die Portale setzen ihren eigenen Standardpreis an. Ist hier ein
// Datum eingetragen, sperrt der tägliche Lauf (derselbe wie beim
// Buchungsschluss, siehe bookingCutoff.ts) jede noch freie Nacht danach.
//
// Spätere Freigabe: Datum nach hinten verschieben und die Nächte bis zum neuen
// Datum gezielt freigeben (releaseHorizonRange). Freigegeben werden nur Nächte
// ohne Buchung — weder in der Gästedatenbank noch bei Beds24.

import { writeAppLog } from '@/lib/server/appLog';
import {
  addDaysIso,
  BEDS24_API,
  beds24ResultError,
  fetchBeds24Availability,
  getBeds24AccessToken,
  getPropertyId,
  getSetting,
  parseJsonSafe,
  setBeds24Availability,
  setSetting,
} from '@/lib/server/beds24';
import { todayVienna } from '@/lib/server/bookingCutoff';
import { invalidatePublicAvailability } from '@/lib/server/publicAvailability';

const KEY_HORIZON = 'booking_horizon';
/** `${heute}|${datum}` des letzten erfolgreichen Laufs — ein neues Datum löst erneut aus */
const KEY_LAST_RUN = 'booking_horizon_last_run';

/** Bis hierhin sperren: etwas über das Beds24-Fenster von rund zwei Jahren hinaus */
const WINDOW_DAYS = 740;
/** Rückfall, falls Beds24 Tage jenseits seines Fensters ablehnt */
const WINDOW_DAYS_FALLBACK = 729;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface BookingHorizonStatus {
  horizon: string | null;
  today: string;
  windowEnd: string;
  lastRun: string | null;
}

async function getHorizon(db: D1Database): Promise<string | null> {
  const value = await getSetting(db, KEY_HORIZON).catch(() => null);
  return value && ISO_DATE.test(value) ? value : null;
}

export async function getBookingHorizonStatus(db: D1Database): Promise<BookingHorizonStatus> {
  const today = todayVienna();
  const lastRun = await getSetting(db, KEY_LAST_RUN).catch(() => null);
  return {
    horizon: await getHorizon(db),
    today,
    windowEnd: addDaysIso(today, WINDOW_DAYS),
    lastRun: lastRun ? (lastRun.split('|')[0] ?? null) : null,
  };
}

/** Aufeinanderfolgende Nächte zu Zeiträumen zusammenfassen (`to` = letzte Nacht). */
function toRuns(nights: string[]): { from: string; to: string }[] {
  const runs: { from: string; to: string }[] = [];
  for (const night of nights) {
    const last = runs.at(-1);
    if (last && addDaysIso(last.to, 1) === night) last.to = night;
    else runs.push({ from: night, to: night });
  }
  return runs;
}

function nightsBetween(from: string, to: string): string[] {
  const nights: string[] = [];
  for (let day = from; day <= to && nights.length < 1000; day = addDaysIso(day, 1)) {
    nights.push(day);
  }
  return nights;
}

export type BookingHorizonResult =
  | 'disabled'
  | 'already_done'
  | 'already_closed'
  | 'closed'
  | 'error';

/**
 * Alle noch freien Nächte nach dem „Buchbar bis“-Datum sperren.
 * Mehrfache Aufrufe am selben Tag kosten nur einen Datenbankzugriff.
 */
export async function runBookingHorizon(
  db: D1Database,
  options: { force?: boolean } = {},
): Promise<{ result: BookingHorizonResult; closedNights?: number; error?: string }> {
  const horizon = await getHorizon(db);
  if (!horizon) return { result: 'disabled' };

  const today = todayVienna();
  const runKey = `${today}|${horizon}`;
  if (!options.force && (await getSetting(db, KEY_LAST_RUN)) === runKey) {
    return { result: 'already_done' };
  }

  const firstBlocked = addDaysIso(horizon, 1);
  const from = firstBlocked > today ? firstBlocked : today;
  const to = addDaysIso(today, WINDOW_DAYS);

  const { availability, error } = await fetchBeds24Availability(db, from, to);
  if (!availability) {
    await writeAppLog(db, 'error', 'buchbar-bis', 'run', 'Beds24 nicht erreichbar', error);
    return { result: 'error', error };
  }

  const closed = new Set(availability.closedNights);
  const open = nightsBetween(from, to).filter((night) => !closed.has(night));
  if (open.length === 0) {
    await setSetting(db, KEY_LAST_RUN, runKey);
    return { result: 'already_closed', closedNights: 0 };
  }

  const write = (nights: string[]) =>
    setBeds24Availability(
      db,
      availability.roomId,
      toRuns(nights).map((r) => ({ ...r, numAvail: 0 as const })),
    );

  let written = open;
  let set = await write(written);
  if (!set.success) {
    // Beds24 lehnt evtl. Tage jenseits seines Fensters ab — dann ohne diese
    const fallbackEnd = addDaysIso(today, WINDOW_DAYS_FALLBACK);
    written = open.filter((night) => night <= fallbackEnd);
    if (written.length > 0 && written.length < open.length) set = await write(written);
  }
  if (!set.success) {
    // Nicht als erledigt vermerken — der nächste Lauf versucht es erneut
    await writeAppLog(
      db,
      'error',
      'buchbar-bis',
      'run',
      `Sperre nach dem ${horizon} von Beds24 abgelehnt`,
      set.error,
    );
    return { result: 'error', error: set.error };
  }

  await setSetting(db, KEY_LAST_RUN, runKey);
  const runs = toRuns(written);
  await writeAppLog(
    db,
    'info',
    'buchbar-bis',
    'run',
    `${written.length} Nächte nach dem ${horizon} bei Beds24 gesperrt`,
    runs.map((r) => (r.from === r.to ? r.from : `${r.from} – ${r.to}`)).join(', '),
  );
  return { result: 'closed', closedNights: written.length };
}

/** Datum setzen ('' = aus). Ein gesetztes Datum greift sofort. */
export async function setBookingHorizon(
  db: D1Database,
  value: string,
): Promise<{ result: BookingHorizonResult | 'saved'; closedNights?: number; error?: string }> {
  if (value && (!ISO_DATE.test(value) || value < todayVienna())) {
    return { result: 'error', error: 'Ungültiges Datum — es muss heute oder später liegen' };
  }
  const previous = await getHorizon(db);
  await setSetting(db, KEY_HORIZON, value);
  await invalidatePublicAvailability(db);
  await writeAppLog(
    db,
    'info',
    'buchbar-bis',
    'setting',
    value
      ? `„Buchbar bis“ auf ${value} gesetzt${previous ? ` (vorher ${previous})` : ''}`
      : `„Buchbar bis“ abgeschaltet${previous ? ` (vorher ${previous})` : ''}`,
  );
  if (!value) return { result: 'saved' };
  return runBookingHorizon(db, { force: true });
}

/** Belegte Nächte laut Beds24 (alle Kanäle) im Zeitraum. */
async function beds24BookedNights(
  db: D1Database,
  from: string,
  to: string,
): Promise<{ nights?: Set<string>; error?: string }> {
  const propertyId = await getPropertyId(db);
  if (!propertyId) return { error: 'Beds24-Unterkunft im Admin Center nicht festgelegt' };
  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { error: error || 'Kein Beds24-Zugang' };

  const nights = new Set<string>();
  // Beds24 liefert seitenweise — bei einer Hütte genügen wenige Seiten
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `${BEDS24_API}/bookings?propertyId=${propertyId}&departureFrom=${addDaysIso(from, 1)}` +
        `&arrivalTo=${to}&page=${page}`,
      { headers: { token, Accept: 'application/json' } },
    );
    const parsed = await parseJsonSafe(res);
    if (!res.ok || !parsed.ok) return { error: `Beds24 antwortete mit HTTP ${res.status}` };
    const apiError = beds24ResultError(parsed.data);
    if (apiError) return { error: apiError };

    const body = parsed.data as { data?: unknown; pages?: { nextPageExists?: boolean } };
    const rows = (Array.isArray(body.data) ? body.data : []) as {
      arrival?: string;
      departure?: string;
      status?: string;
    }[];
    for (const b of rows) {
      if (!b.arrival || !b.departure) continue;
      if (b.status === 'cancelled' || b.status === 'inquiry') continue;
      for (const night of nightsBetween(b.arrival, addDaysIso(b.departure, -1))) {
        nights.add(night);
      }
    }
    if (!body.pages?.nextPageExists) return { nights };
  }
  return { error: 'Zu viele Buchungen im Zeitraum — bitte kürzeren Zeitraum freigeben' };
}

async function ownBookedNights(db: D1Database, from: string, to: string): Promise<Set<string>> {
  const { results } = await db
    .prepare(
      `SELECT arrival_date, departure_date FROM bookings
        WHERE status != 'cancelled' AND arrival_date <= ? AND departure_date > ?`,
    )
    .bind(to, from)
    .all<{ arrival_date: string; departure_date: string }>();
  const nights = new Set<string>();
  for (const b of results || []) {
    for (const night of nightsBetween(b.arrival_date, addDaysIso(b.departure_date, -1))) {
      nights.add(night);
    }
  }
  return nights;
}

/**
 * Gesperrte Nächte im Zeitraum wieder freigeben — nur bis zum aktuellen
 * „Buchbar bis“-Datum (danach würde der nächste Lauf sie ohnehin sperren) und
 * nur Nächte ohne Buchung.
 */
export async function releaseHorizonRange(
  db: D1Database,
  fromInput: string,
  toInput: string,
): Promise<{ success: boolean; released?: number; skippedBooked?: number; error?: string }> {
  if (!ISO_DATE.test(fromInput) || !ISO_DATE.test(toInput)) {
    return { success: false, error: 'Ungültiger Zeitraum' };
  }
  const today = todayVienna();
  const horizon = await getHorizon(db);
  const from = fromInput < today ? today : fromInput;
  const limit = horizon || addDaysIso(today, WINDOW_DAYS);
  const to = toInput > limit ? limit : toInput;
  if (from > to) return { success: false, error: 'Zeitraum liegt nach dem „Buchbar bis“-Datum' };

  const { availability, error } = await fetchBeds24Availability(db, from, to);
  if (!availability) return { success: false, error };
  const beds24 = await beds24BookedNights(db, from, to);
  if (!beds24.nights) return { success: false, error: beds24.error };
  const own = await ownBookedNights(db, from, to);

  const closed = availability.closedNights;
  const booked = closed.filter((n) => beds24.nights?.has(n) || own.has(n));
  const release = closed.filter((n) => !beds24.nights?.has(n) && !own.has(n));
  if (release.length === 0) return { success: true, released: 0, skippedBooked: booked.length };

  const set = await setBeds24Availability(
    db,
    availability.roomId,
    toRuns(release).map((r) => ({ ...r, numAvail: 1 as const })),
  );
  if (!set.success) return { success: false, error: set.error };

  await writeAppLog(
    db,
    'info',
    'buchbar-bis',
    'release',
    `${release.length} Nächte von ${from} bis ${to} freigegeben` +
      (booked.length > 0 ? ` (${booked.length} gebuchte Nächte bleiben gesperrt)` : ''),
  );
  return { success: true, released: release.length, skippedBooked: booked.length };
}
