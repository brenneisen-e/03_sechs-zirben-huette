import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { getPublicAvailability } from '@/lib/server/publicAvailability';

interface Env {
  DB: D1Database;
}

// Öffentlich: freie und belegte Nächte für den Kalender der Buchungssuche
// (src/components/brand/BookingSearch.tsx). Nur Daten, keine Preise und keine
// Gastdaten — Preise zeigt weiterhin nur das Beds24-Formular.

export async function GET() {
  try {
    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    const availability = db ? await getPublicAvailability(db) : null;
    if (!availability) {
      return NextResponse.json({ available: false }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const { from, to, closed, minStay } = availability;
    return NextResponse.json(
      { available: true, from, to, closed, minStay },
      { headers: { 'Cache-Control': 'public, max-age=120' } },
    );
  } catch {
    return NextResponse.json({ available: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
