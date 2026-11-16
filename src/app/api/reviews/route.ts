import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface ReviewRecord {
  id: number;
  gast_name: string;
  bewertung: number;
  titel: string | null;
  text: string | null;
  aufenthalt_von: string | null;
  quelle: string | null;
}

// Beispieltexte aus der Anfangszeit der Website (früher als Rückfall im Code
// und über „Beispiele importieren“ im Admin Center in die Datenbank gelangt).
// Das sind keine Bewertungen echter Gäste — sie werden nicht mehr ausgeliefert,
// auch wenn sie noch in der Datenbank stehen. Ohne echte Bewertungen zeigt der
// Abschnitt nur den Verweis auf Google.
const SAMPLE_REVIEWS = new Set([
  'Familie M.|Traumhafter Urlaub',
  'Stefan & Anna|Perfekte Auszeit',
  'Hundefamilie K.|Perfekt mit Hund',
  'Familie Schneider|Wie im Bilderbuch',
  'Thomas W.|Wintertraum',
  'Maria & Peter|Romantischer Rückzugsort',
]);

export async function GET() {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as {
      DB: { prepare: (q: string) => { all: <T>() => Promise<{ results?: T[] }> } };
    };

    if (env?.DB) {
      const result = await env.DB.prepare(
        'SELECT id, gast_name, bewertung, titel, text, aufenthalt_von, quelle FROM reviews WHERE sichtbar = 1 ORDER BY created_at DESC',
      ).all<ReviewRecord>();

      const reviews = (result.results || []).filter(
        (r) => !SAMPLE_REVIEWS.has(`${r.gast_name}|${r.titel ?? ''}`),
      );
      return NextResponse.json({ reviews });
    }
  } catch {
    // Ohne Datenbank: keine Bewertungen
  }

  return NextResponse.json({ reviews: [] });
}
