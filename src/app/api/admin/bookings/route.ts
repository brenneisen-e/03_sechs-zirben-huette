import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { invalidatePublicAvailability } from '@/lib/server/publicAvailability';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

interface Booking {
  id: number;
  guest_id: number;
  booking_number: string | null;
  platform: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  children_ages: string | null;
  pets: string | null;
  rental_price: number;
  deposit_amount: number;
  deposit_paid: number;
  final_payment: number;
  final_payment_paid: number;
  electricity_flat: number;
  additional_payment: number;
  security_deposit: number;
  additional_costs: string | null;
  final_cleaning: string | null;
  first_contact_date: string | null;
  offer_sent: number;
  contract_sent: number;
  welcome_guide_sent: number;
  admin_briefed: number;
  status: string;
  notes: string | null;
  cleaning_cash: number;
  utilities_cash: number;
  kurtaxe_cash: number;
  is_private: number;
  private_config: string | null;
  briefing_notes: string | null;
  preferred_language: string | null;
  early_checkin: string | null;
  late_checkout: string | null;
  beds24_booking_id: string | null;
  expected_checkin_time: string | null;
  late_checkin_requested: number;
  checkin_time_source: string | null;
  created_at: string;
  updated_at: string;
}

// GET - List bookings for a guest
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guest_id');
    const bookingId = searchParams.get('id');

    if (bookingId) {
      // Get single booking
      const booking = await db
        .prepare('SELECT * FROM bookings WHERE id = ?')
        .bind(bookingId)
        .first<Booking>();

      if (!booking) {
        return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 });
      }

      return NextResponse.json({ booking });
    }

    if (guestId) {
      // Get bookings for a specific guest
      const result = await db
        .prepare('SELECT * FROM bookings WHERE guest_id = ? ORDER BY arrival_date DESC')
        .bind(guestId)
        .all<Booking>();

      return NextResponse.json({ bookings: result.results || [] });
    }

    // Get all bookings with guest_name via JOIN
    const result = await db
      .prepare(
        `
      SELECT b.*, g.guest_name
      FROM bookings b
      LEFT JOIN guests g ON b.guest_id = g.id
      ORDER BY b.arrival_date DESC
    `,
      )
      .all<Booking & { guest_name?: string }>();

    return NextResponse.json({ bookings: result.results || [] });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    const message = error instanceof Error ? error.message : 'Fehler beim Laden der Buchungen';
    // If table doesn't exist or columns are missing, return empty array instead of error
    if (message.includes('no such table') || message.includes('no such column')) {
      return NextResponse.json({ bookings: [], tableNotFound: true });
    }
    // Return empty bookings on any DB error to prevent UI breakage
    return NextResponse.json({ bookings: [], error: message }, { status: 200 });
  }
}

// POST - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    const data = (await request.json()) as Partial<Booking>;

    if (!data.guest_id) {
      return NextResponse.json({ error: 'guest_id ist erforderlich' }, { status: 400 });
    }

    // Define all possible columns with their defaults
    const columnDefs: Array<{ name: string; value: string | number | null }> = [
      { name: 'guest_id', value: data.guest_id! },
      { name: 'booking_number', value: data.booking_number || null },
      { name: 'platform', value: data.platform || null },
      { name: 'arrival_date', value: data.arrival_date || null },
      { name: 'departure_date', value: data.departure_date || null },
      { name: 'adults', value: data.adults || 2 },
      { name: 'children', value: data.children || 0 },
      { name: 'children_ages', value: data.children_ages || null },
      { name: 'pets', value: data.pets || null },
      { name: 'rental_price', value: data.rental_price || 0 },
      { name: 'deposit_amount', value: data.deposit_amount || 0 },
      { name: 'deposit_paid', value: data.deposit_paid || 0 },
      { name: 'final_payment', value: data.final_payment || 0 },
      { name: 'final_payment_paid', value: data.final_payment_paid || 0 },
      { name: 'electricity_flat', value: data.electricity_flat || 0 },
      { name: 'additional_payment', value: data.additional_payment || 0 },
      { name: 'security_deposit', value: data.security_deposit || 0 },
      { name: 'additional_costs', value: data.additional_costs || null },
      { name: 'final_cleaning', value: data.final_cleaning || null },
      { name: 'first_contact_date', value: data.first_contact_date || null },
      { name: 'offer_sent', value: data.offer_sent || 0 },
      { name: 'contract_sent', value: data.contract_sent || 0 },
      { name: 'welcome_guide_sent', value: data.welcome_guide_sent || 0 },
      { name: 'admin_briefed', value: data.admin_briefed || 0 },
      { name: 'status', value: data.status || 'active' },
      { name: 'notes', value: data.notes || null },
      { name: 'cleaning_cash', value: data.cleaning_cash || 0 },
      { name: 'utilities_cash', value: data.utilities_cash || 0 },
      { name: 'kurtaxe_cash', value: data.kurtaxe_cash || 0 },
      { name: 'is_private', value: data.is_private || 0 },
      { name: 'private_config', value: data.private_config || null },
      // Beds24-Übernahme (Cockpit)
      { name: 'beds24_booking_id', value: data.beds24_booking_id || null },
      { name: 'expected_checkin_time', value: data.expected_checkin_time || null },
      { name: 'late_checkin_requested', value: data.late_checkin_requested || 0 },
      { name: 'checkin_time_source', value: data.checkin_time_source || null },
    ];

    // Check which columns exist in the table (handles pending migrations)
    let filteredColumns = columnDefs;
    try {
      const tableInfo = await db.prepare('PRAGMA table_info(bookings)').all<{ name: string }>();
      const existingColumns = new Set((tableInfo.results || []).map((col) => col.name));
      filteredColumns = columnDefs.filter((c) => existingColumns.has(c.name));
    } catch {
      // If PRAGMA fails, try all columns
    }

    const colNames = filteredColumns.map((c) => c.name).join(', ');
    const placeholders = filteredColumns.map(() => '?').join(', ');
    const colValues = filteredColumns.map((c) => c.value);

    const result = await db
      .prepare(`INSERT INTO bookings (${colNames}) VALUES (${placeholders})`)
      .bind(...colValues)
      .run();

    // Fetch the created booking
    const booking = await db
      .prepare('SELECT * FROM bookings WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<Booking>();

    // Belegungskalender der Website neu berechnen lassen
    await invalidatePublicAvailability(db);
    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der Buchung' }, { status: 500 });
  }
}

// PUT - Update a booking
export async function PUT(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    const data = (await request.json()) as Partial<Booking> & { id: number };

    if (!data.id) {
      return NextResponse.json({ error: 'Buchungs-ID ist erforderlich' }, { status: 400 });
    }

    // Build dynamic update query
    const allFields = [
      'booking_number',
      'platform',
      'arrival_date',
      'departure_date',
      'adults',
      'children',
      'children_ages',
      'pets',
      'rental_price',
      'deposit_amount',
      'deposit_paid',
      'final_payment',
      'final_payment_paid',
      'electricity_flat',
      'additional_payment',
      'security_deposit',
      'additional_costs',
      'final_cleaning',
      'first_contact_date',
      'offer_sent',
      'contract_sent',
      'welcome_guide_sent',
      'admin_briefed',
      'status',
      'notes',
      'cleaning_cash',
      'utilities_cash',
      'kurtaxe_cash',
      'is_private',
      'private_config',
      'beds24_booking_id',
      'expected_checkin_time',
      'late_checkin_requested',
      'checkin_time_source',
    ];

    // Check which columns actually exist in the table (handles pending migrations)
    let availableFields = allFields;
    try {
      const tableInfo = await db.prepare('PRAGMA table_info(bookings)').all<{ name: string }>();
      const existingColumns = new Set((tableInfo.results || []).map((col) => col.name));
      availableFields = allFields.filter((f) => existingColumns.has(f));
    } catch {
      // If PRAGMA fails, try all fields
    }

    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    for (const field of availableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);
        values.push((data as Record<string, string | number | null>)[field] ?? null);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(data.id);

    await db
      .prepare(
        `
      UPDATE bookings SET ${updates.join(', ')} WHERE id = ?
    `,
      )
      .bind(...values)
      .run();

    // Fetch updated booking
    const booking = await db
      .prepare('SELECT * FROM bookings WHERE id = ?')
      .bind(data.id)
      .first<Booking>();

    // Belegungskalender der Website neu berechnen lassen
    await invalidatePublicAvailability(db);
    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren der Buchung' }, { status: 500 });
  }
}

// DELETE - Delete a booking
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const db = env.DB;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Buchungs-ID ist erforderlich' }, { status: 400 });
    }

    await db.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();

    // Belegungskalender der Website neu berechnen lassen
    await invalidatePublicAvailability(db);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen der Buchung' }, { status: 500 });
  }
}
