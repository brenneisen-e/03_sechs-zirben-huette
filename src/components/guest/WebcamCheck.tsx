'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ExternalLink } from 'lucide-react';

// Gäste-App: „Wetter-Check am Falkert“ — die drei Kameras der Heidi Alm
// (foto-webcam.eu, wie auf heidialm.at) zum Durchwischen. foto-webcam.eu
// erlaubt das Einbinden des Vorschaubilds bis 720 × 405 px mit Link auf die
// Kameraseite — daher nur current/720.jpg, jedes Bild verlinkt, Quelle
// genannt. Neu laden alle 5 Minuten. Website: sections/FalkertWebcam.tsx.

const CAMS = [
  { id: 'falkert-nord', label: 'Falkert – Blick nach Nordosten über den See' },
  { id: 'heidi-hotel', label: 'Falkertsee – Blick nach Norden zum Heidi-Hotel' },
  { id: 'heidi-chalets', label: 'Heidi-Chalets – Blick zum Falkertspitz' },
] as const;
const REFRESH_MS = 5 * 60 * 1000;

export function WebcamCheck() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    setSlot(Math.floor(Date.now() / REFRESH_MS));
    const id = window.setInterval(() => setSlot(Math.floor(Date.now() / REFRESH_MS)), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setActive(Math.min(CAMS.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  }, []);

  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="mt-4 bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 pb-3">
        <h3 className="font-bold text-gray-800 mb-1 text-sm uppercase tracking-wide flex items-center gap-2">
          <Camera size={16} className="text-[#2d5a27]" />
          Wetter-Check am Falkert
        </h3>
        <p className="text-sm text-gray-600">
          Keine Wetter-App ist so gut wie ein ehrlicher Blick auf unsere Falkert-Webcams.
        </p>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {CAMS.map((cam) => {
          const page = `https://www.foto-webcam.eu/webcam/${cam.id}/`;
          const src = `${page}current/720.jpg${slot ? `?t=${slot}` : ''}`;
          return (
            <a
              key={cam.id}
              href={page}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block w-full flex-shrink-0 snap-start"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- feste Größen von foto-webcam.eu */}
              <img
                src={src}
                alt={`Webcam ${cam.label}`}
                width={720}
                height={405}
                loading="lazy"
                decoding="async"
                className="block aspect-[16/9] w-full object-cover bg-gray-100"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-2 pt-6 text-xs text-white">
                {cam.label}
              </span>
            </a>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex gap-1.5">
          {CAMS.map((cam, i) => (
            <button
              key={cam.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Kamera ${i + 1}: ${cam.label}`}
              aria-current={i === active}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-6 bg-[#2d5a27]' : 'w-1.5 bg-[#2d5a27]/25'
              }`}
            />
          ))}
        </div>
        <a
          href={`https://www.foto-webcam.eu/webcam/${CAMS[active]?.id ?? CAMS[0].id}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#2d5a27] font-medium hover:underline"
        >
          Zeitraffer & Archiv
          <ExternalLink size={12} />
        </a>
      </div>
      <p className="px-5 pb-4 text-[11px] text-gray-400">
        Webcams: foto-webcam.eu · Bild erneuert sich alle paar Minuten
      </p>
    </div>
  );
}
