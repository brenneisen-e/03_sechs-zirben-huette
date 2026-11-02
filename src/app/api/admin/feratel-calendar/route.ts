import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { type BookedPeriod, fetchAllIcalPeriods } from '@/lib/server/icalSources';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

interface CalendarResponse {
  success: boolean;
  sources?: string[];
  bookedPeriods: BookedPeriod[];
  errors?: string[];
  rawData?: string;
}

// GET - Fetch all calendar data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true';

  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
    const {
      periods: allPeriods,
      sources: successfulSources,
      errors,
    } = await fetchAllIcalPeriods(env.DB);

    const response: CalendarResponse = {
      success: allPeriods.length > 0 || successfulSources.length > 0,
      sources: successfulSources,
      bookedPeriods: allPeriods,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    if (debug) {
      console.log('Calendar API response:', {
        success: response.success,
        sources: response.sources,
        periodCount: allPeriods.length,
        errors: response.errors,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/admin/feratel-calendar error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        bookedPeriods: [],
        error: message,
      },
      { status: 500 },
    );
  }
}
