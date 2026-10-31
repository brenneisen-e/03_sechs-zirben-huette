import type { Metadata } from 'next';
import { listPublishedPosts } from '@/lib/server/blog';
import { absoluteUrl, plainTitle } from '@/lib/site';
import { breadcrumbJsonLd, jsonLdString } from '@/lib/structuredData';
import { BlogIndexView } from './BlogIndexView';

// Liste bei jedem Aufruf aus D1 — fertig im HTML, damit Crawler alle
// Beiträge über Links finden.
export const dynamic = 'force-dynamic';

const title = 'Blog: Tipps für Ihren Urlaub am Falkert';
const description =
  'Wanderungen, Restaurants, Ausflüge mit Kindern und Hund, Kärnten Card und Off-Season: Tipps aus erster Hand rund um die Sechszirbenhütte am Falkert in den Nockbergen.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl('/blog') },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/blog'),
    title,
    description,
    siteName: 'Sechszirbenhütte',
    locale: 'de_DE',
  },
};

export default async function BlogPage() {
  const posts = await listPublishedPosts();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': `${absoluteUrl('/blog')}#blog`,
      url: absoluteUrl('/blog'),
      name: 'Blog der Sechszirbenhütte',
      description,
      inLanguage: 'de-DE',
      blogPost: posts.map((post) => ({
        '@type': 'BlogPosting',
        headline: plainTitle(post.title),
        url: absoluteUrl(`/blog/${post.slug}`),
      })),
    },
    breadcrumbJsonLd([
      { name: 'Startseite', path: '/' },
      { name: 'Blog', path: '/blog' },
    ]),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <BlogIndexView
        posts={posts.map((post) => ({
          id: post.id,
          slug: post.slug,
          title: post.title,
          subtitle: post.subtitle,
          excerpt: post.excerpt,
          cover_image_url: post.cover_image_url,
          cover_image_alt: post.cover_image_alt,
          layout: post.layout,
          status: post.status,
          author: post.author,
          published_at: post.published_at,
          created_at: post.created_at,
        }))}
      />
    </>
  );
}
