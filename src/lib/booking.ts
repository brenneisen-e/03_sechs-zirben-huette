// Direktbuchung über Beds24: Buchungsformular der Unterkunft 359833, nur das
// Zimmer 741929 („Sechszirbenhütte Falkert 1.700 m“). Preise, Endreinigung,
// Ortstaxe, Hund, Wäschepaket, Anzahlung und Last-Minute-Rabatte rechnet
// Beds24 selbst — die Website zeigt keine Preise.
//
// Die Suche (Anreise, Abreise, Personen; Hero und Buchungsbereich) springt mit
// „Anfragen“ direkt in das Beds24-Formular mit Preisaufstellung und
// Gästedaten (br1-<Zimmer>=Book), in einem neuen Fenster. Kein eingebetteter
// Beds24-Kalender mehr (Entscheidung Eike/Malte, 20.10.2026). Ein Zeitraum in
// der Adresse (?anreise=…&abreise=…&erwachsene=…&kinder=…) füllt die Suche vor.

export const BEDS24_PROP_ID = 359833;
export const BEDS24_ROOM_ID = 741929;
export const MAX_GUESTS = 5;

export interface BookingQuery {
  /** erste Nacht, YYYY-MM-DD */
  arrival?: string;
  /** Abreisetag, YYYY-MM-DD */
  departure?: string;
  adults: number;
  children: number;
}

export const DEFAULT_QUERY: BookingQuery = { adults: 2, children: 0 };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

/** Nächte zwischen Anreise und Abreise (0, wenn unvollständig oder verdreht) */
export function nightsBetween(arrival?: string, departure?: string): number {
  if (!isIsoDate(arrival) || !isIsoDate(departure)) return 0;
  const ms = Date.parse(`${departure}T12:00:00Z`) - Date.parse(`${arrival}T12:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Heute in Österreich als YYYY-MM-DD */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

/** Zeitraum aus der Adresse lesen; Ungültiges fällt weg */
export function readBookingQuery(params: URLSearchParams): BookingQuery {
  const arrival = params.get('anreise');
  const departure = params.get('abreise');
  const adults = clampInt(params.get('erwachsene'), 1, MAX_GUESTS, DEFAULT_QUERY.adults);
  const children = clampInt(params.get('kinder'), 0, MAX_GUESTS - adults, 0);
  const query: BookingQuery = { adults, children };
  if (isIsoDate(arrival) && arrival >= todayIso()) {
    query.arrival = arrival;
    if (isIsoDate(departure) && nightsBetween(arrival, departure) > 0) query.departure = departure;
  }
  return query;
}

const BEDS24_LANGS = new Set(['de', 'en', 'it', 'sl', 'nl']);

/** Direktlink ins Beds24-Buchungsformular; null ohne vollständigen Zeitraum */
export function beds24FormUrl(query: BookingQuery, language: string): string | null {
  const nights = nightsBetween(query.arrival, query.departure);
  if (!query.arrival || nights < 1) return null;
  const params = new URLSearchParams({
    propid: String(BEDS24_PROP_ID),
    roomid: String(BEDS24_ROOM_ID),
    lang: BEDS24_LANGS.has(language) ? language : 'de',
    referer: 'Website',
    hideheader: '1',
    checkin: query.arrival,
    numnight: String(nights),
    numadult: String(query.adults),
    numchild: String(query.children),
    // überspringt die Zimmerauswahl: direkt Preisaufstellung und Gästedaten
    [`br1-${BEDS24_ROOM_ID}`]: 'Book',
  });
  return `https://beds24.com/booking2.php?${params.toString()}`;
}

/** Formular in neuem Fenster öffnen; blockiert der Browser das, im selben */
export function openBeds24Form(url: string): void {
  const win = window.open(url, '_blank');
  if (win) win.opener = null;
  else window.location.assign(url);
}
