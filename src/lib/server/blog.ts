import { getCloudflareContext } from '@opennextjs/cloudflare';

// Blogbeiträge direkt aus D1 für die serverseitig erzeugten Seiten
// (/blog, /blog/[slug], sitemap.xml). Nur veröffentlichte Beiträge —
// Entwürfe sieht man weiter nur im Admin Center.

export interface BlogPostRecord {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  layout: 'standard' | 'carousel' | 'tabs';
  status: 'draft' | 'published';
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostImageRecord {
  id: string;
  image_url: string;
  image_alt: string | null;
  caption: string | null;
  display_order: number;
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<{ results?: T[] }>;
  first<T>(): Promise<T | null>;
}

interface D1Like {
  prepare(query: string): D1Statement;
}

async function getDb(): Promise<D1Like | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return ((env as { DB?: D1Like }).DB ?? null) as D1Like | null;
  } catch {
    return null;
  }
}

export async function getPublishedPost(slug: string): Promise<BlogPostRecord | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    return await db
      .prepare("SELECT * FROM blog_posts WHERE slug = ? AND status = 'published' LIMIT 1")
      .bind(slug)
      .first<BlogPostRecord>();
  } catch {
    return null;
  }
}

export async function getPostImages(postId: string): Promise<BlogPostImageRecord[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db
      .prepare(
        'SELECT id, image_url, image_alt, caption, display_order FROM blog_post_images WHERE post_id = ? ORDER BY display_order ASC',
      )
      .bind(postId)
      .all<BlogPostImageRecord>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

export async function listPublishedPosts(): Promise<BlogPostRecord[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const result = await db
      .prepare(
        "SELECT * FROM blog_posts WHERE status = 'published' ORDER BY COALESCE(published_at, created_at) DESC",
      )
      .all<BlogPostRecord>();
    return result.results ?? [];
  } catch {
    return [];
  }
}
