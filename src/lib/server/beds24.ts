// Gemeinsamer Beds24-Zugriff für Admin Center, Webhook und Buchungsschluss.
// Alle brauchen denselben Access-Token; er wird in der settings-Tabelle
// zwischengespeichert und aus dem Refresh-Token erneuert.

export const BEDS24_API = 'https://beds24.com/api/v2';

export const KEY_REFRESH_TOKEN = 'beds24_refresh_token';
export const KEY_ACCESS_TOKEN = 'beds24_access_token';
export const KEY_ACCESS_EXPIRES = 'beds24_access_token_expires';

/**
 * Beds24-Unterkunft (propertyId) der Sechszirbenhütte. Das Beds24-Konto wird
 * mit der Natberger Hütte geteilt — ohne diese Einschränkung sähe das Cockpit
 * Zimmer und Buchungen beider Häuser und könnte Preise ins falsche Zimmer
 * schreiben. Wird im Beds24-Tab gewählt.
 */
export const KEY_PROPERTY_ID = 'beds24_property_id';

export async function getPropertyId(db: D1Database): Promise<number | null> {
  const value = Number(await getSetting(db, KEY_PROPERTY_ID));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Zimmer-IDs (roomTypes) einer Unterkunft laden — für die Schreibschutz-Prüfung. */
export async function fetchPropertyRoomIds(
  token: string,
  propertyId: number,
): Promise<{ roomIds?: number[]; error?: string }> {
  const res = await fetch(`${BEDS24_API}/properties?id=${propertyId}&includeAllRooms=true`, {
    headers: { token, Accept: 'application/json' },
  });
  const parsed = await parseJsonSafe(res);
  if (!res.ok || !parsed.ok) {
    return { error: `Beds24 antwortete mit HTTP ${res.status}` };
  }
  const rows = (parsed.data as { data?: unknown })?.data;
  const property = (Array.isArray(rows) ? rows : []).find(
    (p) => Number((p as { id?: unknown }).id) === propertyId,
  ) as { roomTypes?: unknown } | undefined;
  if (!property) return { error: `Beds24 kennt die Unterkunft ${propertyId} nicht` };
  const roomTypes = Array.isArray(property.roomTypes) ? property.roomTypes : [];
  return {
    roomIds: roomTypes
      .map((r) => Number((r as { id?: unknown }).id))
      .filter((id) => Number.isFinite(id) && id > 0),
  };
}

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>();
  return row?.value || null;
}

export async function setSetting(db: D1Database, key: string, value: string) {
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(key, value, value)
    .run();
}

// Beds24 antwortet bei unbekannten Pfaden teils mit leerem Body —
// dann liefert res.json() einen Parse-Fehler statt einer Fehlermeldung.
export async function parseJsonSafe(res: Response): Promise<{ ok: boolean; data: unknown }> {
  const text = await res.text();
  if (!text) {
    return { ok: false, data: '(leere Antwort)' };
  }
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: text.slice(0, 500) };
  }
}

// Gültigen Access-Token besorgen (gecacht, sonst per Refresh-Token erneuern)
export async function getBeds24AccessToken(
  db: D1Database,
): Promise<{ token?: string; error?: string }> {
  const refreshToken = await getSetting(db, KEY_REFRESH_TOKEN);
  if (!refreshToken) {
    return { error: 'Nicht verbunden — bitte zuerst einen Beds24 Invite Code einlösen.' };
  }

  const cachedToken = await getSetting(db, KEY_ACCESS_TOKEN);
  const cachedExpires = await getSetting(db, KEY_ACCESS_EXPIRES);
  if (cachedToken && cachedExpires && Date.now() < Number(cachedExpires) - 60_000) {
    return { token: cachedToken };
  }

  const res = await fetch(`${BEDS24_API}/authentication/token`, {
    headers: { refreshToken, Accept: 'application/json' },
  });
  const parsed = await parseJsonSafe(res);
  const data = (parsed.ok ? parsed.data : {}) as {
    token?: string;
    expiresIn?: number;
    error?: string;
  };
  if (!res.ok || !data.token) {
    return {
      error: `Token-Erneuerung fehlgeschlagen (HTTP ${res.status}): ${data.error || 'unbekannter Fehler'}`,
    };
  }

  const expiresAt = Date.now() + (data.expiresIn || 86400) * 1000;
  await setSetting(db, KEY_ACCESS_TOKEN, data.token);
  await setSetting(db, KEY_ACCESS_EXPIRES, String(expiresAt));
  return { token: data.token };
}

/**
 * Fachliche Fehler aus einer Beds24-Antwort lesen. Beds24 meldet sie auch mit
 * HTTP 200/201 im Body — als Einzel- ({ success: false, error }) oder
 * Sammelantwort ([{ success: false, errors: [{ field, message }] }]).
 */
export function beds24ResultError(data: unknown): string | null {
  const messages: string[] = [];

  const collect = (item: unknown) => {
    if (!item || typeof item !== 'object') return;
    const obj = item as { success?: boolean; error?: unknown; errors?: unknown };
    const errors = Array.isArray(obj.errors) ? obj.errors : [];
    for (const entry of errors) {
      if (typeof entry === 'string') {
        messages.push(entry);
        continue;
      }
      if (entry && typeof entry === 'object') {
        const { field, message } = entry as { field?: unknown; message?: unknown };
        const text = String(message ?? '').trim() || 'abgelehnt';
        messages.push(field ? `${String(field)}: ${text}` : text);
      }
    }
    if (obj.success === false && errors.length === 0) {
      const text = typeof obj.error === 'string' ? obj.error.trim() : '';
      messages.push(text || 'Beds24 hat die Anfrage abgelehnt');
    }
  };

  if (Array.isArray(data)) {
    data.forEach(collect);
  } else {
    collect(data);
  }

  return messages.length > 0 ? messages.join(' · ') : null;
}

// ============================================================================
// Verfügbarkeit (Tage sperren/freigeben) — für den Buchungsschluss
// ============================================================================

/** Einstellung, falls das an die Portale gemeldete Zimmer fest vorgegeben werden soll */
export const KEY_ROOM_ID = 'beds24_room_id';

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface CalendarEntry {
  from?: string;
  to?: string;
  numAvail?: number | null;
  price1?: number | null;
  minStay?: number | null;
}

interface CalendarRoom {
  roomId?: number;
  calendar?: CalendarEntry[];
}

export interface Beds24Availability {
  roomId: number;
  /** Nächte (YYYY-MM-DD), die bei Beds24 mit Verfügbarkeit 0 gesperrt sind */
  closedNights: string[];
  /** Mindestaufenthalt je Anreisenacht (nur Nächte mit Wert > 1) */
  minStay: Record<string, number>;
}

/**
 * Gesperrte Nächte im Zeitraum laden — nur Zimmer der festgelegten Unterkunft.
 * Das Zimmer wird wie im Admin-Cockpit gewählt: fest hinterlegtes Zimmer (settings.beds24_room_id), sonst das erste
 * Zimmer, für das Beds24 Preise führt — das ist das an die Portale übertragene.
 */
export async function fetchBeds24Availability(
  db: D1Database,
  from: string,
  to: string,
): Promise<{ availability?: Beds24Availability; error?: string }> {
  // Ohne festgelegte Unterkunft könnte hier ein Zimmer der Natberger Hütte
  // gesperrt werden (gemeinsames Beds24-Konto)
  const propertyId = await getPropertyId(db);
  if (!propertyId) return { error: 'Beds24-Unterkunft im Admin Center nicht festgelegt' };

  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { error: error || 'Kein Beds24-Zugang' };

  const res = await fetch(
    `${BEDS24_API}/inventory/rooms/calendar?startDate=${from}&endDate=${to}` +
      `&propertyId=${propertyId}&includeNumAvail=true&includePrices=true&includeMinStay=true`,
    { headers: { token, Accept: 'application/json' } },
  );
  const parsed = await parseJsonSafe(res);
  if (!res.ok || !parsed.ok) {
    return { error: `Beds24 antwortete mit HTTP ${res.status}` };
  }
  const apiError = beds24ResultError(parsed.data);
  if (apiError) return { error: apiError };

  const rows = (parsed.data as { data?: unknown })?.data;
  const rooms = (Array.isArray(rows) ? rows : []) as CalendarRoom[];
  if (rooms.length === 0) return { error: 'Beds24 liefert keine Zimmer' };

  const fixed = Number(await getSetting(db, KEY_ROOM_ID));
  const room =
    rooms.find((r) => fixed > 0 && r.roomId === fixed) ||
    rooms.find((r) => (r.calendar || []).some((e) => typeof e.price1 === 'number')) ||
    rooms[0];
  if (!room) return { error: 'Beds24 liefert keine Zimmer' };
  const roomId = Number(room.roomId);
  if (!Number.isFinite(roomId) || roomId <= 0) return { error: 'Beds24-Zimmer ohne ID' };

  const closed = new Set<string>();
  const minStay: Record<string, number> = {};
  for (const entry of room.calendar || []) {
    if (!entry.from) continue;
    const isClosed = entry.numAvail === 0;
    const stay = typeof entry.minStay === 'number' && entry.minStay > 1 ? entry.minStay : 0;
    if (!isClosed && !stay) continue;
    const last = entry.to || entry.from;
    let day = entry.from < from ? from : entry.from;
    let guard = 0;
    while (day <= last && day <= to && guard < 800) {
      if (isClosed) closed.add(day);
      if (stay) minStay[day] = stay;
      day = addDaysIso(day, 1);
      guard++;
    }
  }

  return { availability: { roomId, closedNights: [...closed].sort(), minStay } };
}

/**
 * Zeiträume sperren (numAvail 0) oder freigeben (1); `to` ist jeweils die
 * letzte Nacht. Beds24 gibt die Änderung an alle verbundenen Portale weiter.
 */
export async function setBeds24Availability(
  db: D1Database,
  roomId: number,
  entries: { from: string; to: string; numAvail: 0 | 1 }[],
): Promise<{ success: boolean; error?: string }> {
  const { token, error } = await getBeds24AccessToken(db);
  if (!token) return { success: false, error: error || 'Kein Beds24-Zugang' };

  const res = await fetch(`${BEDS24_API}/inventory/rooms/calendar`, {
    method: 'POST',
    headers: { token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify([{ roomId, calendar: entries }]),
  });
  const parsed = await parseJsonSafe(res);
  if (!res.ok || !parsed.ok) {
    return { success: false, error: `Beds24 antwortete mit HTTP ${res.status}` };
  }
  const apiError = beds24ResultError(parsed.data);
  if (apiError) return { success: false, error: apiError };
  // Kalender der Website (publicAvailability.ts) beim nächsten Aufruf neu laden
  await db
    .prepare("DELETE FROM settings WHERE key = 'public_availability_cache'")
    .run()
    .catch(() => undefined);
  return { success: true };
}
