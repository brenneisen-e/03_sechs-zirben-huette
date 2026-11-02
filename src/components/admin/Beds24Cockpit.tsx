'use client';

import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Euro,
  Loader2,
  MessageSquare,
  RefreshCw,
  Save,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';

import Beds24BlockSync from '@/components/admin/Beds24BlockSync';
import Beds24History from '@/components/admin/Beds24History';
import Beds24IcalSources from '@/components/admin/Beds24IcalSources';
import Beds24SeasonSync from '@/components/admin/Beds24SeasonSync';
import BookingCutoffSetting from '@/components/admin/BookingCutoffSetting';
import BookingHorizonSetting from '@/components/admin/BookingHorizonSetting';
import { beds24Source } from '@/lib/beds24Channels';
import { parseArrivalTime } from '@/lib/bookingComComments';
import {
  buildGuestEarlyWelcomeText,
  buildPreCheckinText,
  buildGuestReviewText,
  buildGuestWelcomeText,
  daysUntilArrival,
  EARLY_WELCOME_THRESHOLD_DAYS,
  germanSalutation,
} from '@/lib/guestTemplates';

// Beds24-Cockpit: Jahresübersicht (12 Monate) mit Preis, Mindestaufenthalt
// und Verfügbarkeit pro Nacht. Mehrere Tage lassen sich mit gedrückter
// linker Maustaste markieren und über ein Modal gesammelt ändern
// (POST /inventory/rooms/calendar). Buchungen sind klickbar und zeigen
// alle Gastdaten + Nachrichten; sie können in die Gästedatenbank
// übernommen und einem Gast zugeordnet werden.

interface DayInfo {
  price1?: number;
  minStay?: number;
  maxStay?: number;
  numAvail?: number;
  /** Weitere Preis-Slots (price2 … price16) — je Beds24-Angebot einer */
  extraPrices?: Record<string, number>;
}

// Zuletzt gewähltes Beds24-Zimmer im Cockpit
const ROOM_STORAGE_KEY = 'beds24_cockpit_room';

function readStoredRoomId(): string | null {
  try {
    return localStorage.getItem(ROOM_STORAGE_KEY);
  } catch {
    return null;
  }
}

// Ergebnis der Buchbarkeits-Gegenprobe (/inventory/rooms/offers)
interface StayOffer {
  offerId?: number;
  offerName?: string;
  price?: number;
}

interface BookingNight {
  name: string;
  source: string;
  /** Identifiziert die Buchung, damit Wechseltage eine Trennlinie bekommen */
  refId: string;
}

interface CockpitBooking {
  id: string;
  name: string;
  arrival: string;
  departure: string;
  status: string;
  /** Kanal, wie Beds24 ihn anzeigt (referer) — nur zur Anzeige */
  source: string;
  /** Plattform wie in der Gästedatenbank (siehe beds24Source) */
  platform: string;
  price: string;
  /** Vollständiger Beds24-Datensatz für die Detailansicht */
  raw: Record<string, unknown>;
}

interface CalendarEntry {
  [key: string]: unknown;
  from?: string;
  to?: string;
  numAvail?: number;
  price1?: number;
  minStay?: number;
  maxStay?: number;
}

interface CalendarRoom {
  roomId?: number;
  name?: string;
  calendar?: CalendarEntry[];
}

// Eigene Auslastung als Overlay: lokale Buchungen aus der Gästedatenbank
// und Portal-Belegungen aus den iCal-Feeds (Feratel/FeWo/Booking.com)
interface OwnBooking {
  id?: number;
  guest_id?: number;
  booking_number?: string | null;
  beds24_booking_id?: string | null;
  arrival_date?: string | null;
  departure_date?: string | null;
  platform?: string | null;
  status?: string;
  /** Für den Finanz-Abgleich mit Beds24 */
  additional_costs?: string | null;
  rental_price?: number | null;
  pets?: string | null;
}

interface IcalPeriod {
  start: string;
  end: string;
  summary?: string;
  source?: string;
}

interface GuestOption {
  id: number;
  guest_name: string;
}

interface KurtaxeRate {
  from: string;
  to: string;
  rate: number;
}

interface GuestToken {
  booking_id: number;
  access_code: string;
}

// Einstellungen, die nur im Beds24-UI möglich sind — als abhakbare Checkliste
const BEDS24_CHECKLIST: Array<{ key: string; label: string }> = [
  { key: 'export2y', label: 'Channel Manager: „Daten exportieren" auf 2 Jahre' },
  { key: 'collect', label: 'Channel Manager: „Channel Collect Zahlungen" = Kosten und Zahlung' },
  {
    key: 'booking',
    label: 'Booking.com: Channel Manager → Booking.com → Mapping (Zimmer + Ratenplan) aktiv',
  },
  { key: 'messaging', label: 'Booking.com-Channel: Messaging aktiviert' },
  {
    key: 'feratel',
    label: 'Feratel: Channel Manager → Feratel → Zugangsdaten und Mapping (Zimmer aktivieren)',
  },
  {
    key: 'vrbo',
    label:
      'FeWo-direkt: Channel Manager → Vrbo → Mapping (Zimmer aktivieren) und Account („Connect with Vrbo")',
  },
  {
    key: 'airbnb',
    label: 'Airbnb: Channel Manager → Airbnb → Account verbunden und Inserat dem Zimmer zugeordnet',
  },
  { key: 'icalOff', label: 'Alte iCal-Synchronisation der Portale untereinander abgeschaltet' },
  {
    key: 'webhook',
    label:
      'Webhook-URL bei der Unterkunft Sechszirbenhütte eingetragen (bei keiner anderen Unterkunft)',
  },
  {
    key: 'imports',
    label: 'Bei jedem Kanal „Anstehende Buchungen importieren“ ausgeführt',
  },
  {
    key: 'cutoffWorkflow',
    label: 'GitHub-Workflow „Buchungsschluss" aktiv (nur bei „bis Vortag")',
  },
];

/**
 * Länderkürzel des Gastes für die Flagge in der Gästedatenbank.
 *
 * Beds24 führt zwei Felder: `country` ist Freitext ("Germany"), `country2` das
 * 2-Buchstaben-Kürzel ("DE"). Für die Flaggen-URL zählt nur das Kürzel —
 * Freitext wird nur übernommen, wenn er zufällig schon eines ist.
 */
function guestCountryCode(raw: Record<string, unknown>): string {
  const code = (rawStr(raw, 'country2') || '').trim();
  if (/^[A-Za-z]{2}$/.test(code)) return code.toUpperCase();
  const free = (rawStr(raw, 'country') || '').trim();
  if (/^[A-Za-z]{2}$/.test(free)) return free.toUpperCase();
  return '';
}

/**
 * Kontaktdaten des Gastes aus der Beds24-Buchung.
 *
 * Beds24 führt Festnetz (`phone`) und Handy (`mobile`) getrennt, die
 * Gästedatenbank hat dagegen nur ein Telefonfeld. Deshalb genau eine Nummer
 * übernehmen, bevorzugt die Handynummer: darüber ist der Gast auch auf der
 * Anreise erreichbar.
 */
function guestContact(raw: Record<string, unknown>): { email: string; phone: string } {
  const email = rawStr(raw, 'email').trim();
  const mobile = rawStr(raw, 'mobile').trim();
  const phone = rawStr(raw, 'phone').trim();
  return { email, phone: mobile || phone };
}

// Anrede-Infos aus der Beds24-Buchung: Anrede (title) und Nachname aus den
// Rohdaten, damit die deutsche Vorlage „Liebe Frau X" / „Lieber Herr X" nutzt
function salutationInfo(b: CockpitBooking, gender?: 'female' | 'male' | 'neutral') {
  return {
    fullName: b.name,
    title: rawStr(b.raw, 'title'),
    lastName: rawStr(b.raw, 'lastName'),
    gender,
  };
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoParts(iso: string): [number, number, number] {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number);
  return [y, m, d];
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = isoParts(iso);
  const date = new Date(y, m - 1, d + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function diffDaysIso(fromIso: string, toIso: string): number {
  const [y1, m1, d1] = isoParts(fromIso);
  const [y2, m2, d2] = isoParts(toIso);
  const ms = new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime();
  return Math.round(ms / 86400000);
}

function formatGermanDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function rawStr(raw: Record<string, unknown>, key: string): string {
  const v = raw[key];
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return '';
  return String(v);
}

function rawArray(raw: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = raw[key];
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

// Felder, in denen Booking.com Gastwünsche und Anreisezeiten ablegen kann.
// Laut Beds24-API-Spec ist `arrivalTime` das dafür vorgesehene Feld (Freitext,
// 100 Zeichen) — die Portale befüllen aber nicht alle dasselbe, deshalb werden
// die Nachbarfelder gleich mit angezeigt.
const GUEST_REQUEST_FIELDS: { key: string; label: string }[] = [
  { key: 'arrivalTime', label: 'Anreisezeit (arrivalTime)' },
  { key: 'comments', label: 'Kommentar des Gastes (comments)' },
  { key: 'message', label: 'Nachricht zur Buchung (message)' },
  { key: 'notes', label: 'Notizen (notes)' },
  { key: 'groupNote', label: 'Gruppennotiz (groupNote)' },
];

// Alle einfachen Felder des Beds24-Datensatzes mit Inhalt — für die Diagnose,
// in welchem Feld ein Portal eine Anfrage tatsächlich ablegt.
function rawScalarFields(raw: Record<string, unknown>): { key: string; value: string }[] {
  return Object.keys(raw)
    .sort()
    .map((key) => ({ key, value: rawStr(raw, key).trim() }))
    .filter((f) => f.value !== '');
}

// Beds24-Rechnungspositionen enthalten bei importierten Buchungen teils
// unaufgelöste Vorlagen-Platzhalter — durch echte Werte ersetzen
function resolveInvoiceDescription(desc: string, booking: CockpitBooking): string {
  return desc
    .replace(/\[ROOMNAME1?\]/g, 'Unterkunft')
    .replace(/\[FIRSTNIGHT\]/g, formatGermanDate(booking.arrival))
    .replace(/\[LEAVINGDAY\]/g, formatGermanDate(booking.departure));
}

// Stammt die Buchung von Booking.com? Willkommensnachricht, Gebührenquote und
// Finanzabgleich rechnen mit den Eigenheiten von Booking.com.
function isBookingCom(booking: CockpitBooking): boolean {
  return booking.platform === 'Booking.com';
}

// Nachricht von uns (Gastgeber)? Beds24 markiert Nachrichten des Gastes mit
// source "guest" — alles andere zählt als von uns geschrieben.
function isHostMessage(m: Record<string, unknown>): boolean {
  const src = String(m.source ?? '')
    .trim()
    .toLowerCase();
  return src !== '' && src !== 'guest';
}

// Kurtaxe pro Nacht/Erwachsenem nach den hinterlegten Sätzen (datumsabhängig,
// z.B. 2,70 € bis 31.10.2026, danach 4,50 €) — zahlt der Gast vor Ort
function calcKurtaxe(
  arrival: string,
  departure: string,
  adults: number,
  rates: KurtaxeRate[],
): number {
  if (!arrival || !departure || adults <= 0) return 0;
  let sum = 0;
  let day = arrival;
  let guard = 0;
  while (day < departure && guard < 800) {
    const match = rates.find((r) => day >= r.from && day <= r.to);
    sum += (match?.rate ?? 2.7) * adults;
    day = addDaysIso(day, 1);
    guard++;
  }
  return Math.round(sum * 100) / 100;
}

// Finanzwerte einer Beds24-Buchung aus den Rechnungspositionen ableiten.
// Bewusst als eigenständige Funktion, damit sowohl die Anzeige der geöffneten
// Buchung als auch der Abgleich bestehender Buchungen dieselben Zahlen nutzen.
//
// Wichtig zur Kommission: Beds24 liefert im Feld `commission` bereits die
// Summe aus Kommission UND Zahlungsgebühr (z.B. 447,65 + 31,34 = 478,99).
// Genau dieser Betrag gehört in die Auszahlungsrechnung — wer nur die reine
// Kommission aus der Booking.com-App einträgt, bekommt einen zu hohen
// Auszahlungs- und Überweisungsbetrag.
interface Beds24Finance {
  guestTotal: number;
  /** Kommission und Zahlungsgebühr zusammen — so liefert Beds24 es */
  commission: number;
  /** Reine Kommission ohne Zahlungsgebühr */
  commissionOnly: number;
  /** Zahlungsgebühr der Plattform (aus dem Buchungskommentar) */
  paymentFee: number;
  payout: number;
  kurtaxe: number;
  cityTaxInPrice: boolean;
  cleaningFee: number;
  childrenAges: string;
  /** Haustier-Hinweis, sofern in der Buchung erkennbar */
  pets: string;
}

function computeBeds24Finance(booking: CockpitBooking, rates: KurtaxeRate[]): Beds24Finance {
  const invoiceItems = rawArray(booking.raw, 'invoiceItems');
  const price = Number(rawStr(booking.raw, 'price')) || 0;
  const commission = Number(rawStr(booking.raw, 'commission')) || 0;
  const adults = Number(rawStr(booking.raw, 'numAdult')) || 0;

  // Stadt-/Kurtaxe möglichst aus den echten Rechnungspositionen lesen —
  // sie zählen die korrekte Personenzahl inkl. abgabepflichtiger Jugendlicher.
  const cityTaxFromInvoice = invoiceItems.reduce((sum, item) => {
    if (rawStr(item, 'type') === 'payment') return sum;
    const label = (rawStr(item, 'description') || rawStr(item, 'type') || '').toLowerCase();
    const isCityTax =
      /übernachtung|kurtaxe|kurabgabe|kurbeitrag|ortstaxe|tourismus|n[äa]chtigung|gästetaxe|city tax|tourist tax|visitor tax|bed tax|occupancy tax/.test(
        label,
      );
    if (!isCityTax) return sum;
    const qty = Number(rawStr(item, 'qty')) || 1;
    const amount = Number(rawStr(item, 'amount')) || 0;
    return sum + (Number(rawStr(item, 'lineTotal')) || qty * amount);
  }, 0);

  const cleaningFee = invoiceItems.reduce((sum, item) => {
    if (rawStr(item, 'type') === 'payment') return sum;
    const label = (rawStr(item, 'description') || '').toLowerCase();
    if (!/reinigung|endreinigung|cleaning/.test(label)) return sum;
    const qty = Number(rawStr(item, 'qty')) || 1;
    const amount = Number(rawStr(item, 'amount')) || 0;
    return sum + (Number(rawStr(item, 'lineTotal')) || qty * amount);
  }, 0);

  // Kinderalter aus dem Kommentar („1 child aged 5 1 child aged 9")
  const text = [
    rawStr(booking.raw, 'comments'),
    rawStr(booking.raw, 'notes'),
    rawStr(booking.raw, 'message'),
  ].join(' ');
  const ages: number[] = [];
  const pattern = /(\d+)\s+child(?:ren)?\s+aged\s+(\d+)/gi;
  let match = pattern.exec(text);
  while (match) {
    const count = Number(match[1]) || 1;
    const age = Number(match[2]);
    for (let i = 0; i < count; i++) ages.push(age);
    match = pattern.exec(text);
  }

  // Zahlungsgebühr steht bei Booking.com im Kommentar:
  // „BOOKING NOTE : Payment charge is EUR 22.8592"
  const paymentFeeMatch = /payment charge is\s*(?:EUR|€)?\s*([\d.,]+)/i.exec(text);
  const paymentFee = paymentFeeMatch?.[1]
    ? Math.round(Number(paymentFeeMatch[1].replace(',', '.')) * 100) / 100
    : 0;
  const commissionOnly = Math.round((commission - paymentFee) * 100) / 100;

  // Haustier nur melden, wenn es wirklich in der Buchung steht — entweder als
  // berechnete Position oder als ausdrückliche Angabe im Kommentar. Ein
  // beiläufiges „dog" im Freitext reicht nicht, sonst stehen Hunde in der
  // Buchung, die gar nicht mitkommen.
  const petFeeItem = invoiceItems.some((item) => {
    if (rawStr(item, 'type') === 'payment') return false;
    return /haustier|hund|\bpet\b|\bdog\b/i.test(rawStr(item, 'description') || '');
  });
  const petCountMatch = /(\d+)\s*(?:pets?|haustiere?|hunde?|dogs?)\b/i.exec(text);
  let pets = '';
  if (petCountMatch && Number(petCountMatch[1]) > 0) {
    const count = Number(petCountMatch[1]);
    pets = count === 1 ? '1 Haustier' : `${count} Haustiere`;
  } else if (petFeeItem) {
    pets = 'Haustier';
  }

  const cityTaxInPrice = cityTaxFromInvoice > 0;
  const kurtaxe = cityTaxInPrice
    ? cityTaxFromInvoice
    : calcKurtaxe(booking.arrival, booking.departure, adults, rates);
  // Booking.com erhebt keine Kommission auf die vor Ort zu zahlende Steuer.
  const portalCollects = cityTaxInPrice ? price - kurtaxe : price;
  const payout = Math.round((portalCollects - commission) * 100) / 100;
  const guestTotal = cityTaxInPrice ? price : price + kurtaxe;

  return {
    guestTotal,
    commission,
    commissionOnly,
    paymentFee,
    payout,
    kurtaxe,
    cityTaxInPrice,
    cleaningFee,
    childrenAges: ages.join(','),
    pets,
  };
}

// Zellfarben wie im Gäste-Kalender des Admin Centers: frei = hellgrau,
// belegt = Pastellfarbe je Buchungskanal, An-/Abreisetage diagonal geteilt
function channelHex(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('booking')) {
    return '#bfdbfe'; // blue-200
  }
  if (s.includes('fewo') || s.includes('vrbo') || s.includes('ferienwohnung')) {
    return '#bbf7d0'; // green-200
  }
  if (s.includes('feratel')) {
    return '#fed7aa'; // orange-200
  }
  if (s.includes('airbnb')) {
    return '#fbcfe8'; // pink-200
  }
  return '#d1d5db'; // gray-300 (Privat/unbekannt)
}

const FREE_DAY_HEX = '#f9fafb'; // gray-50

// Vormittag = Abreise bzw. Übernachtung bis heute (Nacht davor),
// Nachmittag = Anreise bzw. Übernachtung ab heute (Nacht ab diesem Tag)
function halfDayCellStyle(
  morning: BookingNight | undefined,
  evening: BookingNight | undefined,
  blockedInBeds24: boolean,
): CSSProperties | undefined {
  if (!morning && !evening) {
    if (blockedInBeds24) {
      return { backgroundColor: '#d1d5db' };
    }
    return undefined; // frei
  }
  const morningHex = morning ? channelHex(morning.source) : FREE_DAY_HEX;
  const eveningHex = evening ? channelHex(evening.source) : FREE_DAY_HEX;
  if (morning && evening) {
    if (morning.refId === evening.refId) {
      return { backgroundColor: morningHex };
    }
    // Wechseltag zweier Buchungen: weiße Trennlinie
    return {
      background: `linear-gradient(to bottom right, ${morningHex} 48%, #ffffff 48%, #ffffff 52%, ${eveningHex} 52%)`,
    };
  }
  return {
    background: `linear-gradient(to bottom right, ${morningHex} 50%, ${eveningHex} 50%)`,
  };
}

// Felder der Beds24-Buchung für die Detailansicht (Label → Key)
const BOOKING_DETAIL_FIELDS: Array<{ label: string; key: string }> = [
  { label: 'E-Mail', key: 'email' },
  { label: 'Telefon', key: 'phone' },
  { label: 'Mobil', key: 'mobile' },
  { label: 'Adresse', key: 'address' },
  { label: 'PLZ', key: 'postcode' },
  { label: 'Ort', key: 'city' },
  { label: 'Land', key: 'country' },
  { label: 'Länderkürzel', key: 'country2' },
  { label: 'Erwachsene', key: 'numAdult' },
  { label: 'Kinder', key: 'numChild' },
  { label: 'Kanal', key: 'referer' },
  { label: 'Booking-Referenz', key: 'apiReference' },
  { label: 'Gebucht am', key: 'bookingTime' },
  { label: 'Kommentar', key: 'comments' },
  { label: 'Notizen', key: 'notes' },
];

// Daten für die Übernahme einer Beds24-Buchung in die Gästedatenbank
// (action importBooking). Einzel- und Sammelübernahme nutzen dieselben Werte
// wie die Preisaufstellung im Buchungs-Modal.
function buildImportPayload(b: CockpitBooking, rates: KurtaxeRate[]) {
  const raw = b.raw;
  const finance = computeBeds24Finance(b, rates);
  const contact = guestContact(raw);
  const address = [rawStr(raw, 'address'), rawStr(raw, 'postcode'), rawStr(raw, 'city')]
    .filter(Boolean)
    .join(', ');
  // Booking.com legt die Ankunftszeit als Zeile im Kommentarfeld ab
  const arrivalHint = parseArrivalTime(rawStr(raw, 'comments') || rawStr(raw, 'arrivalTime'));
  // Kommission und Zahlungsgebühr getrennt führen: Beds24 liefert im Feld
  // `commission` die Summe, die Zahlungsgebühr steht im Buchungskommentar.
  const additionalCosts = {
    guest_total_payment: finance.guestTotal || undefined,
    platform_service_fee: finance.commissionOnly || undefined,
    payment_processing_fee: finance.paymentFee || undefined,
    payout_amount: finance.payout || undefined,
    // Booking.com: Kurtaxe zahlt der Gast vor Ort. Andere Kanäle: steht sie
    // in den Rechnungspositionen, kassiert das Portal.
    kurtaxe_income: finance.kurtaxe,
    cleaning_fee_income: finance.cleaningFee || undefined,
  };
  return {
    arrivalHint,
    guest: {
      name: b.name,
      firstName: rawStr(raw, 'firstName') || null,
      lastName: rawStr(raw, 'lastName') || null,
      email: contact.email || null,
      phone: contact.phone || null,
      address: address || null,
      nationality: guestCountryCode(raw) || null,
    },
    booking: {
      beds24_booking_id: b.id,
      booking_number: rawStr(raw, 'apiReference') || b.id,
      platform: b.platform,
      arrival_date: b.arrival,
      departure_date: b.departure,
      adults: Number(rawStr(raw, 'numAdult')) || 2,
      children: Number(rawStr(raw, 'numChild')) || 0,
      children_ages: finance.childrenAges || null,
      pets: finance.pets || null,
      // Bei Booking.com ist die Auszahlung der Mietpreis; Kurtaxe und
      // Kommission sind darin bereits berücksichtigt.
      rental_price: finance.payout || Number(b.price) || 0,
      additional_costs: JSON.stringify(additionalCosts),
      kurtaxe_cash: isBookingCom(b) || !finance.cityTaxInPrice ? 1 : 0,
      expected_checkin_time: arrivalHint ? arrivalHint.time : null,
      late_checkin_requested: arrivalHint?.isLate ? 1 : 0,
      checkin_time_source: arrivalHint ? 'portal' : null,
    },
  };
}

/**
 * Passende Buchung der Gästedatenbank zu einer Beds24-Buchung: Beds24-ID,
 * dann Buchungsnummer, dann gleicher Zeitraum.
 */
function findOwnBooking(b: CockpitBooking, ownBookings: OwnBooking[]): OwnBooking | undefined {
  const ref = rawStr(b.raw, 'apiReference');
  const active = ownBookings.filter((o) => o.status !== 'cancelled');
  return (
    active.find((o) => !!o.beds24_booking_id && String(o.beds24_booking_id) === b.id) ||
    active.find((o) => {
      const num = (o.booking_number || '').trim();
      return !!num && (num === ref || num === b.id);
    }) ||
    active.find(
      (o) =>
        (o.arrival_date || '').slice(0, 10) === b.arrival &&
        (o.departure_date || '').slice(0, 10) === b.departure,
    )
  );
}

export default function Beds24Cockpit() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState<CalendarRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  // Gewähltes Zimmer merken — sonst springt das Cockpit bei jedem Laden auf
  // das erste Zimmer der Beds24-Antwort zurück
  const storeRoomId = (roomId: number) => {
    try {
      localStorage.setItem(ROOM_STORAGE_KEY, String(roomId));
    } catch {
      /* optional */
    }
  };
  const [bookings, setBookings] = useState<CockpitBooking[]>([]);
  const [ownBookings, setOwnBookings] = useState<OwnBooking[]>([]);
  const [guestNames, setGuestNames] = useState<Record<number, string>>({});
  const [guestList, setGuestList] = useState<GuestOption[]>([]);
  const [icalPeriods, setIcalPeriods] = useState<IcalPeriod[]>([]);
  const [kurtaxeRates, setKurtaxeRates] = useState<KurtaxeRate[]>([]);
  const [pricingSettings, setPricingSettings] = useState<Record<string, string>>({});
  const [guestTokens, setGuestTokens] = useState<GuestToken[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  // Gäste-App-Zugangscode wird gerade automatisch angelegt (Vorlage-Buttons)
  const [creatingToken, setCreatingToken] = useState(false);
  // Anrede für die Vorlagen. 'auto' nimmt die Angabe aus der Buchung —
  // Booking.com liefert sie aber oft nicht, dann wird ohne Herr/Frau
  // angeschrieben. Deshalb hier manuell wählbar.
  const [salutation, setSalutation] = useState<'auto' | 'female' | 'male'>('auto');
  const chosenGender = salutation === 'auto' ? undefined : salutation;
  // Finanz-Abgleich bestehender Buchungen mit Beds24
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');

  // Buchungs-ID → wurde schon eine Nachricht von uns geschrieben?
  // (für die „Willkommensnachricht ausstehend"-Karte; fehlt = unbekannt)
  const [hostMsgMap, setHostMsgMap] = useState<Record<string, boolean>>({});
  const [hostMsgLoading, setHostMsgLoading] = useState(false);

  // Beds24-Einstellungen (per API änderbar) + Checkliste
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [roomMetaList, setRoomMetaList] = useState<Record<string, unknown>[]>([]);
  const [cfInput, setCfInput] = useState('');
  const [cfSaving, setCfSaving] = useState(false);
  const [cfMessage, setCfMessage] = useState('');
  const [cfError, setCfError] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setChecklist(JSON.parse(localStorage.getItem('beds24_checklist') || '{}'));
    } catch {
      /* optional */
    }
  }, []);

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('beds24_checklist', JSON.stringify(next));
      } catch {
        /* optional */
      }
      return next;
    });
  };

  // Anzeigezeitraum in Monaten (12/18/24)
  const [monthsRange, setMonthsRange] = useState(12);

  // Mehrtages-Auswahl per gedrückter linker Maustaste
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Änderungs-Modal
  const [editOpen, setEditOpen] = useState(false);
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formMinStay, setFormMinStay] = useState('');
  const [formAvail, setFormAvail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Buchungs-Modal (Gastdaten + Nachrichten + Zuordnung)
  const [activeBooking, setActiveBooking] = useState<CockpitBooking | null>(null);
  const [rawCopied, setRawCopied] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [messagesError, setMessagesError] = useState('');
  const [assignGuestId, setAssignGuestId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [assignError, setAssignError] = useState('');

  // Gegenprobe „ist 1 Nacht wirklich gesperrt?"
  const [stayCheck, setStayCheck] = useState<{
    nights: number;
    arrival: string;
    offers: StayOffer[];
  } | null>(null);
  const [stayChecking, setStayChecking] = useState(false);
  const [stayCheckError, setStayCheckError] = useState('');

  // Antwort immer als Text lesen und selbst parsen: Bei einem Fehler auf
  // Server-/Plattform-Ebene (z.B. HTTP 502 mit HTML-Body) warf res.json()
  // eine Exception, und im Cockpit stand nur „Verbindungsfehler" ohne
  // erkennbare Ursache.
  const apiCall = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/admin/beds24', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!text) {
      return { success: false, error: `Leere Antwort (HTTP ${res.status})` };
    }
    try {
      return JSON.parse(text) as {
        success?: boolean;
        error?: string;
        data?: unknown;
        url?: string;
        arrival?: string;
        nights?: number;
        offers?: StayOffer[];
        days?: Array<{ price1?: number; minStay?: number; numAvail?: number }>;
        bookingId?: number;
        guestName?: string;
        matched?: string[];
        added?: string[];
        financeUpdated?: boolean;
      };
    } catch {
      return {
        success: false,
        error: `Serverfehler (HTTP ${res.status}): ${text
          .replace(/<[^>]*>/g, ' ')
          .trim()
          .slice(0, 200)}`,
      };
    }
  };

  // Zähler für Bereiche, die nach jedem Laden neu abfragen (Sicherungen)
  const [loadCount, setLoadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadCount((n) => n + 1);
    setError('');
    try {
      const [calRes, bookRes] = await Promise.all([
        apiCall({ action: 'fetch', target: 'calendar', months: monthsRange }),
        apiCall({ action: 'fetch', target: 'bookingsYear', months: monthsRange }),
      ]);

      if (calRes.success && calRes.data && typeof calRes.data === 'object') {
        const data = (calRes.data as { data?: unknown }).data;
        const roomList = Array.isArray(data) ? (data as CalendarRoom[]) : [];
        setRooms(roomList);
        // Zimmerauswahl: zuletzt gewähltes Zimmer wiederherstellen. Ohne das
        // stand das Cockpit immer auf dem ERSTEN Zimmer der Antwort — bei
        // mehreren Zimmern also womöglich auf einem, das gar nicht an
        // Booking.com übertragen wird. Als Vorauswahl deshalb ein Zimmer, für
        // das Beds24 überhaupt Preise führt.
        if (roomList.length > 0) {
          setSelectedRoomId((prev) => {
            if (prev && roomList.some((r) => r.roomId === prev)) return prev;
            const remembered = Number(readStoredRoomId());
            if (remembered && roomList.some((r) => r.roomId === remembered)) return remembered;
            const withPrices = roomList.find((r) =>
              (r.calendar || []).some(
                (entry) => entry.price1 !== undefined && entry.price1 !== null,
              ),
            );
            return withPrices?.roomId ?? roomList[0]?.roomId ?? null;
          });
        }
      } else {
        setError(calRes.error || 'Kalenderdaten konnten nicht geladen werden');
      }

      if (bookRes.success && bookRes.data && typeof bookRes.data === 'object') {
        const data = (bookRes.data as { data?: unknown }).data;
        const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
        const mapped = rows
          .filter((r) => String(r.status || '') !== 'cancelled')
          .map((r) => ({
            id: String(r.id ?? ''),
            name:
              `${String(r.firstName ?? '')} ${String(r.lastName ?? '')}`.trim() ||
              `Buchung #${String(r.id ?? '')}`,
            arrival: String(r.arrival ?? ''),
            departure: String(r.departure ?? ''),
            status: String(r.status ?? ''),
            source: String(r.referer ?? r.channel ?? r.apiSource ?? ''),
            // Ohne Kanalangabe wie im Webhook Booking.com
            platform: beds24Source(r).platform ?? 'Booking.com',
            price: String(r.price ?? ''),
            raw: r,
          }));
        setBookings(mapped);

        // Für laufende/kommende Booking.com-Buchungen prüfen, ob wir schon
        // eine Nachricht geschrieben haben (Willkommensnachricht-Karte).
        // Läuft im Hintergrund nach — bei Fehlern bleibt der Status unbekannt
        // und die Buchung wird weder als offen noch als erledigt markiert.
        const todayIso = isoToday();
        const toCheck = mapped
          .filter((b) => b.id && isBookingCom(b) && (!b.departure || b.departure >= todayIso))
          .slice(0, 30);
        setHostMsgLoading(toCheck.length > 0);

        // Bewusst in kleinen Gruppen nacheinander: 30 gleichzeitige Abfragen
        // liefen in das 5-Minuten-Kreditlimit von Beds24 und ließen alle
        // Anfragen — auch Kalender und Buchungen — fehlschlagen.
        void (async () => {
          const map: Record<string, boolean> = {};
          const BATCH = 4;
          for (let i = 0; i < toCheck.length; i += BATCH) {
            const batch = toCheck.slice(i, i + BATCH);
            const entries = await Promise.all(
              batch.map(async (b) => {
                try {
                  const res = await apiCall({
                    action: 'fetch',
                    target: 'bookingMessages',
                    bookingId: Number(b.id),
                  });
                  if (!res.success || !res.data || typeof res.data !== 'object') return null;
                  const list = (res.data as { data?: unknown }).data;
                  const msgs = Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
                  return [b.id, msgs.some(isHostMessage)] as const;
                } catch {
                  return null;
                }
              }),
            );
            for (const entry of entries) {
              if (entry) map[entry[0]] = entry[1];
            }
          }
          setHostMsgMap(map);
          setHostMsgLoading(false);
        })();
      }
    } catch {
      setError('Verbindungsfehler beim Laden der Cockpit-Daten');
    } finally {
      setLoading(false);
    }

    // Eigene Auslastung (Gästedatenbank + Portal-iCal) als Overlay —
    // optional, Fehler hier brechen das Cockpit nicht
    try {
      const [ownRes, guestsRes, icalRes, ratesRes] = await Promise.all([
        fetch('/api/admin/bookings').then((r) => r.json() as Promise<{ bookings?: OwnBooking[] }>),
        fetch('/api/admin/guests').then(
          (r) =>
            r.json() as Promise<{
              guests?: { id: number; guest_name: string }[];
            }>,
        ),
        fetch('/api/admin/feratel-calendar').then(
          (r) => r.json() as Promise<{ bookedPeriods?: IcalPeriod[] }>,
        ),
        fetch('/api/admin/settings').then(
          (r) => r.json() as Promise<{ settings?: Record<string, string> }>,
        ),
      ]);
      const settingsMap = ratesRes.settings || {};
      setPricingSettings(settingsMap);
      try {
        const parsedRates = JSON.parse(settingsMap.kurtaxe_rates || '[]') as KurtaxeRate[];
        if (Array.isArray(parsedRates)) setKurtaxeRates(parsedRates);
      } catch {
        /* Kurtaxe-Sätze optional */
      }
      setOwnBookings(ownRes.bookings || []);
      const names: Record<number, string> = {};
      for (const g of guestsRes.guests || []) {
        names[g.id] = g.guest_name;
      }
      setGuestNames(names);
      setGuestList(
        (guestsRes.guests || [])
          .map((g) => ({ id: g.id, guest_name: g.guest_name }))
          .sort((a, b) => a.guest_name.localeCompare(b.guest_name, 'de')),
      );
      setIcalPeriods(icalRes.bookedPeriods || []);
    } catch {
      /* Overlay optional */
    }

    // Gäste-App-Codes (für die Schreiben-Vorlage) und Webhook-URL laden
    try {
      const tokenRes = await fetch('/api/admin/guest-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_tokens' }),
      }).then((r) => r.json() as Promise<{ tokens?: GuestToken[] }>);
      setGuestTokens(tokenRes.tokens || []);
    } catch {
      /* optional */
    }
    try {
      const info = await apiCall({ action: 'webhookInfo' });
      if (info.url) setWebhookUrl(info.url);
    } catch {
      /* optional */
    }

    // Zimmer-Metadaten (propertyId, cleaningFee) für die Einstellungs-Karte
    try {
      const roomsRes = await apiCall({ action: 'fetch', target: 'rooms' });
      if (roomsRes.success && roomsRes.data && typeof roomsRes.data === 'object') {
        const props = (roomsRes.data as { data?: unknown }).data;
        const first = Array.isArray(props) ? (props[0] as Record<string, unknown>) : null;
        if (first) {
          setPropertyId(Number(first.id) || null);
          const types = first.roomTypes;
          setRoomMetaList(Array.isArray(types) ? (types as Record<string, unknown>[]) : []);
        }
      }
    } catch {
      /* optional */
    }
  }, [monthsRange]);

  useEffect(() => {
    load();
  }, [load]);

  // Drag-Auswahl beenden, sobald die Maustaste losgelassen wird
  useEffect(() => {
    const stopDragging = () => setDragging(false);
    window.addEventListener('mouseup', stopDragging);
    return () => window.removeEventListener('mouseup', stopDragging);
  }, []);

  // Kalender-Zeiträume des gewählten Zimmers in eine Tages-Map auflösen
  const dayMap = useMemo(() => {
    const map: Record<string, DayInfo> = {};
    const room = rooms.find((r) => r.roomId === selectedRoomId) || rooms[0];
    for (const entry of room?.calendar || []) {
      if (!entry.from) continue;
      const to = entry.to || entry.from;
      let day = entry.from;
      let guard = 0;
      while (day <= to && guard < 800) {
        const existing = map[day] || {};
        // Weitere Preis-Slots (price2 … price16) mitnehmen: Daran ist ablesbar,
        // welches Beds24-Angebot welchen Slot benutzt.
        const extraPrices: Record<string, number> = { ...(existing.extraPrices || {}) };
        for (let slot = 2; slot <= 16; slot++) {
          const value = entry[`price${slot}`];
          if (typeof value === 'number') extraPrices[`price${slot}`] = value;
        }
        map[day] = {
          price1: entry.price1 ?? existing.price1,
          minStay: entry.minStay ?? existing.minStay,
          maxStay: entry.maxStay ?? existing.maxStay,
          numAvail: entry.numAvail ?? existing.numAvail,
          extraPrices: Object.keys(extraPrices).length > 0 ? extraPrices : undefined,
        };
        day = addDaysIso(day, 1);
        guard++;
      }
    }
    return map;
  }, [rooms, selectedRoomId]);

  // Belegte Nächte (Anreise bis Nacht vor Abreise) aus allen Quellen:
  // Beds24-Buchungen < Portal-iCal < lokale Gästedatenbank (höchste Priorität)
  const occupancyNights = useMemo(() => {
    const map: Record<string, BookingNight> = {};
    const fillRange = (from: string, toExclusive: string, night: BookingNight) => {
      let day = from;
      let guard = 0;
      while (day < toExclusive && guard < 800) {
        map[day] = night;
        day = addDaysIso(day, 1);
        guard++;
      }
    };

    for (const b of bookings) {
      if (!b.arrival || !b.departure) continue;
      fillRange(b.arrival, b.departure, {
        name: b.name,
        source: b.source || 'Beds24',
        refId: `b24-${b.id}`,
      });
    }
    for (const p of icalPeriods) {
      if (!p.start || !p.end) continue;
      const name = (p.summary || '').replace(/^\[[^\]]*\]\s*/, '').trim() || 'Portal-Buchung';
      fillRange(p.start.slice(0, 10), p.end.slice(0, 10), {
        name,
        source: p.source || 'Portal',
        refId: `ical-${p.source}-${p.start}-${p.end}`,
      });
    }
    for (const b of ownBookings) {
      if (!b.arrival_date || !b.departure_date || b.status === 'cancelled') continue;
      const name = (b.guest_id && guestNames[b.guest_id]) || 'Gast';
      fillRange(b.arrival_date.slice(0, 10), b.departure_date.slice(0, 10), {
        name,
        source: b.platform || 'Privat',
        refId: `own-${b.id ?? `${b.guest_id}-${b.arrival_date}`}`,
      });
    }
    return map;
  }, [bookings, icalPeriods, ownBookings, guestNames]);

  // Grundeinstellungen des gewählten Zimmers aus Beds24 (Settings → Properties
  // → Rooms → Setup). Sie entscheiden mit darüber, ob und wie ein
  // Mindestaufenthalt an die Portale übertragen wird.
  const roomSettings = useMemo(() => {
    const meta = roomMetaList.find((r) => Number(r.id) === selectedRoomId);
    if (!meta) return null;
    return {
      minStay: typeof meta.minStay === 'number' ? meta.minStay : null,
      maxStay: typeof meta.maxStay === 'number' ? meta.maxStay : null,
      restrictionStrategy:
        typeof meta.restrictionStrategy === 'string' ? meta.restrictionStrategy : null,
    };
  }, [roomMetaList, selectedRoomId]);

  const today = isoToday();

  // Für den Belegungsabgleich: Beds24-Buchungen und alle anderen Quellen
  const beds24Ranges = useMemo(
    () =>
      bookings
        .filter((b) => b.arrival && b.departure)
        .map((b) => ({ from: b.arrival, to: b.departure })),
    [bookings],
  );
  const knownRanges = useMemo(
    () => [
      ...ownBookings
        .filter((b) => b.arrival_date && b.departure_date && b.status !== 'cancelled')
        .map((b) => ({
          from: (b.arrival_date || '').slice(0, 10),
          to: (b.departure_date || '').slice(0, 10),
          label: `${(b.guest_id && guestNames[b.guest_id]) || 'Gast'}${b.platform ? ` · ${b.platform}` : ''}`,
          source: 'Gästedatenbank',
        })),
      ...icalPeriods
        .filter((p) => p.start && p.end)
        .map((p) => ({
          from: p.start.slice(0, 10),
          to: p.end.slice(0, 10),
          label: (p.summary || '').trim() || 'Belegung laut Portal-Kalender',
          source: p.source ? `${p.source} (iCal)` : 'Portal-Kalender',
        })),
    ],
    [ownBookings, icalPeriods, guestNames],
  );

  // Buchungslisten unten: bereits abgereist (für Bewertungsanfragen) vs.
  // laufend/kommend. „Vergangen" = Abreise liegt vor heute.
  const pastBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.departure && b.departure < today)
        .sort((a, b) => b.arrival.localeCompare(a.arrival)),
    [bookings, today],
  );
  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((b) => !b.departure || b.departure >= today)
        .sort((a, b) => a.arrival.localeCompare(b.arrival)),
    [bookings, today],
  );

  // Booking.com-Buchungen (laufend/kommend), denen wir noch keine Nachricht
  // geschrieben haben — hier fehlt die Willkommensnachricht (Danke für die
  // Buchung, wir freuen uns auf Sie + Gäste-App-Link)
  const pendingWelcome = useMemo(
    () => upcomingBookings.filter((b) => isBookingCom(b) && hostMsgMap[b.id] === false),
    [upcomingBookings, hostMsgMap],
  );

  // Geordnete Auswahl (Start kann nach Ende liegen, wenn rückwärts gezogen wird)
  const selFrom = selStart && selEnd && selEnd < selStart ? selEnd : selStart;
  const selTo = selStart && selEnd && selEnd < selStart ? selStart : selEnd;
  const selDays = selFrom && selTo ? diffDaysIso(selFrom, selTo) + 1 : 0;

  // Ein bereits geprüftes Ergebnis gehört immer zu genau einem Tag/Zimmer
  useEffect(() => {
    setStayCheck(null);
    setStayCheckError('');
  }, [selFrom, selectedRoomId]);

  // Beds24 direkt fragen, ob ein kurzer Aufenthalt ab dem markierten Tag
  // buchbar wäre — das ist dieselbe Auskunft, die auch Booking.com bekommt.
  const runStayCheck = async (nights: number) => {
    if (!selFrom || !selectedRoomId) return;
    setStayChecking(true);
    setStayCheck(null);
    setStayCheckError('');
    try {
      const res = await apiCall({
        action: 'checkStay',
        roomId: selectedRoomId,
        arrival: selFrom,
        nights,
      });
      if (res.success) {
        setStayCheck({
          nights: res.nights ?? nights,
          arrival: res.arrival ?? selFrom,
          offers: res.offers ?? [],
        });
      } else {
        setStayCheckError(res.error || 'Prüfung fehlgeschlagen');
      }
    } catch {
      setStayCheckError('Verbindungsfehler bei der Prüfung');
    } finally {
      setStayChecking(false);
    }
  };

  const beginSelect = (iso: string) => {
    if (iso < today) return;
    setDragging(true);
    setSelStart(iso);
    setSelEnd(iso);
    setSaveMessage('');
    setSaveError('');
  };

  const extendSelect = (iso: string) => {
    if (!dragging || iso < today) return;
    setSelEnd(iso);
  };

  const clearSelection = () => {
    setSelStart(null);
    setSelEnd(null);
  };

  const openEditModal = () => {
    if (!selFrom || !selTo) return;
    setFormFrom(selFrom);
    setFormTo(selTo);
    // Felder bewusst leer lassen: Bei Beds24 wird nur geändert, was hier
    // ausgefüllt ist. So setzt z.B. ein Mindestaufenthalt über zwei Monate
    // nicht versehentlich alle (unterschiedlichen) Tagespreise auf den
    // Preis des ersten markierten Tages — die aktuellen Werte stehen als
    // Platzhalter in den Feldern.
    setFormPrice('');
    setFormMinStay('');
    setFormAvail('');
    setSaveMessage('');
    setSaveError('');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selectedRoomId) {
      setSaveError('Kein Zimmer ausgewählt');
      return;
    }
    if (!formFrom || !formTo || formTo < formFrom) {
      setSaveError('Bitte gültigen Zeitraum wählen');
      return;
    }
    if (!formPrice && !formMinStay && !formAvail) {
      setSaveError('Bitte Preis, Mindestaufenthalt oder Verfügbarkeit angeben');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const res = await apiCall({
        action: 'setCalendar',
        roomId: selectedRoomId,
        label: `Cockpit: ${formatGermanDate(formFrom)} – ${formatGermanDate(formTo)} geändert`,
        from: formFrom,
        to: formTo,
        price1: formPrice || null,
        minStay: formMinStay || null,
        numAvail: formAvail === '' ? null : Number(formAvail),
      });
      if (!res.success) {
        setSaveError(res.error || 'Speichern fehlgeschlagen');
        return;
      }

      // Direkt zurücklesen, was Beds24 jetzt tatsächlich gespeichert hat.
      // Erst damit ist klar, ob eine Änderung schon bei Beds24 hängt oder
      // nur die Übertragung an die Portale noch aussteht.
      const check = await apiCall({
        action: 'verifyCalendar',
        roomId: selectedRoomId,
        from: formFrom,
        to: formTo,
      });

      const range = `${formatGermanDate(formFrom)} – ${formatGermanDate(formTo)}`;
      let confirmation = '';
      const stored = check.success ? check.days?.[0] : undefined;
      if (stored) {
        const parts: string[] = [];
        if (formPrice) {
          const ok = Number(stored.price1) === Number(formPrice);
          parts.push(
            `Preis ${ok ? `${stored.price1} € ✓` : `weiterhin ${stored.price1 ?? '—'} €`}`,
          );
        }
        if (formMinStay) {
          const ok = Number(stored.minStay) === Number(formMinStay);
          parts.push(
            `Mindestaufenthalt ${ok ? `${stored.minStay} Nächte ✓` : `weiterhin ${stored.minStay ?? '—'}`}`,
          );
        }
        if (formAvail !== '') {
          const ok = Number(stored.numAvail) === Number(formAvail);
          parts.push(
            `Verfügbarkeit ${ok ? `${stored.numAvail} ✓` : `weiterhin ${stored.numAvail ?? '—'}`}`,
          );
        }
        confirmation = parts.length > 0 ? ` Beds24 meldet jetzt: ${parts.join(' · ')}.` : '';
      }

      setSaveMessage(
        `Gespeichert für ${range}.${confirmation}${
          formMinStay
            ? ' Achtung: Den Mindestaufenthalt überträgt Beds24 laut eigener Dokumentation NICHT sofort, sondern erst mit der nächsten Aktualisierung. Sofort übertragen: in Beds24 unter Channel Manager → Booking.com → Mapping in der Zeile der Einheit auf „Aktualisieren“.'
            : ' Preis und Verfügbarkeit sendet Beds24 laut eigener Dokumentation sofort an die Portale.'
        }`,
      );
      setEditOpen(false);
      load();
    } catch {
      setSaveError('Verbindungsfehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Kompletten Beds24-Datensatz in die Zwischenablage legen — damit ein
  // unbekanntes Feld auch dann weitergegeben werden kann, wenn es hier nicht
  // als einfacher Text auftaucht (z.B. verschachtelt in einem Unterobjekt).
  const copyRawBooking = async () => {
    if (!activeBooking) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(activeBooking.raw, null, 2));
      setRawCopied(true);
      window.setTimeout(() => setRawCopied(false), 2500);
    } catch {
      setRawCopied(false);
    }
  };

  // Buchungs-Modal öffnen und Nachrichten zur Buchung laden
  const openBooking = (b: CockpitBooking) => {
    setActiveBooking(b);
    // Anrede pro Buchung neu entscheiden, nicht die vom letzten Gast übernehmen
    setSalutation('auto');
    // Gast anhand des Namens vorschlagen (exakt oder enthaltend)
    const bookingName = b.name.toLowerCase().trim();
    const suggested = guestList.find((g) => {
      const own = g.guest_name.toLowerCase().trim();
      if (own === bookingName) return true;
      if (bookingName.length >= 5 && own.includes(bookingName)) return true;
      if (own.length >= 5 && bookingName.includes(own)) return true;
      return false;
    });
    setAssignGuestId(suggested ? String(suggested.id) : '');
    setAssignMessage('');
    setAssignError('');
    setReplyText('');
    setRawCopied(false);
    loadMessages(Number(b.id));
  };

  const loadMessages = (bookingId: number) => {
    setMessages([]);
    setMessagesError('');
    setMessagesLoading(true);
    apiCall({ action: 'fetch', target: 'bookingMessages', bookingId })
      .then((res) => {
        if (res.success && res.data && typeof res.data === 'object') {
          const data = (res.data as { data?: unknown }).data;
          setMessages(Array.isArray(data) ? (data as Record<string, unknown>[]) : []);
        } else {
          setMessagesError(res.error || 'Nachrichten konnten nicht geladen werden');
        }
      })
      .catch(() => setMessagesError('Verbindungsfehler beim Laden der Nachrichten'))
      .finally(() => setMessagesLoading(false));
  };

  // Endreinigung (cleaningFee) am Zimmer bei Beds24 speichern
  const saveCleaningFee = async () => {
    if (!propertyId || !selectedRoomId || !cfInput) return;
    setCfSaving(true);
    setCfMessage('');
    setCfError('');
    try {
      const res = await apiCall({
        action: 'setRoomSettings',
        propertyId,
        roomId: selectedRoomId,
        cleaningFee: Number(cfInput),
      });
      if (res.success) {
        setCfMessage(
          `Endreinigung ${cfInput} € am Zimmer gespeichert — erscheint künftig als Position in neuen Buchungen.`,
        );
        setCfInput('');
        load();
      } else {
        setCfError(res.error || 'Speichern fehlgeschlagen');
      }
    } catch {
      setCfError('Verbindungsfehler beim Speichern');
    } finally {
      setCfSaving(false);
    }
  };

  // Antwort an den Gast über Beds24 senden (z.B. in den Booking.com-Chat)
  const sendReply = async () => {
    if (!activeBooking || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await apiCall({
        action: 'sendMessage',
        bookingId: Number(activeBooking.id),
        message: replyText.trim(),
      });
      if (res.success) {
        setReplyText('');
        // Buchung gilt ab jetzt als angeschrieben — Willkommens-Karte aktualisieren
        setHostMsgMap((prev) => ({ ...prev, [activeBooking.id]: true }));
        loadMessages(Number(activeBooking.id));
      } else {
        setMessagesError(res.error || 'Senden fehlgeschlagen');
      }
    } catch {
      setMessagesError('Verbindungsfehler beim Senden');
    } finally {
      setSendingReply(false);
    }
  };

  // Gäste-App-Vorlage ins Antwortfeld einfügen. Der Link kommt aus dem
  // Zugangscode der verknüpften Buchung — existiert noch keiner, wird er
  // direkt hier erzeugt (statt auf den Gäste-App-Tab zu verweisen).
  const insertTemplate = async (lang: 'de' | 'en') => {
    if (!activeBooking || creatingToken) return;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const booking = activeBooking;

    let token = existingMatch
      ? guestTokens.find((t) => t.booking_id === existingMatch.ownBookingId)
      : undefined;

    // Noch kein Zugangscode, aber die Buchung ist in der Gästedatenbank →
    // Code automatisch anlegen (wie im Gäste-App-Tab)
    if (!token && existingMatch?.ownBookingId) {
      setCreatingToken(true);
      try {
        const res = await fetch('/api/admin/guest-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_token',
            booking_id: existingMatch.ownBookingId,
            guest_name: booking.name,
            valid_from: booking.arrival,
            valid_until: booking.departure,
          }),
        });
        const data = (await res.json()) as { access_code?: string };
        if (data.access_code) {
          token = { booking_id: existingMatch.ownBookingId, access_code: data.access_code };
          setGuestTokens((prev) => [...prev, token as GuestToken]);
        }
      } catch {
        /* Code konnte nicht erzeugt werden — unten Platzhalter einfügen */
      } finally {
        setCreatingToken(false);
      }
    }

    let link: string;
    if (token) {
      link = `${base}/gaeste?code=${token.access_code}&lang=${lang}`;
    } else if (existingMatch) {
      link = '[Gäste-App-Link — Code konnte nicht erzeugt werden, bitte erneut versuchen]';
    } else {
      link =
        '[Gäste-App-Link — Buchung zuerst unten „Buchung übernehmen", dann Vorlage erneut anklicken]';
    }
    // Liegt die Anreise noch weit vorne, passt „wir freuen uns, Sie bald zu
    // begrüßen" nicht — dann die Vorlage mit langem Vorlauf nehmen.
    if (daysUntilArrival(booking.arrival) > EARLY_WELCOME_THRESHOLD_DAYS) {
      const arrivalLabel = new Date(`${booking.arrival}T00:00:00`).toLocaleDateString(
        lang === 'en' ? 'en-GB' : 'de-DE',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      );
      setReplyText(
        buildGuestEarlyWelcomeText(lang, salutationInfo(booking, chosenGender), link, arrivalLabel),
      );
      return;
    }
    setReplyText(buildGuestWelcomeText(lang, salutationInfo(booking, chosenGender), link));
  };

  // Danke-/Bewertungsvorlage ins Antwortfeld einfügen (für bereits
  // abgereiste Gäste — bittet um eine Google-/Booking.com-Bewertung)
  const insertReviewTemplate = (lang: 'de' | 'en') => {
    if (!activeBooking) return;
    setReplyText(buildGuestReviewText(lang, salutationInfo(activeBooking, chosenGender)));
  };

  // Ausführliche Erinnerung an den Pre-Check-in (Anmeldung bei der Gemeinde)
  const insertPreCheckinTemplate = () => {
    if (!activeBooking) return;
    setReplyText(buildPreCheckinText(salutationInfo(activeBooking, chosenGender)));
  };

  // Buchung in die Gästedatenbank übernehmen (bestehender oder neuer Gast).
  // Gast-Abgleich, Kontaktdaten und Anlage laufen serverseitig in einem Schritt
  // (lib/server/beds24Import.ts) — mit denselben Regeln wie der Webhook.
  const handleAssign = async () => {
    if (!activeBooking) return;
    if (existingMatch) {
      setAssignError(
        `Diese Buchung ist bereits in der Gästedatenbank (${existingMatch.guestName}) — nichts angelegt.`,
      );
      return;
    }
    if (!assignGuestId) {
      setAssignError('Bitte einen Gast auswählen oder „Neuen Gast anlegen" wählen');
      return;
    }
    setAssigning(true);
    setAssignError('');
    setAssignMessage('');
    // Was zusätzlich zur Buchung passiert ist (Kontaktdaten, Code)
    const done: string[] = [];
    try {
      const { guest, booking, arrivalHint } = buildImportPayload(activeBooking, kurtaxeRates);
      const res = await apiCall({
        action: 'importBooking',
        guestId: assignGuestId === 'new' ? 'new' : Number(assignGuestId),
        guest,
        booking,
      });
      if (!res.success) {
        throw new Error(res.error || 'Übernahme fehlgeschlagen');
      }

      done.push(
        arrivalHint
          ? `Buchung mit Preisaufstellung übernommen — Ankunft ${arrivalHint.time}`
          : 'Buchung mit Preisaufstellung übernommen',
      );
      const reasonLabels: Record<string, string> = {
        email: 'E-Mail',
        phone: 'Telefon',
        name: 'Name',
        lastName: 'Nachname',
      };
      if (res.matched && res.matched.length > 0) {
        done.push(
          `Bestehender Gast „${res.guestName || activeBooking.name}" erkannt (${res.matched
            .map((r) => reasonLabels[r] || r)
            .join(' + ')}) — kein Duplikat angelegt`,
        );
      }
      const addedLabels: Record<string, string> = {
        email: 'E-Mail',
        phone: 'Telefon',
        nationality: 'Nationalität',
      };
      if (res.added && res.added.length > 0) {
        done.push(`ergänzt: ${res.added.map((a) => addedLabels[a] || a).join(' + ')}`);
      }

      const newBookingId = res.bookingId;
      if (newBookingId) {
        // Zugangscode für die Gäste-App anlegen
        try {
          const tokenRes = await fetch('/api/admin/guest-app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_token',
              booking_id: newBookingId,
              guest_name: activeBooking.name,
              valid_from: activeBooking.arrival,
              valid_until: activeBooking.departure,
            }),
          });
          const tokenData = (await tokenRes.json()) as { access_code?: string };
          if (tokenData.access_code) {
            setGuestTokens((prev) => [
              ...prev,
              { booking_id: newBookingId, access_code: tokenData.access_code as string },
            ]);
            done.push(`Gäste-App-Code ${tokenData.access_code}`);
          }
        } catch {
          done.push('Gäste-App-Code konnte nicht erzeugt werden');
        }
      }

      setAssignMessage(`${done.join(' · ')}.`);
      load();
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : 'Übernahme fehlgeschlagen');
    } finally {
      setAssigning(false);
    }
  };

  // Alle Beds24-Buchungen, die noch nicht in der Gästedatenbank stehen, auf
  // einmal übernehmen. Gäste werden serverseitig wiedererkannt (E-Mail,
  // Telefon, Name), Dubletten verhindert. iCal-Belegungen ohne Gastdaten
  // bleiben außen vor.
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState('');

  const bulkCandidates = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.arrival && b.departure && !beds24Source(b.raw).ical && !findOwnBooking(b, ownBookings),
      ),
    [bookings, ownBookings],
  );

  const importAll = async () => {
    if (bulkCandidates.length === 0) return;
    if (
      !confirm(
        `${bulkCandidates.length} Beds24-Buchung(en) in die Gästedatenbank übernehmen?\n\n` +
          'Bekannte Gäste werden wiedererkannt, es entstehen keine doppelten Buchungen. ' +
          'Für kommende Aufenthalte wird gleich ein Gäste-App-Code angelegt.',
      )
    ) {
      return;
    }
    setBulkImporting(true);
    setBulkResult('');
    let created = 0;
    let matchedGuests = 0;
    const failed: string[] = [];
    try {
      for (const b of bulkCandidates) {
        try {
          const { guest, booking } = buildImportPayload(b, kurtaxeRates);
          const res = await apiCall({ action: 'importBooking', guestId: 'new', guest, booking });
          if (!res.success || !res.bookingId) {
            failed.push(`${b.name} (${res.error || 'Fehler'})`);
            continue;
          }
          created++;
          if (res.matched && res.matched.length > 0) matchedGuests++;
          // Gäste-App-Code nur für Aufenthalte, die noch kommen oder laufen
          if (b.departure >= isoToday()) {
            const tokenRes = await fetch('/api/admin/guest-app', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create_token',
                booking_id: res.bookingId,
                guest_name: b.name,
                valid_from: b.arrival,
                valid_until: b.departure,
              }),
            }).catch(() => null);
            if (tokenRes?.ok) {
              const tokenData = (await tokenRes.json()) as { access_code?: string };
              const code = tokenData.access_code;
              const bookingId = res.bookingId;
              if (code)
                setGuestTokens((prev) => [...prev, { booking_id: bookingId, access_code: code }]);
            }
          }
        } catch {
          failed.push(b.name);
        }
      }
      const parts = [`${created} Buchung(en) übernommen`];
      if (matchedGuests > 0) parts.push(`${matchedGuests}× bestehender Gast erkannt`);
      if (failed.length > 0) parts.push(`nicht übernommen: ${failed.join(', ')}`);
      setBulkResult(parts.join(' · '));
      load();
    } finally {
      setBulkImporting(false);
    }
  };

  // Bestehende Buchungen mit Beds24 abgleichen: Finanzdaten (Kommission,
  // Zahlungsgebühr, Auszahlung), Kontaktdaten des Gastes, Nationalität und
  // Haustier. Am Gast werden nur Lücken gefüllt — von Hand gepflegte Daten
  // bleiben stehen (lib/server/beds24Import.ts).
  const syncFinances = async () => {
    setSyncing(true);
    setSyncResult('');
    let updated = 0;
    let unchanged = 0;
    let guestFilled = 0;
    let otherChannel = 0;
    const failed: string[] = [];

    try {
      for (const b of bookings) {
        // Passende eigene Buchung suchen (Beds24-ID, Buchungsnummer, sonst Zeitraum)
        const ref = rawStr(b.raw, 'apiReference') || b.id;
        const own = ownBookings.find((o) => {
          if (o.status === 'cancelled') return false;
          if (o.beds24_booking_id && String(o.beds24_booking_id) === b.id) return true;
          if (o.booking_number && ref && String(o.booking_number) === String(ref)) return true;
          return (
            !!o.arrival_date &&
            !!o.departure_date &&
            o.arrival_date.slice(0, 10) === b.arrival &&
            o.departure_date.slice(0, 10) === b.departure
          );
        });
        if (!own?.id) continue;

        const finance = computeBeds24Finance(b, kurtaxeRates);
        let existing: Record<string, unknown> = {};
        try {
          existing = own.additional_costs
            ? (JSON.parse(own.additional_costs) as Record<string, unknown>)
            : {};
        } catch {
          existing = {};
        }

        // Die Finanzwerte folgen der Booking.com-Abrechnung (Kommission inkl.
        // Zahlungsgebühr, Kurtaxe vor Ort). Feratel- und FeWo-Buchungen haben
        // eigene Zahlen — die bleiben unangetastet.
        let financeUpdate: Record<string, unknown> | null = null;
        if (isBookingCom(b)) {
          const petsMissing = !own.pets && !!finance.pets;
          const same =
            !petsMissing &&
            Number(existing.platform_service_fee || 0) === finance.commissionOnly &&
            Number(existing.payment_processing_fee || 0) === finance.paymentFee &&
            Number(existing.payout_amount || 0) === finance.payout;
          if (same) {
            unchanged++;
          } else {
            financeUpdate = {
              additional_costs: JSON.stringify({
                ...existing,
                guest_total_payment: finance.guestTotal || undefined,
                platform_service_fee: finance.commissionOnly || undefined,
                payment_processing_fee: finance.paymentFee || undefined,
                payout_amount: finance.payout || undefined,
                kurtaxe_income: finance.kurtaxe,
                cleaning_fee_income: finance.cleaningFee || undefined,
              }),
              rental_price: finance.payout || own.rental_price || 0,
              kurtaxe_cash: 1,
              children_ages: finance.childrenAges || null,
              pets: finance.pets || null,
            };
          }
        } else {
          otherChannel++;
        }

        const contact = guestContact(b.raw);
        try {
          const res = await apiCall({
            action: 'syncBooking',
            ownBookingId: own.id,
            beds24Id: b.id,
            guest: {
              email: contact.email || null,
              phone: contact.phone || null,
              nationality: guestCountryCode(b.raw) || null,
            },
            finance: financeUpdate,
          });
          if (!res.success) {
            failed.push(b.name);
            continue;
          }
          if (res.financeUpdated) updated++;
          if (res.added && res.added.length > 0) guestFilled++;
        } catch {
          failed.push(b.name);
        }
      }

      const parts = [`${updated} Buchung(en) aktualisiert`];
      if (guestFilled > 0) parts.push(`${guestFilled}× Gastdaten ergänzt`);
      if (unchanged > 0) parts.push(`${unchanged} bereits aktuell`);
      if (otherChannel > 0) {
        parts.push(`${otherChannel} von anderen Kanälen (Finanzen unverändert)`);
      }
      if (failed.length > 0) parts.push(`fehlgeschlagen: ${failed.join(', ')}`);
      setSyncResult(parts.join(' · '));
      load();
    } finally {
      setSyncing(false);
    }
  };

  // Effektive Booking.com-Gebührenquote aus den echten Buchungen
  // (Kommission ÷ Preis, gemittelt); Fallback 18 %
  const effectiveCommissionRate = useMemo(() => {
    const ratios: number[] = [];
    for (const b of bookings) {
      if (!isBookingCom(b)) continue;
      const price = Number(rawStr(b.raw, 'price')) || 0;
      const commission = Number(rawStr(b.raw, 'commission')) || 0;
      if (price > 0 && commission > 0 && commission < price) {
        ratios.push(commission / price);
      }
    }
    if (ratios.length === 0) return 0.18;
    return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  }, [bookings]);

  // Umsatz-Prognose für die markierten freien Nächte
  const selectionStats = useMemo(() => {
    if (!selFrom || !selTo) return null;
    let gross = 0;
    let freeNights = 0;
    let day = selFrom;
    let guard = 0;
    while (day <= selTo && guard < 800) {
      const occupied = !!occupancyNights[day] || dayMap[day]?.numAvail === 0;
      if (!occupied) {
        freeNights++;
        gross += dayMap[day]?.price1 || 0;
      }
      day = addDaysIso(day, 1);
      guard++;
    }
    return { gross, freeNights };
  }, [selFrom, selTo, dayMap, occupancyNights]);

  // Klick auf einen belegten Tag im Kalender öffnet die zugehörige
  // Beds24-Buchung. Suche über das Datum, da die Zellfarbe auch aus dem
  // Gästedatenbank-/iCal-Overlay stammen kann (die dieselbe Buchung spiegeln).
  const findBeds24BookingForNight = (nightIso: string): CockpitBooking | undefined =>
    bookings.find(
      (b) => b.arrival && b.departure && nightIso >= b.arrival && nightIso < b.departure,
    );

  const startYear = Number(today.slice(0, 4));
  const startMonth = Number(today.slice(5, 7)) - 1;
  const detailInfo = selFrom ? dayMap[selFrom] : undefined;
  const detailBooking = selFrom
    ? occupancyNights[selFrom] || occupancyNights[addDaysIso(selFrom, -1)]
    : undefined;

  // Ist die geöffnete Beds24-Buchung schon in der Gästedatenbank?
  // Abgleich über Buchungsnummer (Booking-Referenz/Beds24-ID), dann Zeitraum.
  const existingMatch = useMemo(() => {
    if (!activeBooking) return null;
    const ref = rawStr(activeBooking.raw, 'apiReference');
    const guestNameFor = (guestId?: number) => (guestId && guestNames[guestId]) || 'Gast';
    for (const ob of ownBookings) {
      if (ob.status === 'cancelled') continue;
      const num = (ob.booking_number || '').trim();
      if (ob.beds24_booking_id && String(ob.beds24_booking_id) === activeBooking.id) {
        return {
          guestId: ob.guest_id || 0,
          ownBookingId: ob.id || 0,
          guestName: guestNameFor(ob.guest_id),
          reason: `Beds24-Buchung ${activeBooking.id}`,
        };
      }
      if (num && (num === ref || num === activeBooking.id)) {
        return {
          guestId: ob.guest_id || 0,
          ownBookingId: ob.id || 0,
          guestName: guestNameFor(ob.guest_id),
          reason: `gleiche Buchungsnummer ${num}`,
        };
      }
    }
    for (const ob of ownBookings) {
      if (ob.status === 'cancelled') continue;
      if (
        (ob.arrival_date || '').slice(0, 10) === activeBooking.arrival &&
        (ob.departure_date || '').slice(0, 10) === activeBooking.departure
      ) {
        return {
          guestId: ob.guest_id || 0,
          ownBookingId: ob.id || 0,
          guestName: guestNameFor(ob.guest_id),
          reason: 'gleicher Zeitraum',
        };
      }
    }
    return null;
  }, [activeBooking, ownBookings, guestNames]);

  // Preisaufstellung der geöffneten Buchung
  const invoiceItems = activeBooking ? rawArray(activeBooking.raw, 'invoiceItems') : [];
  const infoItems = activeBooking ? rawArray(activeBooking.raw, 'infoItems') : [];
  // Anreisezeit und Gastwünsche der geöffneten Buchung
  const guestRequests = activeBooking
    ? GUEST_REQUEST_FIELDS.map((f) => ({
        ...f,
        value: rawStr(activeBooking.raw, f.key).trim(),
      })).filter((f) => f.value !== '')
    : [];
  const rawFields = activeBooking ? rawScalarFields(activeBooking.raw) : [];
  const bookingPrice = activeBooking ? Number(rawStr(activeBooking.raw, 'price')) || 0 : 0;
  const bookingNightsCount = activeBooking
    ? Math.max(0, diffDaysIso(activeBooking.arrival, activeBooking.departure))
    : 0;
  const bookingAdults = activeBooking ? Number(rawStr(activeBooking.raw, 'numAdult')) || 0 : 0;

  const activeFinance = activeBooking ? computeBeds24Finance(activeBooking, kurtaxeRates) : null;
  const bookingCommission = activeFinance?.commission ?? 0;
  const cityTaxInPrice = activeFinance?.cityTaxInPrice ?? false;
  const bookingKurtaxe = activeFinance?.kurtaxe ?? 0;
  const cleaningFeeFromInvoice = activeFinance?.cleaningFee ?? 0;
  const childrenAgesFromBooking = activeFinance?.childrenAges ?? '';
  // Weit entfernte Anreise → Willkommensvorlage mit langem Vorlauf
  const daysToArrival = activeBooking ? daysUntilArrival(activeBooking.arrival) : 0;
  const isEarlyBooking = daysToArrival > EARLY_WELCOME_THRESHOLD_DAYS;
  const petsFromBooking = activeFinance?.pets ?? '';
  const portalCollects = cityTaxInPrice ? bookingPrice - bookingKurtaxe : bookingPrice;
  const bookingPayout = activeFinance?.payout ?? 0;
  const guestTotal = activeFinance?.guestTotal ?? 0;

  if (loading && rooms.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-3 text-sm text-gray-500">Lade Cockpit (Preise, Verfügbarkeit)...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="font-semibold text-gray-800 text-sm">
          Cockpit —
          <select
            value={monthsRange}
            onChange={(e) => setMonthsRange(Number(e.target.value))}
            className="mx-1.5 text-xs border border-gray-300 rounded-lg px-2 py-1 font-normal"
          >
            <option value={12}>nächste 12 Monate</option>
            <option value={18}>nächste 18 Monate</option>
            <option value={24}>nächste 24 Monate</option>
          </select>
          {rooms.length > 1 && (
            <select
              value={selectedRoomId ?? ''}
              onChange={(e) => {
                const roomId = Number(e.target.value);
                setSelectedRoomId(roomId);
                storeRoomId(roomId);
              }}
              className="ml-3 text-xs border border-gray-300 rounded-lg px-2 py-1"
            >
              {rooms.map((r) => (
                <option key={r.roomId} value={r.roomId}>
                  {r.name || `Zimmer ${r.roomId}`} · ID {r.roomId}
                </option>
              ))}
            </select>
          )}
          {/* Zimmer-ID sichtbar machen: Sie muss mit der gemappten Einheit im
              Beds24-Channel-Manager (Booking.com → Mapping) übereinstimmen,
              sonst landen Änderungen in einem Zimmer, das nicht übertragen wird. */}
          {selectedRoomId && (
            <span className="ml-3 text-xs font-normal text-gray-400">
              Beds24-Zimmer-ID {selectedRoomId}
            </span>
          )}
          {/* Laut Beds24-Doku gehen Verfügbarkeit und Preise sofort an die
              Portale, Restriktionen wie der Mindestaufenthalt dagegen erst mit
              der nächsten Aktualisierung. Die API v2 kennt keinen Endpunkt, um
              diese Aktualisierung auszulösen — der Knopf sitzt nur im
              Beds24-Channel-Manager, deshalb hier der direkte Absprung. */}
          {/* Nachträglicher Abgleich: trägt Zahlungsgebühr, Auszahlung und die
              Kontaktdaten des Gastes aus Beds24 in bereits übernommene
              Buchungen nach. */}
          <button
            onClick={syncFinances}
            disabled={syncing || bookings.length === 0}
            className="ml-3 text-xs font-normal text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
            title="Trägt Kommission, Zahlungsgebühr, Auszahlung (Booking.com) sowie fehlende E-Mail, Handynummer und Nationalität aus Beds24 in bestehende Buchungen nach"
          >
            {syncing ? 'Gleiche ab…' : 'Buchungsdaten abgleichen'}
          </button>
          {syncResult && (
            <span className="ml-2 text-xs font-normal text-gray-500">{syncResult}</span>
          )}
          <button
            onClick={importAll}
            disabled={bulkImporting || bulkCandidates.length === 0}
            className="ml-3 text-xs font-normal text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:no-underline"
            title="Übernimmt alle Beds24-Buchungen, die noch nicht in der Gästedatenbank stehen"
          >
            {bulkImporting
              ? 'Übernehme…'
              : `Alle Beds24-Buchungen übernehmen (${bulkCandidates.length})`}
          </button>
          {bulkResult && (
            <span className="ml-2 text-xs font-normal text-gray-500">{bulkResult}</span>
          )}
          <a
            href="https://beds24.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-3 text-xs font-normal text-blue-600 hover:text-blue-800 underline"
            title="Beds24 → Channel Manager → Booking.com → Mapping → in der Zeile der Einheit auf „Aktualisieren“"
          >
            Beds24 öffnen → Übertragung auslösen
          </a>
        </h3>
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-200" /> Booking.com
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-200" /> FeWo
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-200" /> Feratel
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-pink-200" /> Airbnb
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-300" /> Privat/gesperrt
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" /> frei
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded border border-gray-300"
              style={{
                background: `linear-gradient(to bottom right, ${FREE_DAY_HEX} 50%, #bbf7d0 50%)`,
              }}
            />{' '}
            Anreise
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded border border-gray-300"
              style={{
                background: `linear-gradient(to bottom right, #bbf7d0 50%, ${FREE_DAY_HEX} 50%)`,
              }}
            />{' '}
            Abreise
          </span>
          <button
            onClick={load}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Neu laden"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-2">
        Preise &amp; Mindestaufenthalt aus Beds24 · Auslastung kombiniert aus Gästedatenbank,
        Portal-iCal-Feeds (siehe unten) und Beds24 · Mehrere Tage mit gedrückter Maustaste markieren
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* iCal-Adressen der Portale (Quelle für Overlay und Abgleich) */}
      <Beds24IcalSources onSaved={load} />

      {/* Doppelbuchungs-Schutz: belegte Nächte, die bei Beds24 noch frei sind */}
      <Beds24BlockSync
        roomId={selectedRoomId}
        dayMap={dayMap}
        beds24Ranges={beds24Ranges}
        knownRanges={knownRanges}
        onBlocked={load}
      />

      {/* 12-Monats-Raster: Tag + Preis, Farbe = Belegung, Tooltip = Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 select-none">
        {Array.from({ length: monthsRange }, (_, offset) => {
          const monthDate = new Date(startYear, startMonth + offset, 1);
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDayOfWeek = (monthDate.getDay() + 6) % 7;
          const monthName = monthDate.toLocaleDateString('de-DE', {
            month: 'long',
            year: 'numeric',
          });

          return (
            <div key={offset} className="bg-white border border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-gray-900 mb-2 text-center text-sm">{monthName}</h4>
              <div className="grid grid-cols-7 gap-0.5 text-[10px]">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                  <div key={d} className="text-center text-gray-400 font-medium">
                    {d}
                  </div>
                ))}
                {Array.from({ length: firstDayOfWeek }, (_, i) => (
                  <div key={`e-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const info = dayMap[iso];
                  const evening = occupancyNights[iso];
                  const morning = occupancyNights[addDaysIso(iso, -1)];
                  const isPast = iso < today;
                  // Belegte Beds24-Buchung an diesem Tag (An-/Abreisetag mitgezählt)
                  const bookingHit =
                    findBeds24BookingForNight(iso) ||
                    findBeds24BookingForNight(addDaysIso(iso, -1));
                  // Vergangene Tage bleiben für Preis/Auswahl gesperrt — belegte
                  // vergangene Tage lassen sich aber anklicken (Buchung öffnen)
                  const pastClickable = isPast && !!bookingHit;
                  const inSelection = !!selFrom && !!selTo && iso >= selFrom && iso <= selTo;
                  const cellStyle = halfDayCellStyle(morning, evening, info?.numAvail === 0);
                  const cellClass = cellStyle ? 'text-gray-900' : 'bg-gray-50 text-gray-600';
                  const tooltipParts = [formatGermanDate(iso)];
                  if (info?.price1) tooltipParts.push(`${info.price1} €`);
                  if (info?.minStay) tooltipParts.push(`Min. ${info.minStay} Nächte`);
                  if (evening) tooltipParts.push(`${evening.name} (${evening.source})`);
                  if (morning && (!evening || morning.refId !== evening.refId)) {
                    tooltipParts.push(`Abreise: ${morning.name} (${morning.source})`);
                  }
                  // Geteilte Kachel = Wechseltag (Abreise oben links, Anreise
                  // unten rechts). Dort hebt der Hover nur die jeweilige Hälfte
                  // hervor, nicht die ganze Zelle.
                  const sameBooking = !!morning && !!evening && morning.refId === evening.refId;
                  const isSplitCell = (!!morning || !!evening) && !sameBooking;

                  // Interaktions-/Sichtbarkeitsklassen (ohne verschachteltes Ternary)
                  let interactionClass = 'cursor-pointer';
                  if (!isSplitCell) interactionClass += ' hover:opacity-80';
                  if (isPast && pastClickable) {
                    interactionClass = 'opacity-70 cursor-pointer';
                    if (!isSplitCell) interactionClass += ' hover:opacity-100';
                  } else if (isPast) {
                    interactionClass = 'opacity-40 cursor-default';
                  }

                  return (
                    <button
                      key={day}
                      onMouseDown={() => beginSelect(iso)}
                      onMouseEnter={() => extendSelect(iso)}
                      onClick={() => {
                        // Einfacher Klick (kein Drag) auf belegte Nacht → Buchung
                        // öffnen. Gilt auch für vergangene belegte Tage.
                        if (bookingHit) {
                          openBooking(bookingHit);
                        }
                      }}
                      onMouseUp={() => {
                        // Nach dem Markieren direkt das Änderungs-Modal öffnen —
                        // außer beim Einzelklick auf eine belegte Nacht (Buchungs-Modal)
                        if (!dragging || !selFrom || !selTo) return;
                        const singleClick = selFrom === selTo && selFrom === iso;
                        if (singleClick && bookingHit) {
                          return;
                        }
                        openEditModal();
                      }}
                      disabled={isPast && !bookingHit}
                      title={tooltipParts.join(' · ')}
                      style={cellStyle}
                      className={`relative overflow-hidden h-11 rounded flex flex-col items-center justify-center gap-0.5 ${cellClass} ${interactionClass} ${inSelection ? 'ring-2 ring-gray-800' : ''}`}
                    >
                      {/* Hover-Flächen der beiden Hälften. Der Farbverlauf teilt
                          die Kachel entlang der Gegendiagonale: oben links die
                          Abreise, unten rechts die Anreise. */}
                      {isSplitCell && (
                        <>
                          <span
                            className="absolute inset-0 transition-colors hover:bg-black/15"
                            style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                          />
                          <span
                            className="absolute inset-0 transition-colors hover:bg-black/15"
                            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                          />
                        </>
                      )}
                      {/* Mindestaufenthalt aus Beds24 — nur wenn er wirklich
                          beschränkt (mehr als eine Nacht) */}
                      {info?.minStay !== undefined && info.minStay > 1 && (
                        <span className="pointer-events-none absolute top-0.5 right-1 text-[8px] font-medium leading-none opacity-50">
                          {info.minStay}N
                        </span>
                      )}
                      <span className="pointer-events-none relative text-[9px] leading-none opacity-60">
                        {day}
                      </span>
                      {info?.price1 !== undefined && info.price1 > 0 ? (
                        <span className="pointer-events-none relative text-xs font-semibold leading-none">
                          {Math.round(info.price1)}
                        </span>
                      ) : (
                        <span className="pointer-events-none relative text-xs leading-none opacity-30">
                          –
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tagesdetails + Auswahl */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">Tagesdetails</h4>
          {selFrom ? (
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-medium">{formatGermanDate(selFrom)}</p>
              <p>Preis (price1): {detailInfo?.price1 ? `${detailInfo.price1} €` : '—'}</p>
              {detailInfo?.extraPrices &&
                Object.entries(detailInfo.extraPrices).map(([key, value]) => (
                  <p key={key}>
                    Preis ({key}): {value} €
                  </p>
                ))}
              <p>Mindestaufenthalt: {detailInfo?.minStay ? `${detailInfo.minStay} Nächte` : '—'}</p>
              <p>Max. Aufenthalt: {detailInfo?.maxStay ? `${detailInfo.maxStay} Nächte` : '—'}</p>
              <p>
                Verfügbarkeit:{' '}
                {detailInfo?.numAvail !== undefined ? detailInfo.numAvail : 'unbekannt'}
              </p>
              {detailBooking && (
                <p className="text-blue-700">
                  Belegt: {detailBooking.name}
                  {detailBooking.source && ` · ${detailBooking.source}`}
                </p>
              )}

              {/* Gegenprobe: greift der Mindestaufenthalt wirklich? */}
              <div className="pt-3 mt-2 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => runStayCheck(1)}
                  disabled={stayChecking || !selectedRoomId}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {stayChecking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  Buchbarkeit prüfen: 1 Nacht ab hier
                </button>
                <p className="text-xs text-gray-400">
                  Fragt Beds24, ob eine Anreise an diesem Tag mit nur einer Nacht buchbar wäre —
                  dieselbe Auskunft bekommt auch Booking.com.
                </p>

                {/* Zimmer-Grundeinstellungen aus Beds24. Die „Restriktions-Strategie"
                    entscheidet, wie ein Mindestaufenthalt an die Portale gesendet wird:
                    firstNight → gilt für den Anreisetag (Booking.com: min_los),
                    stayThrough → muss für jede Nacht des Aufenthalts gelten
                    (Booking.com: min_stay_through — wird von Booking.com nicht in
                    jeder Konstellation akzeptiert). */}
                {roomSettings && (
                  <p className="text-xs text-gray-500">
                    Zimmer-Grundeinstellung: Mindestaufenthalt{' '}
                    <strong>{roomSettings.minStay ?? '—'}</strong>, Max.{' '}
                    <strong>{roomSettings.maxStay ?? '—'}</strong> · Strategie:{' '}
                    <strong>
                      {roomSettings.restrictionStrategy === 'firstNight' && 'nur Anreisetag'}
                      {roomSettings.restrictionStrategy === 'stayThrough' && 'ganzer Aufenthalt'}
                      {!roomSettings.restrictionStrategy && '—'}
                    </strong>
                    {roomSettings.restrictionStrategy === 'stayThrough' && (
                      <span className="block text-gray-400">
                        Bei dieser Strategie sendet Beds24 &bdquo;min_stay_through&ldquo; an
                        Booking.com. Wird das dort abgelehnt (z.B. wegen einer Werbeaktion), greift
                        der Mindestaufenthalt nicht. In Beds24 unter Settings → Properties → Rooms →
                        Setup auf &bdquo;nur Anreisetag&ldquo; umstellen und testen.
                      </span>
                    )}
                  </p>
                )}

                {stayCheckError && (
                  <p className="text-xs text-red-700 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {stayCheckError}
                  </p>
                )}

                {stayCheck && stayCheck.offers.length === 0 && (
                  <div className="text-xs text-green-800 bg-green-50 border border-green-200 rounded-lg p-2.5 space-y-1">
                    <p className="font-medium flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Beds24 sperrt{' '}
                      {stayCheck.nights === 1 ? 'eine Nacht' : `${stayCheck.nights} Nächte`} ab{' '}
                      {formatGermanDate(stayCheck.arrival)} korrekt.
                    </p>
                    <p>
                      Ist die Nacht bei Booking.com trotzdem buchbar, gibt es dafür zwei bekannte
                      Ursachen:
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        Beds24 hat die Beschränkung noch nicht übertragen — Restriktionen gehen
                        nicht sofort raus, sondern erst mit der nächsten Aktualisierung. In Beds24
                        unter Channel Manager → Booking.com → Mapping auf
                        &bdquo;Aktualisieren&ldquo;.
                      </li>
                      <li>
                        Booking.com hat <strong>mehrere Ratenpläne</strong>, aber nur der gemappte
                        bekommt die Restriktion. Weitere Pläne (z.B. &bdquo;Nicht kostenfrei
                        stornierbar&ldquo;) übernehmen zwar den Preis, aber{' '}
                        <strong>nicht den Mindestaufenthalt</strong> — außer Booking.com hat sie als
                        Child Rate an die Standard Rate gehängt. Das kann nur der
                        Booking.com-Support einrichten.
                      </li>
                    </ol>
                  </div>
                )}

                {stayCheck && stayCheck.offers.length > 0 && (
                  <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                    <p className="font-medium flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Beds24 bietet{' '}
                      {stayCheck.nights === 1 ? 'eine Nacht' : `${stayCheck.nights} Nächte`} ab{' '}
                      {formatGermanDate(stayCheck.arrival)} trotzdem an.
                    </p>
                    <ul className="list-disc list-inside">
                      {stayCheck.offers.map((o, i) => (
                        <li key={`${o.offerId ?? 'offer'}-${i}`}>
                          {o.offerName || `Angebot ${o.offerId ?? i + 1}`}
                          {o.price !== undefined && ` · ${o.price} €`}
                        </li>
                      ))}
                    </ul>
                    <p>
                      Der Mindestaufenthalt aus dem Kalender wird von diesem Angebot/Ratenplan
                      übersteuert. In Beds24 unter Settings → Properties → Offers bzw. beim
                      zugehörigen Preis denselben Mindestaufenthalt eintragen — sonst bleibt die
                      kurze Buchung bei Booking.com möglich.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Tag im Kalender anklicken</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">Auswahl &amp; Änderung</h4>
          {selFrom && selTo ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                {formatGermanDate(selFrom)} – {formatGermanDate(selTo)} ·{' '}
                <strong>
                  {selDays} {selDays === 1 ? 'Tag' : 'Tage'}
                </strong>
              </p>
              {selectionStats && selectionStats.freeNights > 0 && selectionStats.gross > 0 && (
                <div className="text-sm bg-white rounded-lg border border-gray-200 p-3 space-y-1">
                  <div className="flex justify-between text-gray-700">
                    <span>Freie Nächte in der Auswahl</span>
                    <span>{selectionStats.freeNights}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Möglicher Umsatz (Beds24-Preise)</span>
                    <strong>{selectionStats.gross.toFixed(2)} €</strong>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>
                      − Provision &amp; Gebühren Booking.com (~
                      {Math.round(effectiveCommissionRate * 100)} %)
                    </span>
                    <span>−{(selectionStats.gross * effectiveCommissionRate).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-semibold text-green-700">
                    <span>Mieterlös (netto) bei Buchung über Booking.com</span>
                    <span>
                      {(selectionStats.gross * (1 - effectiveCommissionRate)).toFixed(2)} €
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 pt-1">
                    Bei einer Direktbuchung bliebe der volle Betrag. Gebührenquote aus euren echten
                    Booking.com-Buchungen ermittelt.
                  </p>
                </div>
              )}
              {selectionStats && selectionStats.freeNights > 0 && (
                <div className="text-sm bg-white rounded-lg border border-gray-200 p-3 space-y-1">
                  <p className="font-medium text-gray-700">
                    Nebenkosten — zahlt der Gast zusätzlich vor Ort
                  </p>
                  {pricingSettings.reinigung_rate && (
                    <div className="flex justify-between text-gray-600">
                      <span>Endreinigung</span>
                      <span>{pricingSettings.reinigung_rate.replace('.', ',')} € / Aufenthalt</span>
                    </div>
                  )}
                  {pricingSettings.electricity_rate && (
                    <div className="flex justify-between text-gray-600">
                      <span>Strom</span>
                      <span>{pricingSettings.electricity_rate.replace('.', ',')} € / kWh</span>
                    </div>
                  )}
                  {pricingSettings.water_rate && (
                    <div className="flex justify-between text-gray-600">
                      <span>Wasser</span>
                      <span>
                        {pricingSettings.water_rate.replace('.', ',')} € / Person &amp; Woche
                      </span>
                    </div>
                  )}
                  {pricingSettings.trash_rate && (
                    <div className="flex justify-between text-gray-600">
                      <span>Müll</span>
                      <span>{pricingSettings.trash_rate.replace('.', ',')} € / Sack</span>
                    </div>
                  )}
                  {pricingSettings.holz_rate && (
                    <div className="flex justify-between text-gray-600">
                      <span>Holz</span>
                      <span>{pricingSettings.holz_rate.replace('.', ',')} € / Bündel</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Kurtaxe</span>
                    <span>
                      {(kurtaxeRates.find((r) => selFrom >= r.from && selFrom <= r.to)?.rate ?? 2.7)
                        .toFixed(2)
                        .replace('.', ',')}{' '}
                      € / Erw. &amp; Nacht
                    </span>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openEditModal}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Werte ändern…
                </button>
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Auswahl aufheben
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Tage im Kalender mit gedrückter linker Maustaste markieren (oder einen Tag anklicken),
              dann hier Preis und Mindestaufenthalt gesammelt ändern.
            </p>
          )}
          {saveMessage && (
            <p className="mt-3 text-sm text-green-700 flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              {saveMessage}
            </p>
          )}
          {saveError && !editOpen && (
            <p className="mt-3 text-sm text-red-700 flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {saveError}
            </p>
          )}
        </div>
      </div>

      {/* Buchungen: laufend/kommend + vergangene Aufenthalte (klickbar → Detail-Modal) */}
      <div className="space-y-5">
        {/* Booking.com-Gäste ohne Nachricht von uns — Willkommensnachricht fehlt */}
        {pendingWelcome.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 text-sm mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Willkommensnachricht ausstehend ({pendingWelcome.length})
            </h4>
            <p className="text-xs text-amber-800 mb-2">
              Diese Booking.com-Gäste haben noch keine Nachricht von uns erhalten. Buchung anklicken
              und im Nachrichtenbereich die Vorlage &bdquo;Gäste-App DE/EN&ldquo; senden — sie
              bedankt sich für die Buchung, sagt, dass wir uns auf den Gast freuen, und enthält den
              Gäste-App-Link.
            </p>
            <div className="divide-y divide-amber-200/60">
              {pendingWelcome.map((b) => (
                <button
                  key={b.id}
                  onClick={() => openBooking(b)}
                  className="w-full py-2 px-2 -mx-2 flex items-center justify-between gap-3 text-sm text-left hover:bg-amber-100/60 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-amber-900 truncate">{b.name}</p>
                    <p className="text-xs text-amber-700">
                      {formatGermanDate(b.arrival)} – {formatGermanDate(b.departure)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-amber-900 bg-amber-200 px-2 py-1 rounded-lg">
                    Nachricht verfassen
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-gray-800 text-sm mb-2">
            Beds24-Buchungen — laufend &amp; kommend
            {upcomingBookings.length > 0 ? ` (${upcomingBookings.length})` : ''}
          </h4>
          {hostMsgLoading && (
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Prüfe, welche Booking.com-Gäste schon
              eine Nachricht von uns erhalten haben…
            </p>
          )}
          {!hostMsgLoading && pendingWelcome.length === 0 && Object.keys(hostMsgMap).length > 0 && (
            <p className="text-xs text-green-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Alle laufenden/kommenden Booking.com-Gäste
              haben bereits eine Nachricht von uns erhalten.
            </p>
          )}
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-gray-400">
              Keine laufenden oder kommenden Buchungen — ggf. in Beds24 den
              Booking.com-Bestandsimport anstoßen.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => openBooking(b)}
                  className="w-full py-2 px-2 -mx-2 flex items-center justify-between gap-3 text-sm text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatGermanDate(b.arrival)} – {formatGermanDate(b.departure)}
                      {b.source && ` · ${b.source}`}
                    </p>
                    {hostMsgMap[b.id] === false && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium">
                        <MessageSquare className="w-3 h-3" /> Noch keine Nachricht von uns
                      </span>
                    )}
                    {hostMsgMap[b.id] === true && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Nachricht geschickt
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {b.price && <p className="font-medium text-gray-800">{b.price} €</p>}
                    <p className="text-xs text-gray-400">{b.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {pastBookings.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-1">
              Vergangene Aufenthalte — letzte 90 Tage ({pastBookings.length})
            </h4>
            <p className="text-xs text-gray-400 mb-2">
              Anklicken, um dem Gast eine Danke-/Bewertungsnachricht zu senden.
            </p>
            <div className="divide-y divide-gray-100">
              {pastBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => openBooking(b)}
                  className="w-full py-2 px-2 -mx-2 flex items-center justify-between gap-3 text-sm text-left hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{b.name}</p>
                    <p className="text-xs text-gray-400">
                      {formatGermanDate(b.arrival)} – {formatGermanDate(b.departure)}
                      {b.source && ` · ${b.source}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {b.price && <p className="font-medium text-gray-800">{b.price} €</p>}
                    <p className="text-xs text-gray-400">{b.status}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Auto-Sync: Webhook-URL für Beds24 */}
      {webhookUrl && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <p className="font-semibold text-gray-800 mb-1">Auto-Sync: Webhook-URL für Beds24</p>
          <p className="text-xs text-gray-500 mb-2">
            In Beds24 unter <strong>Settings → Properties → Access → Booking Webhooks</strong>{' '}
            eintragen (Version 2/JSON). Neue oder geänderte Buchungen aller verbundenen Kanäle
            (Booking.com, Feratel, FeWo-direkt über Vrbo, Airbnb) landen dann automatisch in eurer
            Gästedatenbank — inkl. Plattform, Gast-Anlage, Dubletten-Schutz und Storno-Erkennung.
            Protokoll unter System → Logs (Quelle: beds24-webhook).
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs overflow-x-auto whitespace-nowrap">
              {webhookUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors shrink-0"
            >
              Kopieren
            </button>
          </div>
        </div>
      )}

      {/* Saisonpreise aus dem Mietpreise-Tab an Beds24 übertragen */}
      <Beds24SeasonSync roomId={selectedRoomId} dayMap={dayMap} onSynced={load} />

      {/* Sicherungen vor jeder Änderung — Preise zurückholen */}
      <Beds24History key={loadCount} onRestored={load} />

      {/* Beds24-Einstellungen: per API änderbar + Checkliste für UI-only */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
        <p className="font-semibold text-gray-800">Beds24-Einstellungen</p>
        <BookingCutoffSetting />
        <BookingHorizonSetting />
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">
            Endreinigung am Zimmer (cleaningFee, €)
            <input
              type="number"
              min="0"
              step="1"
              value={cfInput}
              onChange={(e) => setCfInput(e.target.value)}
              placeholder={String(pricingSettings.reinigung_rate || '100')}
              className="mt-1 block w-44 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
            />
          </label>
          <button
            onClick={saveCleaningFee}
            disabled={cfSaving || !cfInput || !propertyId || !selectedRoomId}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {cfSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Bei Beds24 speichern
          </button>
          <span className="text-xs text-gray-400 pb-2">
            aktuell:{' '}
            {(() => {
              const meta = roomMetaList.find((r) => Number(r.id) === selectedRoomId);
              const fee = meta ? Number(rawStr(meta, 'cleaningFee')) : 0;
              return fee > 0 ? `${fee} €` : 'nicht gesetzt';
            })()}
          </span>
        </div>
        {cfMessage && (
          <p className="text-sm text-green-700 flex items-start gap-1.5">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            {cfMessage}
          </p>
        )}
        {cfError && (
          <p className="text-sm text-red-700 flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {cfError}
          </p>
        )}
        <div>
          <p className="font-medium text-gray-700 mb-1">
            Checkliste — nur im Beds24-UI möglich (Stand wird lokal gemerkt)
          </p>
          {BEDS24_CHECKLIST.map((item) => (
            <label key={item.key} className="flex items-center gap-2 py-0.5 text-gray-700">
              <input
                type="checkbox"
                checked={!!checklist[item.key]}
                onChange={() => toggleChecklist(item.key)}
                className="w-4 h-4 accent-green-600"
              />
              <span className={checklist[item.key] ? 'line-through text-gray-400' : ''}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ===== Modal: Werte ändern ===== */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                Werte ändern
                {selFrom && selTo && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {formatGermanDate(selFrom)} – {formatGermanDate(selTo)} · {selDays}{' '}
                    {selDays === 1 ? 'Tag' : 'Tage'}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectionStats && selectionStats.freeNights > 0 && (
              <div className="text-sm bg-gray-50 rounded-lg p-3 space-y-1 mb-3">
                <div className="flex justify-between text-gray-700">
                  <span>Freie Nächte · möglicher Umsatz</span>
                  <strong>
                    {selectionStats.freeNights} · {selectionStats.gross.toFixed(2)} €
                  </strong>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>
                    − Provision &amp; Gebühren (~{Math.round(effectiveCommissionRate * 100)} %)
                  </span>
                  <span>−{(selectionStats.gross * effectiveCommissionRate).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between font-semibold text-green-700">
                  <span>Mieterlös (netto) über Booking.com</span>
                  <span>{(selectionStats.gross * (1 - effectiveCommissionRate)).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-gray-500 pt-1 border-t border-gray-200">
                  <span>+ vor Ort: Endreinigung · Kurtaxe</span>
                  <span>
                    {(pricingSettings.reinigung_rate || '100').replace('.', ',')} € ·{' '}
                    {(selFrom
                      ? (kurtaxeRates.find((r) => selFrom >= r.from && selFrom <= r.to)?.rate ??
                        2.7)
                      : 2.7
                    )
                      .toFixed(2)
                      .replace('.', ',')}{' '}
                    €/Erw./Nacht
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <label className="text-xs text-gray-500">
                Von
                <input
                  type="date"
                  value={formFrom}
                  onChange={(e) => setFormFrom(e.target.value)}
                  className="mt-1 w-full px-2 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </label>
              <label className="text-xs text-gray-500">
                Bis (einschließlich)
                <input
                  type="date"
                  value={formTo}
                  onChange={(e) => setFormTo(e.target.value)}
                  className="mt-1 w-full px-2 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </label>
              <label className="text-xs text-gray-500">
                Preis pro Nacht (€)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder={
                    detailInfo?.price1 !== undefined && detailInfo.price1 > 0
                      ? `unverändert (aktuell ${detailInfo.price1} €)`
                      : 'unverändert'
                  }
                  className="mt-1 w-full px-2 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </label>
              <label className="text-xs text-gray-500">
                Mindestaufenthalt (Nächte)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formMinStay}
                  onChange={(e) => setFormMinStay(e.target.value)}
                  placeholder={
                    detailInfo?.minStay !== undefined && detailInfo.minStay > 0
                      ? `unverändert (aktuell ${detailInfo.minStay})`
                      : 'unverändert'
                  }
                  className="mt-1 w-full px-2 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </label>
              {/* Nur ab sm über zwei Spalten — ohne Präfix erzwänge col-span-2 auf dem
                  Handy eine zweite, schmale Spalte und quetschte Von/Bis zusammen */}
              <label className="text-xs text-gray-500 sm:col-span-2">
                Verfügbarkeit
                <select
                  value={formAvail}
                  onChange={(e) => setFormAvail(e.target.value)}
                  className="mt-1 w-full px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">unverändert</option>
                  <option value="0">Nächte sperren (nicht buchbar)</option>
                  <option value="1">Nächte freigeben (buchbar)</option>
                </select>
              </label>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Die Änderung gilt für <strong>alle markierten Tage</strong> — auch bereits
              vermietete/belegte (bestehende Buchungen bleiben unberührt). Es wird nur geändert, was
              ausgefüllt ist: Leere Felder und Verfügbarkeit &bdquo;unverändert&ldquo; bleiben bei
              Beds24 exakt wie bisher. Beds24 synchronisiert die Änderung automatisch an die
              verbundenen Portale (z.B. Booking.com).
            </p>

            {formMinStay && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-4">
                Der Mindestaufenthalt gilt jeweils für <strong>Anreisen an dem Tag</strong>, an dem
                er gesetzt ist. Damit über einen längeren Zeitraum keine Kurzbuchungen möglich sind,
                muss der <strong>ganze Zeitraum</strong> markiert sein — nicht nur ein einzelner
                Tag. Angebote bzw. Ratenpläne mit eigenem Mindestaufenthalt können den Kalenderwert
                zusätzlich übersteuern; das lässt sich danach unter &bdquo;Tagesdetails&ldquo; mit
                &bdquo;Buchbarkeit prüfen&ldquo; kontrollieren.
              </p>
            )}

            {saveError && (
              <p className="mb-3 text-sm text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {saveError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Bei Beds24 speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal: Buchungsdetails (Gastdaten + Nachrichten + Zuordnung) ===== */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-5 my-8">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">{activeBooking.name}</h3>
              <button
                onClick={() => setActiveBooking(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {formatGermanDate(activeBooking.arrival)} –{' '}
              {formatGermanDate(activeBooking.departure)}
              {activeBooking.source && ` · ${activeBooking.source}`}
              {activeBooking.price && ` · ${activeBooking.price} €`}
              {activeBooking.status && ` · ${activeBooking.status}`}
            </p>

            {/* Gastdaten aus Beds24/Booking.com */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-4">
              {BOOKING_DETAIL_FIELDS.map(({ label, key }) => {
                const value = rawStr(activeBooking.raw, key);
                if (!value) return null;
                return (
                  <p key={key} className="text-gray-700">
                    <span className="text-gray-400">{label}:</span> {value}
                  </p>
                );
              })}
            </div>

            {/* Preisaufstellung */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                <Euro className="w-4 h-4" />
                Preisaufstellung
              </h4>
              {invoiceItems.length > 0 && (
                <div className="divide-y divide-gray-200 text-sm mb-2">
                  {invoiceItems.map((item, i) => {
                    const qty = Number(rawStr(item, 'qty')) || 1;
                    const amount = Number(rawStr(item, 'amount')) || 0;
                    const lineTotal = Number(rawStr(item, 'lineTotal')) || qty * amount;
                    const isPayment = rawStr(item, 'type') === 'payment';
                    return (
                      <div key={i} className="py-1.5 flex justify-between gap-3">
                        <span className="text-gray-700">
                          {resolveInvoiceDescription(
                            rawStr(item, 'description') || rawStr(item, 'type') || 'Position',
                            activeBooking,
                          )}
                          {qty > 1 && ` × ${qty}`}
                        </span>
                        <span className={isPayment ? 'text-green-700' : 'text-gray-900'}>
                          {isPayment ? '−' : ''}
                          {lineTotal.toFixed(2)} €
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-2 border-t border-gray-300 text-sm space-y-1">
                {bookingPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      Mietpreis (Gesamtpreis lt. {activeBooking.source || 'Portal'})
                    </span>
                    <strong>{bookingPrice.toFixed(2)} €</strong>
                  </div>
                )}
                {cityTaxInPrice && bookingKurtaxe > 0 && (
                  <>
                    <div className="flex justify-between text-amber-700">
                      <span>− davon Übernachtungssteuer (zahlt der Gast vor Ort)</span>
                      <span>−{bookingKurtaxe.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>= vom Portal eingezogen (kommissionspflichtig)</span>
                      <span>{portalCollects.toFixed(2)} €</span>
                    </div>
                  </>
                )}
                {bookingCommission > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>− Kommission &amp; Gebühren ({activeBooking.source || 'Portal'})</span>
                    <span>−{bookingCommission.toFixed(2)} €</span>
                  </div>
                )}
                {bookingPrice > 0 && bookingCommission > 0 && (
                  <div className="flex justify-between font-semibold text-green-700">
                    <span>Voraussichtliche Auszahlung an euch</span>
                    <span>{bookingPayout.toFixed(2)} €</span>
                  </div>
                )}
                {!cityTaxInPrice && bookingKurtaxe > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>
                      + Kurtaxe (zahlt der Gast vor Ort, geschätzt: {bookingAdults} Erw. ×{' '}
                      {bookingNightsCount} Nächte)
                    </span>
                    <span>{bookingKurtaxe.toFixed(2)} €</span>
                  </div>
                )}
                {guestTotal > 0 && (
                  <div className="flex justify-between text-gray-700 pt-1 border-t border-gray-200">
                    <span>
                      Gast zahlt insgesamt{' '}
                      {cityTaxInPrice ? '(inkl. Steuer vor Ort)' : '(inkl. Kurtaxe vor Ort)'}
                    </span>
                    <strong>{guestTotal.toFixed(2)} €</strong>
                  </div>
                )}
              </div>
              {infoItems.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                    Zusatzinfos von Booking.com ({infoItems.length}) — z.B. Werbeaktionen/Raten
                  </summary>
                  <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                    {infoItems.map((it, i) => (
                      <p key={i}>
                        <span className="text-gray-400">{rawStr(it, 'code')}:</span>{' '}
                        {rawStr(it, 'text')}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Anreisezeit & Gastwünsche */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Anreisezeit &amp; Gastwünsche
              </h4>
              {guestRequests.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Beds24 liefert zu dieser Buchung keine Anreisezeit und keinen Gastkommentar.
                </p>
              ) : (
                <div className="space-y-2">
                  {guestRequests.map((f) => (
                    <div key={f.key} className="bg-amber-50 rounded-lg p-2.5">
                      <p className="text-xs text-amber-700 mb-0.5">{f.label}</p>
                      <p className="text-gray-800 text-sm whitespace-pre-wrap">{f.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Diagnose: In welchem Feld legt das Portal eine Anfrage ab?
                  Booking.com befüllt je nach Anfragetyp unterschiedliche Felder,
                  und die API-Dokumentation sagt nicht, welches. Deshalb hier alle
                  gefüllten Felder des Datensatzes im Klartext. */}
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Alle Beds24-Felder dieser Buchung ({rawFields.length}) — Diagnose
                </summary>
                <div className="mt-2">
                  <button
                    onClick={copyRawBooking}
                    className="inline-flex items-center gap-1.5 text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {rawCopied ? 'Kopiert' : 'Kompletten Datensatz kopieren'}
                  </button>
                  <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-gray-50 p-2.5 space-y-1">
                    {rawFields.map((f) => (
                      <p key={f.key} className="text-xs font-mono break-words">
                        <span className="text-gray-400">{f.key}:</span>{' '}
                        <span className="text-gray-800">{f.value}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </details>
            </div>

            {/* Kommunikation */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" />
                Nachrichten
              </h4>
              {messagesLoading && (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Lade Nachrichten...
                </p>
              )}
              {messagesError && <p className="text-sm text-red-600">{messagesError}</p>}
              {!messagesLoading && !messagesError && messages.length === 0 && (
                <p className="text-sm text-gray-400">Keine Nachrichten zu dieser Buchung</p>
              )}
              {messages.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-sm">
                      <p className="text-xs text-gray-400 mb-0.5">
                        {rawStr(m, 'time') || rawStr(m, 'created')}
                        {rawStr(m, 'source') && ` · ${rawStr(m, 'source')}`}
                      </p>
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {rawStr(m, 'message') || rawStr(m, 'text') || JSON.stringify(m)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Antwort an den Gast schreiben..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                />
                {/* Anrede für die Vorlagen — Booking.com liefert das Feld oft
                    nicht, dann bliebe es beim neutralen „Guten Tag Vorname
                    Nachname". Hier lässt sich Herr/Frau festlegen. */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500">Anrede:</span>
                  {(
                    [
                      { key: 'auto', label: 'Automatisch' },
                      { key: 'female', label: 'Frau' },
                      { key: 'male', label: 'Herr' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSalutation(opt.key)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        salutation === opt.key
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <span className="text-xs text-gray-400">
                    &rarr; {germanSalutation(salutationInfo(activeBooking, chosenGender))}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => insertTemplate('de')}
                    disabled={creatingToken}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {creatingToken && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Vorlage Gäste-App DE{isEarlyBooking ? ' (früh)' : ''}
                  </button>
                  <button
                    onClick={() => insertTemplate('en')}
                    disabled={creatingToken}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {creatingToken && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Vorlage Gäste-App EN{isEarlyBooking ? ' (früh)' : ''}
                  </button>
                  <button
                    onClick={insertPreCheckinTemplate}
                    className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-800 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    Vorlage Pre-Check-in
                  </button>
                  <button
                    onClick={() => insertReviewTemplate('de')}
                    className="px-3 py-1.5 text-xs bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Vorlage Bewertung DE
                  </button>
                  <button
                    onClick={() => insertReviewTemplate('en')}
                    className="px-3 py-1.5 text-xs bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Vorlage Bewertung EN
                  </button>
                  <button
                    onClick={sendReply}
                    disabled={sendingReply || !replyText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {sendingReply ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5" />
                    )}
                    Senden
                  </button>
                </div>
                {isEarlyBooking && (
                  <p className="text-xs text-gray-500">
                    Anreise erst in {daysToArrival} Tagen — die Vorlage spricht den langen Vorlauf
                    an und lädt schon jetzt zum Stöbern in der Gäste-App ein.
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Wird über Beds24 an den Gast gesendet (bei Booking.com in den Chat — Messaging
                  muss im Channel aktiv sein). Ob Feratel und FeWo-direkt Nachrichten annehmen,
                  hängt vom jeweiligen Channel ab.
                </p>
              </div>
            </div>

            {/* Zuordnung zur Gästedatenbank */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-2 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Mit Gästedatenbank synchronisieren
              </h4>
              {existingMatch ? (
                <div className="flex items-start gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Bereits in der Gästedatenbank vorhanden — verknüpft mit{' '}
                    <strong>{existingMatch.guestName}</strong> ({existingMatch.reason}). Es wird
                    nichts doppelt angelegt.
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={assignGuestId}
                      onChange={(e) => setAssignGuestId(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">Gast auswählen…</option>
                      <option value="new">+ Neuen Gast aus Buchungsdaten anlegen</option>
                      {guestList.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.guest_name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssign}
                      disabled={assigning}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {assigning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      Buchung übernehmen
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {assignGuestId && assignGuestId !== 'new'
                      ? 'Gast wurde anhand des Namens vorgeschlagen — bitte prüfen. '
                      : ''}
                    Legt die Buchung mit Zeitraum, Personen, Preis und Buchungsnummer in eurer
                    Gästedatenbank an und ordnet sie dem gewählten Gast zu. E-Mail und Handynummer
                    aus der Buchung werden mit übernommen — bei einem bestehenden Gast nur, wenn
                    dort noch nichts hinterlegt ist.
                  </p>
                </>
              )}
              {assignMessage && (
                <p className="mt-2 text-sm text-green-700 flex items-start gap-1.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  {assignMessage}
                </p>
              )}
              {assignError && (
                <p className="mt-2 text-sm text-red-700 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {assignError}
                </p>
              )}
            </div>

            <details>
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                Alle Buchungsdaten anzeigen (Rohdaten)
              </summary>
              <pre className="mt-2 p-3 bg-gray-900 text-green-200 text-[11px] rounded-lg overflow-x-auto max-h-72 overflow-y-auto">
                {JSON.stringify(activeBooking.raw, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
