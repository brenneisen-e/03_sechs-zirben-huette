import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getPostImages, getPublishedPost, type BlogPostRecord } from '@/lib/server/blog';
import { absoluteUrl, plainTitle, toIsoDate } from '@/lib/site';
import {
  DEFAULT_OG_IMAGE,
  articleJsonLd,
  breadcrumbJsonLd,
  descriptionFromContent,
  extractFaq,
  faqJsonLd,
  jsonLdString,
} from '@/lib/structuredData';
import { BlogPostView } from './BlogPostView';

// Beitrag bei jedem Aufruf aus D1 (Änderungen im Admin Center sofort sichtbar).
// Der Text steht damit fertig im HTML — Crawler ohne JavaScript (ChatGPT,
// Perplexity, Claude) sehen ihn vollständig.
export const dynamic = 'force-dynamic';

const loadPost = cache((slug: string) => getPublishedPost(slug));

interface PageProps {
  params: Promise<{ slug: string }>;
}

function tabsIntro(content: string): string {
  try {
    const parsed = JSON.parse(content) as { intro?: string };
    return parsed.intro ?? '';
  } catch {
    return '';
  }
}

function describe(post: BlogPostRecord): string {
  const own = post.meta_description || post.excerpt;
  if (own) return own.trim();
  const source = post.layout === 'tabs' ? tabsIntro(post.content) : post.content;
  return descriptionFromContent(source || post.subtitle || post.title);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) {
    return { title: 'Beitrag nicht gefunden', robots: { index: false, follow: true } };
  }

  const title = plainTitle(post.meta_title || post.title);
  const description = describe(post);
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = absoluteUrl(post.cover_image_url || DEFAULT_OG_IMAGE);
  const keywords = post.meta_keywords
    ?.split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'Sechszirbenhütte',
      locale: 'de_DE',
      images: [{ url: image, alt: post.cover_image_alt || title }],
      publishedTime: toIsoDate(post.published_at || post.created_at),
      modifiedTime: toIsoDate(post.updated_at),
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  const images = await getPostImages(post.id);
  const faq = post.layout === 'standard' ? extractFaq(post.content) : [];

  const jsonLd = [
    articleJsonLd({
      slug: post.slug,
      title: post.meta_title || post.title,
      description: describe(post),
      image: post.cover_image_url,
      author: post.author,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
    }),
    breadcrumbJsonLd([
      { name: 'Startseite', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: plainTitle(post.title), path: `/blog/${post.slug}` },
    ]),
    ...(faq.length > 0 ? [faqJsonLd(faq)] : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <BlogPostView post={post} images={images} />
    </>
  );
}
