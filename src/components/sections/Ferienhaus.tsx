'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Bath,
  Bed,
  Flame,
  type LucideIcon,
  MapPin,
  Maximize2,
  Sofa,
  TreePine,
  UtensilsCrossed,
  Wifi,
  X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { useImageVariants } from '@/contexts/SiteSettingsContext';
import { responsiveSource } from '@/lib/imageVariants';

// Ausstattung als kompaktes Fakten-Raster.
// Handy: Wischreihe mit Bildkarten. Tablet: zwei Spalten mit Bild links.
// Desktop (12 Spalten): links Kopf und Grundriss (haftend), rechts die Karten.
// Bilder je Karte stammen aus dem Admin Center (/api/amenity-images), Titel und
// Punkte aus den Sprachdateien (`amenities`). Ein Klick führt zur passenden
// Kategorie der Galerie.

interface AmenityCard {
  key: string;
  icon: LucideIcon;
  galleryCategory: string | null;
}

const amenityCards: AmenityCard[] = [
  { key: 'living', icon: Sofa, galleryCategory: 'wohnen' },
  { key: 'kitchen', icon: UtensilsCrossed, galleryCategory: 'kueche' },
  { key: 'rooms', icon: Bed, galleryCategory: 'schlafen' },
  { key: 'sauna', icon: Flame, galleryCategory: 'bad' },
  { key: 'bathroom', icon: Bath, galleryCategory: 'bad' },
  { key: 'outdoor', icon: TreePine, galleryCategory: 'aussen' },
  { key: 'equipment', icon: Wifi, galleryCategory: null },
  { key: 'location', icon: MapPin, galleryCategory: 'umgebung' },
];

interface AmenityText {
  title: string;
  items: string[];
  hint?: string;
}

interface CardImage {
  url: string;
  title?: string;
  alt_text?: string;
}

// Detailkategorien auf die Filter der Galerie abbilden
const categoryToFilter: Record<string, string> = {
  wohnen: 'innen',
  schlafen: 'innen',
  kueche: 'innen',
  bad: 'innen',
  aussen: 'aussen',
  umgebung: 'aussen',
};

function scrollToGalleryCategory(category: string) {
  const galerie = document.querySelector('#galerie');
  if (!galerie) return;
  galerie.scrollIntoView({ behavior: 'smooth' });
  const filterCategory = categoryToFilter[category] || category;
  setTimeout(() => {
    document
      .querySelector<HTMLButtonElement>(`#galerie button[data-category="${filterCategory}"]`)
      ?.click();
    if (category !== filterCategory) {
      setTimeout(() => {
        document
          .querySelector<HTMLButtonElement>(`#galerie button[data-subcategory="${category}"]`)
          ?.click();
      }, 300);
    }
  }, 500);
}

export function Ferienhaus() {
  const { t } = useLanguage();
  const { getText } = useContentTexts();
  const variants = useImageVariants();
  const [cardImages, setCardImages] = useState<Record<string, CardImage>>({});
  const [showFloorPlan, setShowFloorPlan] = useState(false);

  useEffect(() => {
    fetch('/api/amenity-images')
      .then((res) => res.json() as Promise<{ byCard?: Record<string, CardImage> }>)
      .then((data) => {
        if (data.byCard) setCardImages(data.byCard);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showFloorPlan) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFloorPlan(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [showFloorPlan]);

  const amenityText = (key: string): AmenityText | undefined =>
    (t.amenities as Record<string, AmenityText>)[key];

  const floorPlan = (
    <div className="rounded-[4px] border border-zirbe/15 bg-white p-4">
      <button
        type="button"
        onClick={() => setShowFloorPlan(true)}
        className="relative block w-full overflow-hidden rounded-[4px] bg-white"
        aria-label={t.ui.floorPlan}
      >
        <Image
          src="/images/grundriss.jpg"
          alt={`${t.ui.floorPlan} – Sechszirbenhütte`}
          width={1024}
          height={550}
          sizes="(min-width: 1024px) 32vw, (min-width: 768px) 36rem, 92vw"
          className="h-auto w-full"
        />
        <span className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-[4px] bg-zirbe text-leinen">
          <Maximize2 size={18} aria-hidden />
        </span>
      </button>
      <p className="mt-3 text-[1.0625rem] text-zirbe">{t.ui.floorPlan}</p>
      <p className="mt-1 text-[0.9375rem] text-rinde">{t.ui.floorPlanDesc}</p>
    </div>
  );

  const card = (c: AmenityCard, layout: 'stacked' | 'side') => {
    const Icon = c.icon;
    const text = amenityText(c.key);
    const title = text?.title ?? c.key;
    const image = cardImages[c.key];
    const inner = (
      <>
        <span
          className={`relative block shrink-0 overflow-hidden bg-zirbe/10 ${
            layout === 'stacked' ? 'aspect-[3/2] w-full' : 'w-[38%] self-stretch'
          }`}
        >
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudflare-Varianten per srcset
            <img
              {...responsiveSource(image.url, variants, 'medium', 'thumb')}
              sizes={layout === 'stacked' ? '80vw' : '(min-width: 1024px) 16vw, 18vw'}
              alt={image.alt_text || title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-zirbe/40">
              <Icon size={36} strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </span>
        <span className="block min-w-0 flex-1 p-4">
          <span className="flex items-center gap-2 text-[1.0625rem] text-zirbe">
            <Icon size={18} strokeWidth={1.75} aria-hidden className="shrink-0" />
            {title}
          </span>
          <span className="mt-2 block space-y-1 text-[0.9375rem] leading-snug text-rinde">
            {(text?.items ?? []).map((item) => (
              <span key={item} className="flex gap-2">
                <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-zirbe" />
                {item}
              </span>
            ))}
          </span>
          {text?.hint && (
            <span className="mt-2 block text-[0.875rem] text-rinde/75">{text.hint}</span>
          )}
        </span>
      </>
    );
    const cls = `flex h-full overflow-hidden rounded-[4px] border border-zirbe/15 bg-white text-left ${
      layout === 'stacked' ? 'flex-col' : 'flex-row'
    }`;
    const category = c.galleryCategory;
    if (!category) return <div className={cls}>{inner}</div>;
    return (
      <a
        href="#galerie"
        onClick={(e) => {
          e.preventDefault();
          scrollToGalleryCategory(category);
        }}
        className={`${cls} transition-colors hover:border-zirbe/40`}
      >
        {inner}
      </a>
    );
  };

  return (
    <section id="ferienhaus" aria-labelledby="ferienhaus-title" className="brand-section bg-leinen">
      <div className="brand-container lg:grid lg:grid-cols-12 lg:gap-x-10">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+2rem)]">
            <SectionHeader
              id="ferienhaus-title"
              label={t.navigation.ferienhaus}
              title={getText('ferienhaus_title')}
              titleKey="ferienhaus_title"
              intro={getText('ferienhaus_subtitle')}
              introKey="ferienhaus_subtitle"
            />
            <div className="mt-8 hidden lg:block">{floorPlan}</div>
          </div>
        </div>

        {/* Handy: Wischreihe */}
        <ul className="brand-snap-row mt-8 grid sm:hidden">
          {amenityCards.map((c) => (
            <li key={c.key}>{card(c, 'stacked')}</li>
          ))}
        </ul>

        {/* Tablet und Desktop: zwei Spalten, Bild links */}
        <ul className="mt-8 hidden gap-3 sm:grid sm:grid-cols-2 lg:col-span-8 lg:mt-0 lg:gap-4">
          {amenityCards.map((c) => (
            <li key={c.key}>{card(c, 'side')}</li>
          ))}
        </ul>

        <div className="mt-8 md:max-w-[36rem] lg:hidden">{floorPlan}</div>
      </div>

      {showFloorPlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.ui.floorPlan}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-rinde/80 p-4"
          onClick={() => setShowFloorPlan(false)}
        >
          <button
            type="button"
            onClick={() => setShowFloorPlan(false)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-[4px] bg-leinen text-zirbe"
            aria-label={t.common.close}
          >
            <X size={24} aria-hidden />
          </button>
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[4px] bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src="/images/grundriss.jpg"
              alt={`${t.ui.floorPlan} – Sechszirbenhütte`}
              width={1024}
              height={550}
              sizes="(min-width: 1100px) 1024px, 100vw"
              className="h-auto w-full"
            />
          </div>
        </div>
      )}
    </section>
  );
}
