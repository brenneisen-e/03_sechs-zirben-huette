'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMotion } from '@/contexts/MotionContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { SocialLinks } from './SocialLinks';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BookingCTA } from '@/components/brand/BookingCTA';

// Navigation der öffentlichen Seiten im früheren Aufbau, mit dem neuen
// Schriftbild: Logo-Schild (Dunkelgrün, weißes Original-Logo in Mindestgröße
// 240 px) in der Mitte, links und rechts davon die Ziele; außen links die
// Sprache, außen rechts Instagram/Google (ab 1280 px) und „Anfragen“ (roter
// Knopf); schmaler stehen Instagram/Google im Menü.
//
// Startseite: liegt durchsichtig über dem Film des Aufmachers. Ab 1024 px
// steht sie oben fest und bekommt beim Scrollen eine Leinenfläche; schmaler
// scrollt sie mit (das Vollzeichen braucht seine 240 px), Buchen bleibt dort
// über die Leiste am unteren Rand erreichbar. Unterseiten: Leinenfläche von
// Anfang an. Logo und Navigation werden beim Scrollen weder skaliert noch
// verformt.
//
// Schmaler als 1024 px: Beim Scrollen gleitet oben eine schmale Leiste ein
// (CompactBar: Instagram | kleines Zeichen | Google), passend zum Scrollweg,
// während das große Logo-Schild nach oben verschwindet.
//
// Ziele sind echte Links (/#abschnitt) — funktionieren auch ohne JavaScript
// und von Unterseiten aus.

const LEFT_ITEMS = [
  { key: 'ferienhaus', href: '/#huette' },
  { key: 'galerie', href: '/#galerie' },
] as const;

const RIGHT_ITEMS = [
  { key: 'umgebung', href: '/#umgebung' },
  { key: 'blog', href: '/blog' },
] as const;

const NAV_ITEMS = [...LEFT_ITEMS, ...RIGHT_ITEMS];

export function Header() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === '/';

  // Menü bei Seitenwechsel und Escape schließen
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Startseite: ab etwas Scrollweg Leinenfläche statt Film (nur ab 1024 px sichtbar)
  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  if (pathname?.startsWith('/admin')) return null;

  const isBlog = pathname?.startsWith('/blog');
  // Über dem Film (Startseite, ganz oben): helle Schrift; sonst Grün auf Leinen
  const desktopOnFilm = isHome && !scrolled;

  const position = isHome
    ? `absolute inset-x-0 top-0 lg:fixed ${
        scrolled
          ? 'lg:bg-leinen/95 lg:shadow-[0_1px_0_rgba(38,61,53,0.14)] lg:backdrop-blur-sm'
          : ''
      }`
    : 'relative bg-leinen shadow-[0_1px_0_rgba(38,61,53,0.14)] lg:sticky lg:top-0';
  const navColor = desktopOnFilm
    ? 'text-leinen [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]'
    : 'text-zirbe';
  const mobileColor = isHome ? 'text-leinen' : 'text-zirbe';

  const navLink = (item: (typeof NAV_ITEMS)[number]) => {
    const current = item.key === 'blog' && isBlog;
    return (
      <li key={item.key}>
        <a
          href={item.href}
          aria-current={current ? 'page' : undefined}
          className={`brand-nav-link py-2 underline-offset-[0.45em] hover:underline ${navColor} ${
            current ? 'underline decoration-2' : ''
          }`}
        >
          {t.navigation[item.key]}
        </a>
      </li>
    );
  };

  return (
    <header className={`brand-header z-50 transition-colors duration-300 ${position}`}>
      {/* ab 1024 px: Sprache, Ziele | Logo-Schild | Ziele, Anfragen — das Logo
          steht genau in der Mitte, die Ziele rücken an das Schild */}
      <div
        className="brand-container hidden items-center gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
        style={{ height: 'var(--header-height)' }}
      >
        <div className="flex items-center justify-between gap-6">
          <LanguageSwitcher isScrolled={!desktopOnFilm} alignLeft />
          <nav aria-label="Hauptnavigation links">
            <ul className="flex items-center gap-6 xl:gap-8">{LEFT_ITEMS.map(navLink)}</ul>
          </nav>
        </div>

        <a href="/" className="brand-logo-sign" aria-label="Sechszirbenhütte – Startseite">
          <BrandLogo />
        </a>

        <div className="flex items-center justify-between gap-6">
          <nav aria-label="Hauptnavigation rechts">
            <ul className="flex items-center gap-6 xl:gap-8">{RIGHT_ITEMS.map(navLink)}</ul>
          </nav>
          <div className="flex items-center gap-3">
            <SocialLinks
              className="hidden xl:flex"
              linkClassName={`${navColor} ${desktopOnFilm ? 'hover:bg-leinen/10' : 'hover:bg-zirbe/10'}`}
            />
            <BookingCTA compact />
          </div>
        </div>
      </div>

      {/* schmaler: Menü | Logo-Schild | Sprache */}
      <div className="brand-container grid grid-cols-[44px_minmax(0,1fr)_44px] items-center py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className={`inline-flex h-11 w-11 items-center justify-center rounded-[4px] ${mobileColor} ${
            isHome ? 'hover:bg-leinen/10' : 'hover:bg-zirbe/10'
          }`}
        >
          {menuOpen ? <X size={26} aria-hidden /> : <Menu size={26} aria-hidden />}
          <span className="sr-only">{menuOpen ? t.common.close : 'Menü'}</span>
        </button>
        <a
          href="/"
          className="brand-logo-sign brand-mobile-logo justify-self-center"
          aria-label="Sechszirbenhütte – Startseite"
        >
          <BrandLogo />
        </a>
        <div className="justify-self-end">
          <LanguageSwitcher isScrolled={!isHome} />
        </div>
      </div>

      <CompactBar />

      {menuOpen && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-t border-zirbe/15 bg-leinen shadow-[0_12px_24px_rgba(32,40,36,0.18)] lg:hidden"
        >
          <nav aria-label="Hauptnavigation mobil" className="brand-container py-4">
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="brand-nav-link block py-3 text-zirbe underline-offset-[0.45em] hover:underline"
                  >
                    {t.navigation[item.key]}
                  </a>
                </li>
              ))}
            </ul>
            <SocialLinks className="mt-2 -ml-2" linkClassName="text-zirbe hover:bg-zirbe/10" />
            <div className="mt-4 pb-2">
              <BookingCTA compact className="w-full" onClick={() => setMenuOpen(false)} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

// Schmale Leiste oben (nur unter 1024 px): erscheint mit dem Scrollweg
// zwischen START und END px — Einblenden und Hereingleiten folgen dem Finger
// (nur transform/opacity, per requestAnimationFrame), bei reduzierter Bewegung
// schaltet sie ohne Übergang um. Das kleine Zeichen ist der Zirbenzweig aus dem
// Logo auf Zirbengrün (wie das Favicon) und führt nach oben.
const COMPACT_START = 30;
const COMPACT_END = 110;

function CompactBar() {
  const { reduced } = useMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const raw = (y - COMPACT_START) / (COMPACT_END - COMPACT_START);
      const p = reduced ? (y > COMPACT_END ? 1 : 0) : Math.min(1, Math.max(0, raw));
      // am Wurzelelement, damit auch das große Logo-Schild mitläuft
      document.documentElement.style.setProperty('--compact-p', String(p));
      setShown(p > 0.5);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty('--compact-p');
    };
  }, [reduced]);

  return (
    <div
      aria-hidden={!shown}
      className="brand-compact-bar fixed inset-x-0 top-0 z-[55] bg-leinen/95 shadow-[0_1px_0_rgba(38,61,53,0.14)] backdrop-blur-sm lg:hidden"
    >
      <div className="brand-container grid h-14 grid-cols-[1fr_auto_1fr] items-center">
        <SocialLinks
          className="justify-self-start [&_li:last-child]:hidden"
          linkClassName="text-zirbe hover:bg-zirbe/10"
          tabIndex={shown ? 0 : -1}
        />
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
          }}
          className="brand-compact-mark inline-flex h-10 w-10 items-center justify-center rounded-[6px] bg-zirbe"
          aria-label="Sechszirbenhütte – nach oben"
          tabIndex={shown ? 0 : -1}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- kleines SVG-Zeichen */}
          <img
            src="/images/brand/zirbenzweig.svg"
            alt=""
            width={22}
            height={25}
            className="h-[25px] w-auto invert"
          />
        </a>
        <SocialLinks
          className="justify-self-end [&_li:first-child]:hidden"
          linkClassName="text-zirbe hover:bg-zirbe/10"
          tabIndex={shown ? 0 : -1}
        />
      </div>
    </div>
  );
}

// Buchen-Zugang am unteren Rand (nur schmale Ansichten, nachdem der Aufmacher
// verlassen wurde). Bleibt an seinem Platz — kein Hüpfen, kein Ausweichen.
export function MobileBookingButton() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/gaeste')) return null;

  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 z-[60] bg-zirbe px-4 pt-3 safe-area-bottom ${
        visible ? '' : 'invisible'
      }`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <BookingCTA className="w-full" />
    </div>
  );
}
