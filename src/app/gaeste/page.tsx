'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Users,
  Dog,
  Info,
  MapPin,
  Coffee,
  Utensils,
  Mountain,
  Car,
  Snowflake,
  Home,
  ShoppingCart,
  Flame,
  Wifi,
  Key,
  ClipboardCheck,
  Bus,
  ExternalLink,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

import { CHECKIN_URL, PRECHECKIN_URL } from '@/lib/registration';
import { WebcamCheck } from '@/components/guest/WebcamCheck';

const ICON_MAP: Record<string, LucideIcon> = {
  info: Info,
  'map-pin': MapPin,
  coffee: Coffee,
  utensils: Utensils,
  mountain: Mountain,
  car: Car,
  snowflake: Snowflake,
  home: Home,
  'shopping-cart': ShoppingCart,
  flame: Flame,
  wifi: Wifi,
  key: Key,
};

interface GuestInfo {
  name: string;
  arrival_date: string | null;
  departure_date: string | null;
  adults: number;
  children: number;
  pets: string | null;
}

interface Card {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  image_alt: string | null;
}

interface Category {
  id: number;
  title: string;
  icon: string;
  group_name?: string;
  cards: Card[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ======== LOGIN SCREEN ========
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Link aus der Willkommensnachricht (Beds24-Cockpit): /gaeste?code=XXXXXX
    const fromLink = new URLSearchParams(window.location.search).get('code');
    if (fromLink) setCode(fromLink.trim().toUpperCase());
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        onLogin();
      } else {
        setError(data.error || 'Login fehlgeschlagen');
      }
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d5a27] via-[#3a7233] to-[#4a8a3f] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-sm"
      >
        {/* Logo / Welcome */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Home size={36} className="text-white" />
          </div>
          <h1
            className="text-3xl text-white mb-2"
            style={{ fontFamily: 'FeelingPassionate, cursive' }}
          >
            Willkommen
          </h1>
          <p className="text-white/70 text-sm">Geben Sie Ihren Zugangscode ein</p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20"
        >
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ZUGANGSCODE"
            maxLength={8}
            className="w-full px-4 py-3.5 bg-white/90 rounded-xl text-center text-lg font-bold tracking-[0.3em] placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-400 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            autoComplete="off"
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-200 text-sm text-center mt-3"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full mt-4 py-3.5 bg-white text-[#2d5a27] rounded-xl font-semibold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Einloggen</>}
          </button>
        </form>

        <button
          onClick={async () => {
            setLoading(true);
            try {
              await fetch('/api/guest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'demo' }),
              });
              onLogin();
            } catch {
              setError('Verbindungsfehler');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="w-full mt-3 py-3 bg-white/10 text-white/80 rounded-xl font-medium hover:bg-white/20 disabled:opacity-50 transition text-sm"
        >
          Demo ansehen
        </button>

        <p className="text-center text-white/40 text-xs mt-6">Sechszirbenhütte · Falkertsee</p>
      </motion.div>
    </div>
  );
}

// ======== SWIPEABLE CARD CAROUSEL ========
function CardCarousel({ cards }: { cards: Card[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.offsetWidth * 0.85;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(index, cards.length - 1));
  }, [cards.length]);

  if (cards.length === 1 && cards[0]) {
    return <SingleCard card={cards[0]} />;
  }

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {cards.map((card) => (
          <div key={card.id} className="snap-start flex-shrink-0 w-[85%] md:w-[45%]">
            <SingleCard card={card} />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-6 bg-[#2d5a27]' : 'w-1.5 bg-[#2d5a27]/20'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ======== SINGLE CARD ========
function SingleCard({ card }: { card: Card }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden h-full"
    >
      {card.image_url && (
        <div className="relative h-48 w-full">
          <Image
            src={card.image_url}
            alt={card.image_alt || card.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 85vw, 45vw"
          />
        </div>
      )}
      <div className="p-5">
        <h4 className="font-bold text-gray-800 text-base mb-2">{card.title}</h4>
        {card.content && (
          <>
            <div
              className={`text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none ${
                !expanded && card.content.length > 200 ? 'line-clamp-3' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: card.content }}
            />
            {card.content.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[#2d5a27] text-sm font-medium mt-2 hover:underline"
              >
                {expanded ? 'Weniger' : 'Mehr lesen'}
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ======== ANMELDUNG BEI DER GEMEINDE (Feratel/Deskline) ========
// Seit 1.11.2026 müssen in Kärnten alle Gäste digital gemeldet werden. Vor der
// Anreise füllt eine Person den Pre-Check-in für alle aus; ab dem Anreisetag
// führt der Knopf zum Check-in vor Ort. „Erledigt“ klappt die Karte nur auf
// diesem Gerät zusammen (localStorage).
const REGISTRATION_DONE_KEY = 'szh_registration_done';

function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function RegistrationCard({ guest }: { guest: GuestInfo | null }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      setDone(localStorage.getItem(REGISTRATION_DONE_KEY) === '1');
    } catch {
      /* ohne Speicher bleibt die Karte offen */
    }
  }, []);

  const toggleDone = (value: boolean) => {
    setDone(value);
    try {
      if (value) localStorage.setItem(REGISTRATION_DONE_KEY, '1');
      else localStorage.removeItem(REGISTRATION_DONE_KEY);
    } catch {
      /* ignorieren */
    }
  };

  const today = localIsoDate(new Date());
  const arrival = guest?.arrival_date?.slice(0, 10) || '';
  const departure = guest?.departure_date?.slice(0, 10) || '';
  if (departure && today > departure) return null;
  const arrivalDay = !!arrival && today >= arrival;
  const url = arrivalDay ? CHECKIN_URL : PRECHECKIN_URL;

  if (done) {
    return (
      <div className="mt-4 bg-white rounded-2xl shadow-sm px-5 py-3 flex items-center gap-3 text-sm">
        <CheckCircle2 size={18} className="text-[#2d5a27] flex-shrink-0" />
        <span className="flex-1 text-gray-600">Anmeldung bei der Gemeinde erledigt</span>
        <button
          onClick={() => toggleDone(false)}
          className="text-[#2d5a27] font-medium hover:underline"
        >
          Anzeigen
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white rounded-2xl shadow-md border-2 border-[#2d5a27] overflow-hidden">
      <div className="bg-[#2d5a27] text-white px-5 py-3 flex items-center gap-2">
        <ClipboardCheck size={18} />
        <h3 className="font-bold text-sm uppercase tracking-wide">
          Wichtig: Anmeldung {arrivalDay ? 'am Anreisetag' : 'vor der Anreise'}
        </h3>
      </div>
      <div className="p-5 space-y-3 text-sm text-gray-700 leading-relaxed">
        <p>
          Seit dem 1. November 2026 müssen in Kärnten alle Gäste digital bei der Gemeinde angemeldet
          werden.{' '}
          {arrivalDay
            ? 'Falls Sie den Pre-Check-in noch nicht ausgefüllt haben, erledigen Sie das bitte jetzt – es dauert nur ein paar Minuten.'
            : 'Bitte tragen Sie Ihre Daten vor der Anreise über unseren Pre-Check-in ein – das dauert nur ein paar Minuten.'}
        </p>
        <p>
          Eine Person trägt alle ein. Benötigt werden unter anderem Name, Adresse, Nationalität,
          Geburtsdatum und E-Mail-Adresse sowie die Mitreisenden.
        </p>
        <div className="flex gap-3 bg-[#2d5a27]/5 rounded-xl p-3">
          <Bus size={18} className="text-[#2d5a27] flex-shrink-0 mt-0.5" />
          <p>
            Im Tausch erhalten Sie eine digitale Gästekarte. Sie ist zugleich Ihr Fahrschein: Damit
            fahren Sie während des ganzen Aufenthalts, inklusive An- und Abreisetag, mit fast allen
            Bussen und Zügen in Kärnten kostenlos. Nach dem Pre-Check-in kommt die Karte per Link
            aufs Handy. Kinder unter 6 Jahren fahren gratis, für Hunde und Fahrräder braucht es ein
            eigenes Ticket.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 bg-[#2d5a27] text-white rounded-xl font-semibold hover:bg-[#244a20] transition flex items-center justify-center gap-2"
        >
          {arrivalDay ? 'Zum Check-in' : 'Zum Pre-Check-in'}
          <ExternalLink size={16} />
        </a>
        <button
          onClick={() => toggleDone(true)}
          className="w-full text-center text-[#2d5a27] font-medium hover:underline"
        >
          Schon erledigt
        </button>
      </div>
    </div>
  );
}

// ======== DASHBOARD ========
function Dashboard() {
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [content, setContent] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/guest')
      .then(
        (res) =>
          res.json() as Promise<{
            authenticated: boolean;
            guest?: GuestInfo;
            content?: Category[];
          }>,
      )
      .then((data) => {
        if (data.authenticated) {
          setGuest(data.guest || null);
          setContent(data.content || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2d5a27]" />
      </div>
    );
  }

  const selected = content.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2d5a27] text-white sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          {selectedCategory ? (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-2 text-white/80 hover:text-white transition"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Zurück</span>
            </button>
          ) : (
            <div>
              <h1 className="text-xl" style={{ fontFamily: 'FeelingPassionate, cursive' }}>
                {guest?.name ? `Hallo, ${guest.name.split(' ')[0]}!` : 'Willkommen!'}
              </h1>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 text-white/60 hover:text-white transition"
            title="Abmelden"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <RegistrationCard guest={guest} />

              {/* Booking Info Card */}
              {guest?.arrival_date && (
                <div className="mt-4 bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                    Ihr Aufenthalt
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar size={16} className="text-[#2d5a27]" />
                      <span className="text-gray-600">
                        {formatDate(guest.arrival_date)} — {formatDate(guest.departure_date)}
                      </span>
                    </div>
                    {guest.adults > 0 && (
                      <div className="flex items-center gap-3 text-sm">
                        <Users size={16} className="text-[#2d5a27]" />
                        <span className="text-gray-600">
                          {guest.adults} Erwachsene
                          {guest.children > 0 ? `, ${guest.children} Kinder` : ''}
                        </span>
                      </div>
                    )}
                    {guest.pets && (
                      <div className="flex items-center gap-3 text-sm">
                        <Dog size={16} className="text-[#2d5a27]" />
                        <span className="text-gray-600">{guest.pets}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <WebcamCheck />

              {/* Category List - grouped */}
              <div className="mt-6 space-y-6">
                {(() => {
                  // Group categories by group_name, preserving order
                  const groups: { name: string; cats: Category[] }[] = [];
                  const seen = new Set<string>();
                  for (const cat of content) {
                    const g = cat.group_name || '';
                    if (!seen.has(g)) {
                      seen.add(g);
                      groups.push({ name: g, cats: [] });
                    }
                    groups.find((gr) => gr.name === g)!.cats.push(cat);
                  }
                  let globalIndex = 0;
                  return groups.map((group) => (
                    <div key={group.name || '__none'}>
                      {group.name && (
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#2d5a27]/60 mb-2 px-1">
                          {group.name}
                        </h3>
                      )}
                      <div className="space-y-3">
                        {group.cats.map((cat) => {
                          const CatIcon = ICON_MAP[cat.icon] || Info;
                          const idx = globalIndex++;
                          return (
                            <motion.button
                              key={cat.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedCategory(cat.id)}
                              className="w-full bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 transition text-left"
                            >
                              <div className="w-12 h-12 rounded-xl bg-[#2d5a27]/10 flex items-center justify-center flex-shrink-0">
                                <CatIcon size={22} className="text-[#2d5a27]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-800">{cat.title}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {cat.cards.length} Info{cat.cards.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <ChevronRight size={20} className="text-gray-300" />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              {content.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Noch keine Inhalte verfügbar</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`cat-${selectedCategory}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              {selected && (
                <>
                  <h2
                    className="text-2xl text-[#2d5a27] mb-6"
                    style={{ fontFamily: 'FeelingPassionate, cursive' }}
                  >
                    {selected.title}
                  </h2>

                  {selected.cards.length > 1 ? (
                    <CardCarousel cards={selected.cards} />
                  ) : selected.cards.length === 1 && selected.cards[0] ? (
                    <SingleCard card={selected.cards[0]} />
                  ) : (
                    <p className="text-gray-400 text-center py-8">
                      Keine Infos in dieser Kategorie
                    </p>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ======== MAIN PAGE ========
export default function GaestePage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/guest')
      .then((res) => res.json() as Promise<{ authenticated: boolean }>)
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2d5a27]" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}
