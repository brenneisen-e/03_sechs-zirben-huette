import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_URL } from '@/lib/site';
import {
  jsonLdString,
  lodgingJsonLd,
  organisationJsonLd,
  websiteJsonLd,
} from '@/lib/structuredData';
import { Hero } from '@/components/sections/Hero';
import { Bewertungen } from '@/components/sections/Bewertungen';
import { IntroText } from '@/components/sections/IntroText';
import { Ferienhaus } from '@/components/sections/Ferienhaus';
import { Location } from '@/components/sections/Location';
import { Umgebung } from '@/components/sections/Umgebung';
import { Galerie } from '@/components/sections/Galerie';
import { Instagram } from '@/components/sections/Instagram';
import { BlogTeaser } from '@/components/sections/BlogTeaser';
import { Buchung } from '@/components/sections/Buchung';
import { AdminPreviewListener } from '@/components/ui/AdminPreviewListener';
import { Orientation } from '@/components/brand/Orientation';
import { HutChapters } from '@/components/brand/HutChapters';
import { HostGreeting } from '@/components/brand/HostGreeting';

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/` },
};

export default function HomePage() {
  return (
    <div className="brand-page">
      {/* Hütte als Ferienunterkunft, Website und Betreiber — maschinenlesbar im HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString([lodgingJsonLd(), websiteJsonLd(), organisationJsonLd()]),
        }}
      />
      <Hero />
      <Orientation />
      <HutChapters />
      <IntroText />
      <Ferienhaus />
      <Galerie />
      <Bewertungen />
      <Instagram />
      <Location />
      <Umgebung />
      <BlogTeaser />
      <HostGreeting />
      <Buchung />
      <Suspense fallback={null}>
        <AdminPreviewListener />
      </Suspense>
    </div>
  );
}
