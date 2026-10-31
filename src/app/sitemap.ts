import type { MetadataRoute } from 'next';
import { listPublishedPosts } from '@/lib/server/blog';
import { SITE_URL, parseDbDate } from '@/lib/site';

// Bei jedem Abruf aus D1, damit neue Beiträge sofort drinstehen. Ausgeliefert
// unter https://www.sechszirbenhuette.com/sitemap.xml (über den Worker, siehe
// public/_routes.json). In Google Search Console und Bing Webmaster Tools
// eingereicht.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublishedPosts();
  const newestPost = posts
    .map((post) => parseDbDate(post.updated_at || post.published_at || post.created_at))
    .filter((date): date is Date => !!date)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE_URL}/blog`,
      ...(newestPost ? { lastModified: newestPost } : {}),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    { url: `${SITE_URL}/impressum`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/datenschutz`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/agb`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => {
    const modified = parseDbDate(post.updated_at || post.published_at || post.created_at);
    return {
      url: `${SITE_URL}/blog/${post.slug}`,
      ...(modified ? { lastModified: modified } : {}),
      changeFrequency: 'monthly',
      priority: 0.7,
      ...(post.cover_image_url ? { images: [post.cover_image_url] } : {}),
    };
  });

  return [...staticPages, ...blogPages];
}
