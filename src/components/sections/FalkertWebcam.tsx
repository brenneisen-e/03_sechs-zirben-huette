'use client';

import { useEffect, useState } from 'react';
import { Camera, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Webcam „Falkert Nord“ von foto-webcam.eu (dieselbe Kamera wie die erste auf
// heidialm.at). foto-webcam.eu erlaubt das Einbinden des Vorschaubilds bis
// 720 × 405 px mit Link auf die Kameraseite („Embedding to your own web
// site“) — daher nur 720.jpg und immer verlinkt, mit Quellenangabe. Das Bild
// wird alle 5 Minuten neu geladen (Kamera und Cache erneuern sich ähnlich oft).

const CAM_PAGE = 'https://www.foto-webcam.eu/webcam/falkert-nord/';
const CAM_IMAGE = 'https://www.foto-webcam.eu/webcam/falkert-nord/current/720.jpg';
const REFRESH_MS = 5 * 60 * 1000;

export function FalkertWebcam() {
  const { t } = useLanguage();
  const w = t.lage.webcam;
  const [stamp, setStamp] = useState<number | null>(null);

  useEffect(() => {
    setStamp(Date.now());
    const id = window.setInterval(() => setStamp(Date.now()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  const src = stamp ? `${CAM_IMAGE}?t=${Math.floor(stamp / REFRESH_MS)}` : CAM_IMAGE;

  return (
    <div className="mt-4 grid gap-4 rounded-[4px] border border-zirbe/15 bg-white p-4 md:grid-cols-2 lg:mt-6 lg:grid-cols-12 lg:gap-6 lg:p-5">
      <a
        href={CAM_PAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-[4px] bg-zirbe/10 lg:col-span-7"
        aria-label={w.open}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={w.alt}
          width={720}
          height={405}
          loading="lazy"
          decoding="async"
          className="block aspect-[16/9] h-auto w-full object-cover"
        />
      </a>
      <div className="flex flex-col justify-center gap-3 lg:col-span-5">
        <p className="flex items-center gap-2 text-[1.0625rem] text-zirbe">
          <Camera size={18} aria-hidden />
          {w.title}
        </p>
        <p className="text-[0.9375rem] text-rinde">{w.text}</p>
        <p className="text-[0.875rem] text-rinde/70">{w.refresh}</p>
        <a
          href={CAM_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="brand-secondary self-start"
        >
          <ExternalLink size={18} aria-hidden />
          {w.open}
        </a>
        <p className="text-[0.8125rem] text-rinde/60">{w.credit}</p>
      </div>
    </div>
  );
}
