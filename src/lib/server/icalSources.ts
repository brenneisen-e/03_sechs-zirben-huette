// iCal-Exporte der Portale der Sechszirbenhütte (settings.ical_sources).
// Genutzt vom Cockpit (/api/admin/feratel-calendar) und vom öffentlichen
// Belegungskalender (publicAvailability.ts) — dort nur die Zeiträume, nie
// Namen oder andere Angaben aus den Kalendern.

// iCal-Exporte der Portale. Bewusst NICHT fest im Code: Hier standen früher
// die Adressen der Natberger Hütte (beim Kopieren des Admin Centers
// übernommen) — das Cockpit zeigte dadurch deren Buchungen als Belegung der
// Sechszirbenhütte. Die Adressen werden jetzt im Beds24-Tab gepflegt
// (settings.ical_sources, JSON [{ name, url }]).
const ICAL_SETTINGS_KEY = 'ical_sources';

export async function loadIcalSources(
  db: D1Database | undefined,
): Promise<{ name: string; url: string }[]> {
  if (!db) return [];
  try {
    const row = await db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .bind(ICAL_SETTINGS_KEY)
      .first<{ value: string }>();
    const list = JSON.parse(row?.value || '[]') as { name?: unknown; url?: unknown }[];
    return (Array.isArray(list) ? list : [])
      .filter((e) => typeof e.url === 'string' && /^https:\/\//.test(e.url))
      .map((e) => ({ name: String(e.name || 'Portal'), url: String(e.url) }));
  } catch {
    return [];
  }
}

export interface BookedPeriod {
  start: string;
  end: string;
  summary?: string;
  source?: string;
}

// Parse iCal data to extract VEVENT entries
export function parseICalData(icalData: string, sourceName: string): BookedPeriod[] {
  const events: BookedPeriod[] = [];

  // Split by VEVENT
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;

  while ((match = eventRegex.exec(icalData)) !== null) {
    const eventBlock = match[1];
    if (!eventBlock) continue;

    // Extract DTSTART (handle both DATE and DATE-TIME formats)
    const startMatch = eventBlock.match(/DTSTART[^:]*:(\d{8})/);
    // Extract DTEND
    const endMatch = eventBlock.match(/DTEND[^:]*:(\d{8})/);
    // Extract SUMMARY (optional)
    const summaryMatch = eventBlock.match(/SUMMARY[^:]*:([^\r\n]+)/);

    if (startMatch && endMatch) {
      const startStr = startMatch[1];
      const endStr = endMatch[1];
      if (!startStr || !endStr) continue;

      // Format: YYYYMMDD -> YYYY-MM-DD
      const start = `${startStr.slice(0, 4)}-${startStr.slice(4, 6)}-${startStr.slice(6, 8)}`;
      const end = `${endStr.slice(0, 4)}-${endStr.slice(4, 6)}-${endStr.slice(6, 8)}`;

      events.push({
        start,
        end,
        summary: summaryMatch?.[1]
          ? `[${sourceName}] ${summaryMatch[1].trim()}`
          : `[${sourceName}]`,
        source: sourceName,
      });
    }
  }

  return events;
}

// Fetch iCal data from a single source
export async function fetchICalFromSource(source: {
  name: string;
  url: string;
}): Promise<{ periods: BookedPeriod[]; error?: string }> {
  try {
    // Use browser-like headers to avoid 403 blocking
    const response = await fetch(source.url, {
      headers: {
        Accept: 'text/calendar, text/plain, */*',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    });

    console.log(`${source.name} iCal response status:`, response.status);

    if (response.ok) {
      const data = await response.text();
      // Check if it looks like iCal data
      if (data.includes('BEGIN:VCALENDAR') || data.includes('BEGIN:VEVENT')) {
        const periods = parseICalData(data, source.name);
        console.log(`${source.name}: Found ${periods.length} bookings`);
        return { periods };
      }
      console.log(
        `${source.name} response not iCal format, first 200 chars:`,
        data.substring(0, 200),
      );
      return { periods: [], error: `${source.name}: Ungültiges Format` };
    } else {
      console.log(`${source.name} iCal response not OK:`, response.status, response.statusText);
      return { periods: [], error: `${source.name}: ${response.status}` };
    }
  } catch (error) {
    console.error(`Failed to fetch ${source.name} iCal:`, error);
    return { periods: [], error: `${source.name}: Timeout/Fehler` };
  }
}

/** Alle Quellen lesen; Fehler einzelner Quellen werden mitgeliefert */
export async function fetchAllIcalPeriods(
  db: D1Database | undefined,
): Promise<{ periods: BookedPeriod[]; sources: string[]; errors: string[] }> {
  const sources = await loadIcalSources(db);
  const results = await Promise.all(sources.map((source) => fetchICalFromSource(source)));
  const periods: BookedPeriod[] = [];
  const ok: string[] = [];
  const errors: string[] = [];
  results.forEach((result, index) => {
    periods.push(...result.periods);
    // Ein gültiger Kalender ohne Buchungen ist auch ein Erfolg
    if (result.error) errors.push(result.error);
    else ok.push(sources[index]!.name);
  });
  return { periods, sources: ok, errors };
}
