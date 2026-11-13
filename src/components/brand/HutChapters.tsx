'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMotion } from '@/contexts/MotionContext';
import { useImageVariants } from '@/contexts/SiteSettingsContext';
import { type ResponsiveSource, responsiveSource } from '@/lib/imageVariants';

// Hüttenporträt in drei Kapiteln.
//
// Grundaufbau (mobil, reduzierte Bewegung, ohne JavaScript, 200 % Zoom): drei
// normale Bild-Text-Blöcke untereinander, auf dem Handy randlos.
//
// M2 (ab 1024 × 700 px mit Bewegung): Bild links sticky und bis an den linken
// Bildschirmrand, Text rechts. Aktiv
// ist das Kapitel, dessen Überschrift die Leselinie bei 45 % Viewporthöhe
// erreicht hat — vorwärts wie rückwärts. Wechsel durch Überblendung (180 ms),
// keine Zooms, kein blockiertes Scrollen.

// Bilder je Kapitel: lokale Dateien (800/1400 px) oder ein Bild aus
// Cloudflare Images, das je nach Bildschirm in passender Größe kommt
type ChapterImage = { base: string } | { cf: string };

const IMAGES: ChapterImage[] = [
  { base: '/images/brand/kapitel-draussen' },
  // Stube mit grünem Sofa (Wunsch Malte, 19.10.2026)
  {
    cf: 'https://imagedelivery.net/VR8seCaTFFzHRDFZQKPkeQ/489e7248-6d4e-427f-37dc-fda6ab0e4e00/public',
  },
  { base: '/images/brand/kapitel-zeit' },
];

const ENHANCE_QUERY = '(min-width: 1024px) and (min-height: 700px)';

function chapterSource(img: ChapterImage | undefined, variants: boolean): ResponsiveSource {
  if (!img) return { src: '' };
  if ('cf' in img) return responsiveSource(img.cf, variants, 'hero', 'large');
  return {
    src: `${img.base}-1400.jpg`,
    srcSet: `${img.base}-800.jpg 800w, ${img.base}-1400.jpg 1400w`,
  };
}

export function HutChapters() {
  const { t } = useLanguage();
  const { reduced } = useMotion();
  const variants = useImageVariants();
  const chapters = t.brand.chapters;
  const sectionRef = useRef<HTMLElement>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const [enhanced, setEnhanced] = useState(false);
  const [active, setActive] = useState(0);

  // Erweiterung nur bei passender Fläche und erlaubter Bewegung
  useEffect(() => {
    const query = window.matchMedia(ENHANCE_QUERY);
    const update = () => setEnhanced(query.matches && !reduced);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [reduced]);

  // Bilder vor dem ersten Wechsel decodieren
  useEffect(() => {
    if (!enhanced) return;
    for (const img of IMAGES) {
      const pre = new Image();
      const source = chapterSource(img, variants);
      if (source.srcSet) {
        pre.sizes = '62vw';
        pre.srcset = source.srcSet;
      }
      pre.src = source.src;
      pre.decode?.().catch(() => {});
    }
  }, [enhanced, variants]);

  // Leselinie: nur solange der Abschnitt sichtbar ist, höchstens ein Update pro Frame
  useEffect(() => {
    const section = sectionRef.current;
    if (!enhanced || !section) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * 0.45;
      let next = 0;
      headingRefs.current.forEach((h, i) => {
        if (h && h.getBoundingClientRect().top <= line) next = i;
      });
      setActive(next);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    let listening = false;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible && !listening) {
        window.addEventListener('scroll', onScroll, { passive: true });
        listening = true;
        measure();
      } else if (!visible && listening) {
        window.removeEventListener('scroll', onScroll);
        listening = false;
      }
    });
    observer.observe(section);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enhanced]);

  return (
    <section
      id="huette"
      ref={sectionRef}
      aria-labelledby="huette-title"
      className="brand-section overflow-x-clip bg-leinen"
    >
      <div className="brand-container">
        <p className="brand-label text-zirbe">{t.brand.chaptersLabel}</p>
        <h2 id="huette-title" className="brand-h2 mt-3 max-w-3xl text-zirbe">
          {t.brand.chaptersTitle}
        </h2>

        <div
          className={`chapters mt-8 md:mt-12 ${
            enhanced ? 'is-enhanced grid grid-cols-12 gap-x-10' : ''
          }`}
        >
          {enhanced && (
            <div className="chapters-sticky col-span-7 row-span-3">
              <div className="chapters-sticky-frame">
                {chapters.map((chapter, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={chapter.title}
                    {...chapterSource(IMAGES[i], variants)}
                    sizes="62vw"
                    alt={chapter.alt}
                    aria-hidden={i === active ? undefined : true}
                    width={1400}
                    height={1050}
                    className={i === active ? 'is-active' : ''}
                  />
                ))}
              </div>
            </div>
          )}

          {chapters.map((chapter, i) => (
            <article
              key={chapter.title}
              className={
                enhanced
                  ? 'col-span-4 col-start-9 flex min-h-[52vh] flex-col justify-center py-[5vh] first:pt-0 last:pb-[12vh]'
                  : 'grid gap-5 py-6 first:pt-0 md:grid-cols-12 md:items-center md:gap-10 md:py-8'
              }
            >
              <figure
                className={`chapter-figure -mx-[var(--space-gutter)] md:col-span-7 md:mx-0 ${i % 2 === 1 ? 'md:order-2 md:col-start-6' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  {...chapterSource(IMAGES[i], variants)}
                  sizes="(min-width: 768px) 58vw, 100vw"
                  alt={chapter.alt}
                  width={1400}
                  height={1050}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-[4/3] w-full object-cover md:rounded-[4px]"
                />
              </figure>
              <div className={enhanced ? '' : `md:col-span-5 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                <p className="brand-label text-zirbe">{String(i + 1).padStart(2, '0')}</p>
                <h3
                  ref={(el) => {
                    headingRefs.current[i] = el;
                  }}
                  className="brand-h2 mt-2 text-zirbe"
                >
                  {chapter.title}
                </h3>
                <p className="mt-4 max-w-[34rem] text-rinde">{chapter.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
