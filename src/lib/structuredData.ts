// Strukturierte Daten (schema.org, JSON-LD) für Google und KI-Suchdienste.
// Werden serverseitig ins HTML geschrieben, nicht erst im Browser.

import { SITE_CONFIG } from '@/lib/constants';
import { SITE_NAME, SITE_URL, absoluteUrl, plainTitle, toIsoDate } from '@/lib/site';

type JsonLd = Record<string, unknown>;

export const DEFAULT_OG_IMAGE = '/images/fallback/og-image.jpg';

/** JSON-LD sicher in ein <script> einbetten (kein „</script>“ im Text) */
export function jsonLdString(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

const publisher: JsonLd = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organisation`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: absoluteUrl('/images/logo.svg') },
};

/** Die Hütte als Ferienunterkunft (Startseite) */
export function lodgingJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': ['LodgingBusiness', 'VacationRental'],
    '@id': `${SITE_URL}/#huette`,
    name: 'Sechszirbenhütte am Falkert',
    description:
      'Historische Berghütte in Alleinlage auf 1.700 m am Falkert in den Kärntner Nockbergen: 85 m² Wohnfläche, zwei Schlafzimmer für bis zu 5 Personen, zwei Bäder und separates WC, eigene Sauna mit Ruheraum, großer umlaufender Balkon. Hunde willkommen.',
    url: SITE_URL,
    image: [absoluteUrl(DEFAULT_OG_IMAGE)],
    email: SITE_CONFIG.email,
    telephone: SITE_CONFIG.phone.replace(/[()\s]/g, '').replace('+490', '+49'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.address.street,
      postalCode: SITE_CONFIG.address.zip,
      addressLocality: SITE_CONFIG.address.city,
      addressRegion: 'Kärnten',
      addressCountry: 'AT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE_CONFIG.coordinates.lat,
      longitude: SITE_CONFIG.coordinates.lng,
    },
    containsPlace: {
      '@type': 'Accommodation',
      additionalType: 'https://schema.org/House',
      name: 'Sechszirbenhütte',
      floorSize: { '@type': 'QuantitativeValue', value: 85, unitCode: 'MTK' },
      numberOfBedrooms: 2,
      numberOfBathroomsTotal: 2,
      occupancy: { '@type': 'QuantitativeValue', maxValue: 5 },
      petsAllowed: true,
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Sauna', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Ruheraum', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Balkon', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'WLAN', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Pelletofen', value: true },
      ],
    },
    petsAllowed: true,
    publicAccess: false,
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'de-DE',
    publisher: { '@id': `${SITE_URL}/#organisation` },
  };
}

export function organisationJsonLd(): JsonLd {
  return { '@context': 'https://schema.org', ...publisher };
}

export interface ArticleInput {
  slug: string;
  title: string;
  description: string;
  image: string | null;
  author: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export function articleJsonLd(post: ArticleInput): JsonLd {
  const url = absoluteUrl(`/blog/${post.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#artikel`,
    headline: plainTitle(post.title),
    description: post.description,
    image: [absoluteUrl(post.image || DEFAULT_OG_IMAGE)],
    inLanguage: 'de-DE',
    datePublished: toIsoDate(post.publishedAt || post.createdAt),
    dateModified: toIsoDate(post.updatedAt || post.publishedAt || post.createdAt),
    author: { '@type': 'Organization', name: post.author || SITE_NAME, url: SITE_URL },
    publisher,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    about: { '@id': `${SITE_URL}/#huette` },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FaqItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

// --- Fragen und Antworten aus dem Beitragstext lesen ---------------------

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  euro: '€',
  ndash: '–',
  mdash: '—',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
};

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sucht im HTML eines Beitrags einen Abschnitt „Häufige Fragen“ (Überschrift
 * mit „Fragen“ oder „FAQ“) und liest daraus die Frage-Antwort-Paare im Format
 * des Blog-Editors: <p><b>Frage?</b><br>Antwort</p>. Der Abschnitt endet an
 * der nächsten Überschrift gleicher oder höherer Ebene.
 */
export function extractFaq(html: string): FaqItem[] {
  if (!html || !html.includes('<')) return [];
  const heading = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = heading.exec(html))) {
    const level = Number(match[1]);
    if (!/fragen|faq/i.test(htmlToText(match[2] ?? ''))) continue;

    const rest = html.slice(match.index + match[0].length);
    const end = rest.search(new RegExp(`<h[1-${level}][\\s>]`, 'i'));
    const section = end === -1 ? rest : rest.slice(0, end);

    const items: FaqItem[] = [];
    const pair = /<p[^>]*>\s*<(b|strong)[^>]*>([\s\S]*?)<\/\1>\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>/gi;
    let p: RegExpExecArray | null;
    while ((p = pair.exec(section))) {
      const question = htmlToText(p[2] ?? '');
      const answer = htmlToText(p[3] ?? '');
      if (question && answer) items.push({ question, answer });
    }
    // Gleiches Muster auch als <h3>Frage</h3><p>Antwort</p>
    if (items.length === 0) {
      const h3 = /<h([3-6])[^>]*>([\s\S]*?)<\/h\1>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
      while ((p = h3.exec(section))) {
        const question = htmlToText(p[2] ?? '');
        const answer = htmlToText(p[3] ?? '');
        if (question && answer) items.push({ question, answer });
      }
    }
    if (items.length > 0) return items;
  }
  return [];
}

/** Kurze Beschreibung aus dem Text, falls keine Meta-Beschreibung gepflegt ist */
export function descriptionFromContent(content: string, max = 160): string {
  const text = htmlToText(content);
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 80))}…`;
}
