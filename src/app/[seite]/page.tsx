import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentPageView } from '@/components/content/ContentPageView';
import { PAGES, getPage } from '@/content/seiten';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import { breadcrumbJsonLd, faqJsonLd, jsonLdString } from '@/lib/structuredData';

// Unterseiten aus src/content/seiten.ts (Sauna, Hund, Winter, Sommer,
// Workation, Preise, Anreise, FAQ, Abgrenzung, Ratgeber). Beim Build fertig
// erzeugt; andere Adressen auf dieser Ebene ergeben 404. Feste Ordner
// (/blog, /impressum …) haben Vorrang vor diesem Platzhalter.
export const dynamicParams = false;

export function generateStaticParams() {
  return PAGES.map((page) => ({ seite: page.slug }));
}

interface PageProps {
  params: Promise<{ seite: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { seite } = await params;
  const page = getPage(seite);
  if (!page) return {};
  const url = absoluteUrl(`/${page.slug}`);
  const image = absoluteUrl(page.image.src);
  return {
    // Titel steht vollständig in der Inhaltsdatei (ohne „| Sechszirbenhütte“)
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: page.title,
      description: page.description,
      siteName: SITE_NAME,
      locale: 'de_DE',
      images: [
        { url: image, width: page.image.width, height: page.image.height, alt: page.image.alt },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: [image],
    },
  };
}

export default async function ContentRoute({ params }: PageProps) {
  const { seite } = await params;
  const page = getPage(seite);
  if (!page) notFound();

  const url = absoluteUrl(`/${page.slug}`);
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${url}#seite`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: 'de-DE',
      dateModified: page.updated,
      isPartOf: { '@id': `${absoluteUrl('/')}#website` },
      about: { '@id': `${absoluteUrl('/')}#huette` },
      primaryImageOfPage: absoluteUrl(page.image.src),
    },
    breadcrumbJsonLd([
      { name: 'Startseite', path: '/' },
      { name: page.name, path: `/${page.slug}` },
    ]),
  ];
  if (page.faq && page.faq.length > 0) jsonLd.push(faqJsonLd(page.faq));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }}
      />
      <ContentPageView page={page} />
    </>
  );
}
