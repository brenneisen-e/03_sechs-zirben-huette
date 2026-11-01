import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import { beds24Source, platformAliases } from '@/lib/beds24Channels';
import { parseArrivalTime } from '@/lib/bookingComComments';
import { writeAppLog } from '@/lib/server/appLog';
import { getPropertyId } from '@/lib/server/beds24';
import { ensureBeds24BookingColumns } from '@/lib/server/beds24Columns';
import { describeMatch, findExistingGuest } from '@/lib/server/guestMatch';
import { invalidatePublicAvailability } from '@/lib/server/publicAvailability';
import {
  sendCancellationNotification,
  sendNewBookingNotification,
} from '@/lib/server/notifications';

interface Env {
  DB: D1Database;
}

// Beds24 Booking-Webhook: In Beds24 unter Settings → Properties → Access →
// Booking Webhooks die URL aus dem Admin Center (Beds24-Tab) eintragen.
// Beds24 ruft sie bei jeder neuen/geänderten Buchung auf — die Buchung wird
// automatisch in die Gästedatenbank übernommen (mit Dubletten-Schutz über
// die Buchungsnummer und Gast-Abgleich über E-Mail, Telefon und Namen). Die
// Plattform kommt aus dem Beds24-Kanal (Booking.com, Feratel, FeWo-direkt über
// Vrbo …). Auth über den key-Parameter (Zufallswert aus der settings-Tabelle).
//
// WICHTIG: Diese Route liegt bewusst NICHT unter /api/admin — Beds24 hat keine
// Admin-Session (cloudflare-worker.js).
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    if (!env.DB) {
      return NextResponse.json({ error: 'no db' }, { status: 500 });
    }

    const key = new URL(request.url).searchParams.get('key') || '';
    const stored = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'beds24_webhook_key'",
    ).first<{ value: string }>();
    if (!stored?.value || stored.value !== key) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    await ensureBeds24BookingColumns(env.DB);
    // Neue/geänderte Buchung: Kalender der Website sofort aktualisieren
    await invalidatePublicAvailability(env.DB);

    const payload = (await request.json()) as Record<string, unknown>;
    const booking = (
      payload.booking && typeof payload.booking === 'object' ? payload.booking : payload
    ) as Record<string, unknown>;

    const str = (k: string): string => {
      const v = booking[k];
      if (v === null || v === undefined || typeof v === 'object') return '';
      return String(v);
    };

    const beds24Id = str('id');
    const ref = str('apiReference') || beds24Id;
    const arrival = str('arrival');
    const departure = str('departure');
    const name = `${str('firstName')} ${str('lastName')}`.trim() || `Buchung #${beds24Id}`;
    const status = str('status');
    const source = beds24Source(booking);
    // Ohne Kanalangabe wie bisher Booking.com — lange der einzige Kanal
    const platform = source.platform ?? 'Booking.com';

    const log = (message: string, level = 'info') =>
      writeAppLog(
        env.DB,
        level,
        'beds24-webhook',
        status || 'unknown',
        message,
        JSON.stringify({ beds24Id, ref, arrival, departure, platform }),
      );

    // Gemeinsames Beds24-Konto mit der Natberger Hütte: Buchungen anderer
    // Unterkünfte nie übernehmen, falls die URL dort versehentlich eingetragen ist
    const ownPropertyId = await getPropertyId(env.DB);
    const bookingPropertyId = Number(str('propertyId'));
    if (ownPropertyId && bookingPropertyId && bookingPropertyId !== ownPropertyId) {
      await log(
        `Buchung ${ref} gehört zu Unterkunft ${bookingPropertyId}, nicht zur Sechszirbenhütte (${ownPropertyId}) — ignoriert`,
        'warn',
      );
      return NextResponse.json({ success: true, skipped: true });
    }
    if (!ownPropertyId) {
      await log(
        'Beds24-Unterkunft im Admin Center nicht festgelegt — Buchung ungeprüft übernommen',
        'warn',
      );
    }

    if (!ref || !arrival || !departure) {
      await log('Webhook ohne verwertbare Buchungsdaten übersprungen', 'warn');
      return NextResponse.json({ success: true, skipped: true });
    }

    // Kontaktdaten der Buchung: Beds24 führt Festnetz und Handy getrennt, die
    // Gästedatenbank hat nur ein Telefonfeld — die Handynummer hat Vorrang.
    const email = str('email').trim();
    const phone = str('mobile').trim() || str('phone').trim();

    // Booking.com legt die vom Gast angegebene Ankunftszeit als Freitextzeile
    // im Kommentarfeld ab ("Approximate time of arrival: between 16:00 and
    // 17:00"), nicht als Nachricht. Beds24 reicht das Feld unveraendert durch.
    const arrivalHint = parseArrivalTime(str('comments') || str('arrivalTime'));

    // Fehlende Kontaktdaten am Gast nachtragen — nur ergänzen, damit von Hand
    // gepflegte Nummern und private E-Mail-Adressen erhalten bleiben.
    const backfillGuestContact = async (guestId: number) => {
      if (!email && !phone) return;
      const guest = await env.DB.prepare('SELECT email, phone FROM guests WHERE id = ?')
        .bind(guestId)
        .first<{ email: string | null; phone: string | null }>();
      if (!guest) return;
      const addEmail = !guest.email?.trim() && email ? email : null;
      const addPhone = !guest.phone?.trim() && phone ? phone : null;
      if (!addEmail && !addPhone) return;
      await env.DB.prepare(
        `UPDATE guests SET email = COALESCE(?, email), phone = COALESCE(?, phone),
           updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
        .bind(addEmail, addPhone, guestId)
        .run();
    };

    // Bestehende Buchung über die Buchungsnummer finden (Dubletten-Schutz)
    const byNumber = await env.DB.prepare(
      `SELECT id, guest_id FROM bookings
        WHERE booking_number = ? OR booking_number = ? OR beds24_booking_id = ? LIMIT 1`,
    )
      .bind(ref, beds24Id, beds24Id || null)
      .first<{ id: number; guest_id: number }>();

    // Sonst dieselbe Plattform mit genau denselben Daten, die noch keiner
    // Beds24-Buchung zugeordnet ist — z.B. eine FeWo-Buchung, die vor der
    // Vrbo-Anbindung per PDF angelegt wurde und eine andere Nummer trägt.
    // Nicht beim Storno: dort zählt nur die Nummer, sonst träfe es womöglich
    // eine andere Buchung im selben Zeitraum.
    let byDates: { id: number; guest_id: number } | null = null;
    if (!byNumber && status !== 'cancelled' && !source.ical && source.platform) {
      const aliases = platformAliases(source.platform);
      byDates = await env.DB.prepare(
        `SELECT id, guest_id FROM bookings
          WHERE substr(arrival_date, 1, 10) = ? AND substr(departure_date, 1, 10) = ?
            AND COALESCE(status, '') <> 'cancelled'
            AND COALESCE(beds24_booking_id, '') = ''
            AND LOWER(TRIM(COALESCE(platform, ''))) IN (${aliases.map(() => '?').join(', ')})
          LIMIT 1`,
      )
        .bind(arrival, departure, ...aliases)
        .first<{ id: number; guest_id: number }>();
    }
    const existing = byNumber ?? byDates;

    if (status === 'cancelled') {
      if (existing) {
        const before = await env.DB.prepare('SELECT status, platform FROM bookings WHERE id = ?')
          .bind(existing.id)
          .first<{ status: string | null; platform: string | null }>();

        await env.DB.prepare(
          "UPDATE bookings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
          .bind(existing.id)
          .run();
        await log(`Buchung ${ref} (${name}) als storniert markiert`);

        // Postfach der Hütte informieren — aber nur beim ersten Mal, Beds24
        // sendet Webhooks teils mehrfach.
        if (before?.status !== 'cancelled') {
          await sendCancellationNotification(
            {
              guestName: name,
              bookingNumber: ref,
              arrivalDate: arrival,
              departureDate: departure,
              platform: before?.platform || 'Beds24',
              source: 'Beds24',
            },
            env.DB,
          );
        }
      }
      return NextResponse.json({ success: true });
    }

    if (existing) {
      await env.DB.prepare(
        `UPDATE bookings SET arrival_date = ?, departure_date = ?,
           beds24_booking_id = COALESCE(?, beds24_booking_id), updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
        .bind(arrival, departure, beds24Id || null, existing.id)
        .run();
      if (existing.guest_id) {
        await backfillGuestContact(existing.guest_id);
      }
      // Eine von Hand gesetzte Zeit ist verbindlicher als die Schätzung aus
      // der Portalbuchung und wird nicht überschrieben.
      if (arrivalHint) {
        const updated = await env.DB.prepare(
          `UPDATE bookings
              SET expected_checkin_time = ?, late_checkin_requested = ?,
                  checkin_time_source = 'portal', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND COALESCE(checkin_time_source, 'portal') = 'portal'
              AND COALESCE(expected_checkin_time, '') <> ?`,
        )
          .bind(arrivalHint.time, arrivalHint.isLate ? 1 : 0, existing.id, arrivalHint.time)
          .run();
        if (updated.meta?.changes) {
          await log(`Anreisezeit ${arrivalHint.time} für Buchung ${ref} übernommen`);
        }
      }
      await log(
        byNumber
          ? `Buchung ${ref} (${name}) aktualisiert`
          : `Buchung ${ref} (${name}) der vorhandenen ${platform}-Buchung im selben Zeitraum zugeordnet`,
      );
      return NextResponse.json({ success: true, updated: true });
    }

    // Per iCal in Beds24 übernommene Belegungen sind keine Buchungen mit
    // Gastdaten — die echte Buchung kommt auf anderem Weg.
    if (source.ical) {
      await log(`Belegung ${ref} aus einem iCal-Import übersprungen (keine Gastdaten)`);
      return NextResponse.json({ success: true, skipped: true });
    }

    // Bestehenden Gast wiedererkennen (E-Mail, Telefon oder vollständiger
    // Name in beliebiger Reihenfolge), sonst aus den Buchungsdaten anlegen
    let guestId: number | null = null;
    const match = await findExistingGuest(env.DB, {
      name,
      firstName: str('firstName'),
      lastName: str('lastName'),
      email,
      phone,
    });
    if (match) {
      guestId = match.guest.id;
      await backfillGuestContact(guestId);
      await log(
        `Bestehender Gast „${match.guest.guest_name}" erkannt (${describeMatch(match.reasons)})`,
      );
    } else {
      const address = [str('address'), str('postcode'), str('city')].filter(Boolean).join(', ');
      const ins = await env.DB.prepare(
        "INSERT INTO guests (guest_name, email, phone, address, status) VALUES (?, ?, ?, ?, 'active')",
      )
        .bind(name, email || null, phone || null, address || null)
        .run();
      guestId = Number(ins.meta?.last_row_id) || null;
    }
    if (!guestId) {
      await log(`Gast für Buchung ${ref} konnte nicht angelegt werden`, 'error');
      return NextResponse.json({ success: false }, { status: 500 });
    }

    const adults = Number(str('numAdult')) || 2;
    const children = Number(str('numChild')) || 0;

    await env.DB.prepare(
      `INSERT INTO bookings (guest_id, booking_number, platform, arrival_date, departure_date,
        adults, children, rental_price, status, expected_checkin_time,
        late_checkin_requested, checkin_time_source, beds24_booking_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    )
      .bind(
        guestId,
        ref,
        platform,
        arrival,
        departure,
        adults,
        children,
        Number(str('price')) || 0,
        arrivalHint ? arrivalHint.time : null,
        arrivalHint?.isLate ? 1 : 0,
        arrivalHint ? 'portal' : null,
        beds24Id || null,
      )
      .run();
    await log(
      `Neue ${platform}-Buchung ${ref} (${name}, ${arrival} – ${departure}) automatisch angelegt` +
        (arrivalHint ? ` — Anreise ${arrivalHint.time}` : ''),
    );

    // Postfach der Hütte informieren. Die Ankunftszeit steht mit in der Mail,
    // damit eine späte Anreise auffällt, ohne dass jemand die App öffnen muss.
    await sendNewBookingNotification(
      {
        guestName: name,
        bookingNumber: ref,
        arrivalDate: arrival,
        departureDate: departure,
        platform,
        adults,
        children,
        phone: phone || null,
        email: email || null,
        checkinTime: arrivalHint ? arrivalHint.time : null,
        price: Number(str('price')) || null,
      },
      env.DB,
    );

    return NextResponse.json({ success: true, created: true });
  } catch (error) {
    console.error('beds24-webhook error:', error);
    // Auch Fehler protokollieren — sonst bleibt das Log leer und niemand sieht,
    // dass Buchungen ankommen, aber nicht übernommen werden.
    try {
      const ctx = await getCloudflareContext();
      await writeAppLog(
        (ctx as { env: Env }).env.DB ?? null,
        'error',
        'beds24-webhook',
        'error',
        'Webhook konnte die Buchung nicht verarbeiten',
        error instanceof Error ? error.message : String(error),
      );
    } catch {
      /* Logging optional */
    }
    return NextResponse.json({ error: 'webhook failed' }, { status: 500 });
  }
}
