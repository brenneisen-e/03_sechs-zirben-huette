// Kanonische Adresse der öffentlichen Website — für Canonical-Links, Sitemap,
// robots.txt, Open Graph und strukturierte Daten (eine Quelle).
export const SITE_URL = 'https://www.sechszirbenhuette.com';

export const SITE_NAME = 'Sechszirbenhütte';

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * D1 liefert Zeitstempel als „2026-10-30 23:17:30“ (UTC, ohne Zone). Ohne
 * Zone liest `new Date` das als Ortszeit — auf dem Server (UTC) und im
 * Browser (Berlin) käme dann ein anderer Tag heraus. Darum immer als UTC.
 */
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const date = new Date(hasZone ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(value: string | null | undefined): string | undefined {
  return parseDbDate(value)?.toISOString();
}

/** Datum für die Anzeige, fest in österreichischer Zeit (gleich auf Server und Client) */
export function formatGermanDate(value: string | null | undefined): string {
  const date = parseDbDate(value);
  if (!date) return '';
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Vienna',
  });
}

/** Führende Emojis aus Titeln entfernen (für <title>, Open Graph, strukturierte Daten) */
export function plainTitle(title: string): string {
  return title.replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️\s]+/u, '').trim();
}
