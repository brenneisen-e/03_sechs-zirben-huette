'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Hand, Lock, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionHeader } from '@/components/brand/SectionHeader';
import { SITE_CONFIG } from '@/lib/constants';
import { FalkertWebcam } from './FalkertWebcam';

// Anfahrt: Karte (OpenStreetMap) und daneben Adresse, Weg und Kontakt.
// Desktop 12 Spalten (Karte 7, Angaben 5), Tablet zwei Spalten, Handy
// untereinander. Auf Touch-Geräten ist die Karte gesperrt, bis man sie antippt,
// damit sie beim Scrollen nicht mitwandert. Darunter das aktuelle Bild der
// Webcam am Falkert (FalkertWebcam).

const MAPS_URL = 'https://maps.app.goo.gl/CaaeUUnQQjHCyhz68';

export function Location() {
  const { t } = useLanguage();
  const l = t.lage;
  const [mapInteractive, setMapInteractive] = useState(false);
  const { lat, lng } = SITE_CONFIG.coordinates;
  const bbox = `${lng - 0.05}%2C${lat - 0.035}%2C${lng + 0.05}%2C${lat + 0.035}`;

  const block = 'rounded-[4px] border border-zirbe/15 bg-white p-5';
  const blockTitle = 'flex items-center gap-2 text-[1.0625rem] text-zirbe';

  return (
    <section id="lage" aria-labelledby="lage-title" className="brand-section bg-leinen">
      <div className="brand-container">
        <SectionHeader
          id="lage-title"
          label={l.label}
          title={l.title}
          intro={l.intro}
          action={
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-secondary"
            >
              <Navigation size={18} aria-hidden />
              {l.maps}
            </a>
          }
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-6">
          <div className="relative h-[340px] overflow-hidden rounded-[4px] border border-zirbe/15 md:h-auto md:min-h-[420px] lg:col-span-7">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`}
              className={`absolute inset-0 h-full w-full ${
                mapInteractive
                  ? 'pointer-events-auto'
                  : 'pointer-events-none lg:pointer-events-auto'
              }`}
              style={{ border: 0 }}
              loading="lazy"
              title={l.mapTitle}
            />
            {mapInteractive ? (
              <button
                type="button"
                onClick={() => setMapInteractive(false)}
                className="absolute right-2 top-2 inline-flex min-h-[40px] items-center gap-1.5 rounded-[4px] bg-zirbe px-3 text-[0.875rem] text-leinen lg:hidden"
              >
                <Lock size={14} aria-hidden />
                {l.lockMap}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMapInteractive(true)}
                className="absolute inset-0 flex items-end justify-center pb-4 lg:hidden"
              >
                <span className="inline-flex items-center gap-2 rounded-[4px] bg-zirbe px-3 py-2 text-[0.875rem] text-leinen">
                  <Hand size={16} aria-hidden />
                  {l.tapMap}
                </span>
              </button>
            )}
          </div>

          <div className="grid content-start gap-4 lg:col-span-5">
            <div className={block}>
              <p className={blockTitle}>
                <MapPin size={18} aria-hidden />
                {l.address}
              </p>
              <p className="mt-2 text-rinde">
                {SITE_CONFIG.address.street}
                <br />
                {SITE_CONFIG.address.zip} {SITE_CONFIG.address.city}
                <br />
                {SITE_CONFIG.address.country}
              </p>
            </div>

            <div className={block}>
              <p className={blockTitle}>
                <Navigation size={18} aria-hidden />
                {l.route}
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[0.9375rem] text-rinde">
                {l.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 flex items-center gap-2 text-[0.9375rem] text-rinde">
                <AlertTriangle size={16} aria-hidden className="shrink-0 text-zirbe" />
                {l.snow}
              </p>
              <p className="mt-1 flex items-center gap-2 text-[0.9375rem] text-rinde">
                <Clock size={16} aria-hidden className="shrink-0 text-zirbe" />
                {l.checkin}
              </p>
            </div>

            <div className="on-zirbe rounded-[4px] bg-zirbe p-5 text-leinen">
              <p className="flex items-center gap-2 text-[1.0625rem]">
                <Mail size={18} aria-hidden />
                {l.contact}
              </p>
              <p className="mt-2">
                <a href={`mailto:${SITE_CONFIG.email}`} className="brand-link">
                  {SITE_CONFIG.email}
                </a>
              </p>
              <p className="mt-1 flex items-center gap-2">
                <Phone size={16} aria-hidden />
                <a
                  href={`tel:${SITE_CONFIG.phone.replace(/\(0\)|\s/g, '')}`}
                  className="brand-link"
                >
                  {SITE_CONFIG.phone}
                </a>
              </p>
            </div>
          </div>
        </div>

        <FalkertWebcam />
      </div>
    </section>
  );
}
