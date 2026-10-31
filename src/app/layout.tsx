import type { Metadata } from 'next';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SiteSettingsProvider } from '@/contexts/SiteSettingsContext';
import { STREAM_ORIGIN } from '@/lib/constants';
import { SITE_URL } from '@/lib/site';
import { ContentTextsProvider } from '@/contexts/ContentTextsContext';
import { Header, MobileBookingButton } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileScrollProgress } from '@/components/ui/MobileScrollProgress';
import { MotionProvider } from '@/contexts/MotionContext';
import '@/styles/globals.css';
import '@/styles/brand.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sechszirbenhütte am Falkert | Premium-Hüttenurlaub in den Nockbergen',
    template: '%s | Sechszirbenhütte',
  },
  description:
    'Historische Berghütte mit Sauna in Alleinlage auf 1.700m. Wandern, Skifahren & Erholung in Kärnten. Familien & Hunde willkommen.',
  keywords: [
    'Ferienhütte Kärnten',
    'Berghütte Nockberge',
    'Hüttenurlaub Österreich',
    'Skiurlaub Falkert',
    'Wandern Alpen',
    'Sauna Berghütte',
    'Sechszirbenhütte',
    'Falkertsee',
    'Heidi Alm',
    'Ferienhaus Kärnten',
    'Familienurlaub Berge',
  ],
  authors: [{ name: 'Sechszirbenhütte' }],
  creator: 'Sechszirbenhütte',
  publisher: 'Sechszirbenhütte',
  openGraph: {
    title: 'Sechszirbenhütte – Ihr Traumurlaub am Falkert',
    description:
      'Über 250 Jahre alte Berghütte mit modernem Komfort und Sauna. Direkt am Nationalpark Nockberge.',
    images: ['/images/fallback/og-image.jpg'],
    locale: 'de_DE',
    type: 'website',
    siteName: 'Sechszirbenhütte',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sechszirbenhütte – Ihr Traumurlaub am Falkert',
    description: 'Über 250 Jahre alte Berghütte mit modernem Komfort und Sauna.',
    images: ['/images/fallback/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Früh verbinden: Hüttenfilm und Standbild (Cloudflare Stream), Bilder
            (Cloudflare Images), Buchungskalender (Beds24) */}
        <link rel="preconnect" href={STREAM_ORIGIN} crossOrigin="anonymous" />
        <link rel="preconnect" href="https://imagedelivery.net" />
        <link rel="dns-prefetch" href="https://beds24.com" />
        {/* Bewegungswahl vor dem ersten Zeichnen setzen (Schalter „Bewegung reduzieren“) */}
        <script
          dangerouslySetInnerHTML={{
            // Schlüssel wie MOTION_STORAGE_KEY in contexts/MotionContext.tsx
            __html: `try{if(localStorage.getItem('szh-motion')==='reduce')document.documentElement.dataset.motion='reduce'}catch(e){}`,
          }}
        />
      </head>
      <body className="font-sans antialiased overflow-x-clip" suppressHydrationWarning>
        <SiteSettingsProvider>
          <LanguageProvider>
            <ContentTextsProvider>
              <MotionProvider>
                <MobileScrollProgress />
                <Header />
                <MobileBookingButton />
                <main className="relative z-10">{children}</main>
                <Footer />
              </MotionProvider>
            </ContentTextsProvider>
          </LanguageProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
