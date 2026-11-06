import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
}

// Standbild des Hüttenfilms im Aufmacher, direkt aus dem HTML ladbar (Bild mit
// srcset in Hero.tsx) — ohne auf JavaScript und /api/media zu warten; das ist
// das größte sichtbare Element (LCP). Liefert das Stream-Standbild in der
// gewünschten Breite selbst aus (ohne Film das hinterlegte Vorschaubild) und
// legt es 10 Minuten in den Cloudflare-Cache — so braucht der Browser nur
// eine Anfrage statt Weiterleitung plus Bild.

const WIDTHS = [640, 960, 1280, 1920];
const MAX_AGE = 600;

type EdgeCache = {
  match(key: Request): Promise<Response | undefined>;
  put(key: Request, res: Response): Promise<void>;
};

function edgeCache(): EdgeCache | null {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default ?? null;
}

async function findSource(db: D1Database, width: number, base: string): Promise<string | null> {
  const height = Math.round((width * 9) / 16);
  const video = await db
    .prepare(
      `SELECT url FROM media WHERE category = 'hero' AND media_type = 'video'
       ORDER BY display_order ASC, created_at DESC LIMIT 1`,
    )
    .first<{ url: string }>();
  const match = video?.url.match(/^https:\/\/([^/]+\.cloudflarestream\.com)\/([a-f0-9]+)\//);
  if (match) {
    return `https://${match[1]}/${match[2]}/thumbnails/thumbnail.jpg?time=2s&width=${width}&height=${height}`;
  }
  const image = await db
    .prepare(
      `SELECT url FROM media WHERE category = 'hero-thumbnail' AND media_type = 'image'
       ORDER BY display_order ASC, created_at DESC LIMIT 1`,
    )
    .first<{ url: string }>();
  return image?.url ? new URL(image.url, base).toString() : null;
}

export async function GET(request: NextRequest) {
  const asked = Number(request.nextUrl.searchParams.get('w')) || 1920;
  const width = WIDTHS.find((w) => w >= asked) ?? 1920;
  const cache = edgeCache();
  const key = new Request(new URL(`/api/hero-poster?w=${width}`, request.url).toString());
  try {
    const hit = await cache?.match(key);
    if (hit) return hit;

    const ctx = await getCloudflareContext();
    const db = (ctx as { env: Env }).env?.DB;
    const source = db ? await findSource(db, width, request.url) : null;
    if (!source) return new NextResponse(null, { status: 404 });

    const upstream = await fetch(source);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.redirect(source, 302);
    }
    const response = new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': `public, max-age=${MAX_AGE}`,
      },
    });
    if (cache) ctx.ctx.waitUntil(cache.put(key, response.clone()));
    return response;
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
