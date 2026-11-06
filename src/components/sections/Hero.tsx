'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMotion } from '@/contexts/MotionContext';
import { BookingSearch } from '@/components/brand/BookingSearch';

// Aufmacher im früheren Aufbau, mit dem neuen Schriftbild: das Hüttenvideo
// (Medienkategorie „hero“, Cloudflare Stream/HLS) füllt den ganzen Bildschirm,
// die Navigation liegt durchsichtig darüber. Ort, Leitidee und Einleitung
// stehen mittig auf dem abgedunkelten Film — in der Grundschrift (Northwell nie
// über Film oder Fotos). Buchen: ab 1024 px eine Suchleiste auf deckendem Grün
// im Bild, schmaler die kompakte Suche auf Grün unter dem Film.
//
// Wiedergabe: stumm, inline, in Schleife, unabhängig vom Scrollen. Start und
// jede Wiederholung erst bei FILM_START_S — davor wackelt die Drohne kurz
// (Wunsch 06.11.2026); das Standbild stammt aus derselben Sekunde. Automatischer
// Start nur ohne reduzierte Bewegung. Außerhalb des Sichtbereichs oder bei
// verdecktem Tab pausiert der Film; eine bewusste Pause wird nie automatisch
// aufgehoben. Das Standbild aus genau diesem Film liegt als Bild mit srcset
// darüber (/api/hero-poster) und lädt direkt aus dem HTML — es ist das größte
// Element beim Laden (LCP) — bis der Film das erste Mal läuft.

type HlsLike = { destroy: () => void };

const STILL_SRC = '/api/hero-poster?w=1920';
const STILL_SRCSET =
  '/api/hero-poster?w=640 640w, /api/hero-poster?w=960 960w, /api/hero-poster?w=1280 1280w, /api/hero-poster?w=1920 1920w';
const STILL_SIZES = '100vw';
/** Sekunde, ab der der Film läuft (auch in der Schleife), wie in /api/hero-poster */
const FILM_START_S = 2;

export function Hero() {
  const { t } = useLanguage();
  const { reduced } = useMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsLike | null>(null);
  const userPausedRef = useRef(false);
  const autoPausedRef = useRef(false);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // Standbild als Bild im HTML (LCP), bis der Film einmal läuft
  const [started, setStarted] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // Videoquelle und Poster aus der Medienverwaltung
  useEffect(() => {
    let cancelled = false;
    fetch('/api/media?category=hero&type=video', { cache: 'no-store' })
      .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
      .then((data) => {
        const url = data.media?.[0]?.url;
        if (cancelled) return;
        if (!url) {
          setFailed(true);
          return;
        }
        setVideoUrl(url);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const tryAutoplay = useCallback(() => {
    const video = videoRef.current;
    if (!video || reducedRef.current || userPausedRef.current) return;
    video.muted = true;
    video.play().catch(() => {
      // Autoplay blockiert: Poster bleibt, Start über den Schalter
    });
  }, []);

  // HLS anbinden (Safari/iOS nativ, sonst hls.js)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    let cancelled = false;
    video.muted = true;
    video.defaultMuted = true;

    const onReady = () => {
      if (cancelled) return;
      setReady(true);
      if (video.currentTime < FILM_START_S) video.currentTime = FILM_START_S;
      tryAutoplay();
    };

    const attach = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = videoUrl;
        video.addEventListener('loadedmetadata', onReady, { once: true });
        return;
      }
      try {
        const Hls = (await import('hls.js')).default;
        if (cancelled) return;
        if (!Hls.isSupported()) {
          video.src = videoUrl;
          video.addEventListener('loadedmetadata', onReady, { once: true });
          return;
        }
        const small = window.matchMedia('(max-width: 767px)').matches;
        const hls = new Hls({
          enableWorker: false,
          maxBufferLength: small ? 15 : 30,
          maxMaxBufferLength: small ? 30 : 60,
          startLevel: small ? 0 : -1,
        });
        hls.on(Hls.Events.ERROR, (_e: string, data: { fatal: boolean; type: string }) => {
          if (!data.fatal) return;
          if (data.type === 'networkError') {
            hls.startLoad();
          } else {
            hls.destroy();
            hlsRef.current = null;
            if (!cancelled) setFailed(true);
          }
        });
        hls.on(Hls.Events.MANIFEST_PARSED, onReady);
        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    attach();

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', onReady);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl, tryAutoplay]);

  // Außerhalb des Sichtbereichs und bei verdecktem Tab pausieren
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    const pauseAuto = () => {
      if (!video.paused) {
        autoPausedRef.current = true;
        video.pause();
      }
    };
    const resumeAuto = () => {
      if (!autoPausedRef.current || userPausedRef.current) return;
      autoPausedRef.current = false;
      video.play().catch(() => {});
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) resumeAuto();
        else pauseAuto();
      },
      { threshold: 0.15 },
    );
    observer.observe(video);
    const onVisibility = () => (document.hidden ? pauseAuto() : resumeAuto());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ready]);

  // Wechsel auf reduzierte Bewegung pausiert einen automatisch laufenden Film
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !ready) return;
    if (reduced && !video.paused && !userPausedRef.current) {
      video.pause();
      autoPausedRef.current = false;
    }
  }, [reduced, ready]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      autoPausedRef.current = false;
      video.muted = true;
      video.play().catch(() => setFailed(true));
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  };

  return (
    <section id="hero" aria-labelledby="hero-title" className="bg-zirbe">
      {/* Standbild schon im <head> ankündigen (React hebt den Link dorthin),
          damit es vor CSS und Skripten lädt */}
      <link
        rel="preload"
        as="image"
        href={STILL_SRC}
        imageSrcSet={STILL_SRCSET}
        imageSizes={STILL_SIZES}
        fetchPriority="high"
      />
      <div className="relative isolate flex min-h-[max(560px,100svh)] flex-col overflow-hidden bg-rinde lg:min-h-[max(680px,100svh)]">
        {/* Film über die ganze Fläche */}
        <video
          ref={videoRef}
          id="hero-video"
          muted
          playsInline
          disablePictureInPicture
          preload="metadata"
          aria-label={t.brand.videoLabel}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_60%]"
          onPlay={() => {
            setPlaying(true);
            setStarted(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={(e) => {
            // Schleife selbst: zurück an den ruhigen Anfang statt auf 0
            const video = e.currentTarget;
            video.currentTime = FILM_START_S;
            video.play().catch(() => {});
          }}
          onError={() => setFailed(true)}
        />
        {!stillFailed && (
          // eslint-disable-next-line @next/next/no-img-element -- Standbild direkt im HTML (LCP)
          <img
            src={STILL_SRC}
            srcSet={STILL_SRCSET}
            sizes={STILL_SIZES}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            decoding="async"
            onError={() => setStillFailed(true)}
            className={`pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-[50%_60%] transition-opacity duration-500 motion-reduce:transition-none ${
              started ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}
        {/* Abdunkeln: oben für die Navigation, in der Mitte für die Leitidee,
            unten für die Suchleiste */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(32,40,36,0.66)_0%,rgba(32,40,36,0.30)_26%,rgba(32,40,36,0.36)_58%,rgba(32,40,36,0.74)_100%)]"
        />

        <div className="brand-container flex flex-1 flex-col items-center justify-center pb-20 pt-[calc(var(--header-height)+1.5rem)] text-center text-leinen lg:pb-24">
          <p className="brand-label text-holz [text-shadow:0_1px_8px_rgba(0,0,0,0.4)]">
            {t.brand.place}
          </p>
          <h1 id="hero-title" className="mt-5 [text-shadow:0_2px_18px_rgba(0,0,0,0.35)] md:mt-6">
            <span className="brand-hero-title block">{t.brand.claim}</span>
            <span className="brand-hero-title block">{t.brand.claimHand}</span>
          </h1>
          <p className="mt-6 max-w-[38rem] text-leinen [text-shadow:0_1px_10px_rgba(0,0,0,0.45)] md:mt-8">
            {t.brand.heroText}
          </p>
          {/* ab 1024 px: Suche als Leiste im Bild */}
          <div className="mt-10 hidden w-full max-w-[62rem] lg:block">
            <div className="on-zirbe rounded-[4px] bg-zirbe px-6 pb-4 pt-5 text-left">
              <BookingSearch variant="bar" />
            </div>
          </div>
        </div>

        {(ready || !stillFailed) && !failed && (
          <button
            type="button"
            onClick={toggle}
            disabled={!ready}
            aria-pressed={!playing}
            className="absolute bottom-4 left-4 inline-flex min-h-[44px] items-center gap-2 rounded-[4px] bg-zirbe px-4 text-[0.9375rem] text-leinen hover:bg-[#2f4a41] disabled:opacity-70 md:bottom-6 md:left-6"
          >
            {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
            {playing ? t.brand.videoPause : t.brand.videoPlay}
          </button>
        )}
      </div>

      {/* schmaler: Suche auf Grün unter dem Film */}
      <div className="on-zirbe bg-zirbe py-10 text-leinen lg:hidden">
        <div className="brand-container">
          <BookingSearch variant="hero" className="mx-auto max-w-[36rem]" />
        </div>
      </div>
    </section>
  );
}
