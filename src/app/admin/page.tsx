'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Image as ImageIcon,
  Users,
  Euro,
  Calculator,
  Key,
  Globe,
  FileText,
  Star,
  Smartphone,
  Tag,
  Link2,
  Settings,
  SlidersHorizontal,
  Instagram,
  BadgeEuro,
  Loader2,
  TreePine,
} from 'lucide-react';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminMenu from '@/components/admin/AdminMenu';
import HutSwitch, { hutViewUrl, readHutView } from '@/components/admin/HutSwitch';
import type { HutView } from '@/lib/dashboard/hutDashboard';

// Lazy load heavy components with ssr:false (admin is client-only)
const AdminLoadingFallback = () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />;

const HutDashboard = dynamic(() => import('@/components/admin/HutDashboard'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const GuestDatabase = dynamic(() => import('@/components/admin/GuestDatabase'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const FinanceOverview = dynamic(() => import('@/components/admin/FinanceOverview'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const UtilityCostsCalculator = dynamic(() => import('@/components/admin/UtilityCostsCalculator'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const ImageManager = dynamic(
  () => import('@/components/admin/ImageManager').then((mod) => ({ default: mod.ImageManager })),
  { ssr: false, loading: AdminLoadingFallback },
);
const PasswordsPanel = dynamic(
  () =>
    import('@/components/admin/PasswordsPanel').then((mod) => ({ default: mod.PasswordsPanel })),
  { ssr: false, loading: AdminLoadingFallback },
);
const BlogEditor = dynamic(() => import('@/components/admin/BlogEditor'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const ReviewsManager = dynamic(() => import('@/components/admin/ReviewsManager'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const GuestAppEditor = dynamic(() => import('@/components/admin/GuestAppEditor'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const RentalPricesEditor = dynamic(() => import('@/components/admin/RentalPricesEditor'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const Beds24Panel = dynamic(() => import('@/components/admin/Beds24Panel'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const PriceOverview = dynamic(() => import('@/components/admin/PriceOverview'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const InstagramPanel = dynamic(() => import('@/components/admin/InstagramPanel'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const LogViewer = dynamic(() => import('@/components/admin/LogViewer'), {
  ssr: false,
  loading: AdminLoadingFallback,
});
const AdminAccessPanel = dynamic(() => import('@/components/admin/AdminAccessPanel'), {
  ssr: false,
  loading: AdminLoadingFallback,
});

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 border-3 border-gray-200 rounded-full"></div>
          <div className="absolute inset-0 border-3 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Admin Center</h2>
          <p className="text-sm text-gray-500">Daten werden geladen...</p>
        </div>
      </div>
    </div>
  );
}

type AdminTab =
  | 'platforms'
  | 'guests'
  | 'finances'
  | 'utilities'
  | 'rental-prices'
  | 'images'
  | 'passwords'
  | 'blog'
  | 'reviews'
  | 'guestapp'
  | 'beds24'
  | 'prices'
  | 'instagram'
  | 'system';

type TabIcon = React.ComponentType<{ className?: string }>;

// label = Name des Reiters, hint = wofür die Seite da ist (rechts neben den Reitern)
const TABS: { id: AdminTab; label: string; icon: TabIcon; hint: string }[] = [
  { id: 'guests', label: 'Gästedatenbank', icon: Users, hint: 'Kalender, Gäste und Buchungen' },
  { id: 'beds24', label: 'Beds24', icon: Link2, hint: 'Belegung, Preise und Buchungen in Beds24' },
  { id: 'guestapp', label: 'Gäste-App', icon: Smartphone, hint: 'Inhalte und Texte der Gäste-App' },
  { id: 'finances', label: 'Übersicht', icon: Euro, hint: 'Einnahmen, Auslastung und Bericht' },
  { id: 'utilities', label: 'Nebenkosten', icon: Calculator, hint: 'Strom, Wasser und Abrechnung' },
  { id: 'platforms', label: 'Portalpreise', icon: BadgeEuro, hint: 'Preise je Plattform' },
  {
    id: 'prices',
    label: 'Preisübersicht',
    icon: SlidersHorizontal,
    hint: 'Preise und Mindestaufenthalt beider Hütten',
  },
  { id: 'rental-prices', label: 'Mietpreise', icon: Tag, hint: 'Saisonpreise und Nebenkosten' },
  { id: 'images', label: 'Bilder', icon: ImageIcon, hint: 'Bilder der Website' },
  { id: 'blog', label: 'Blog', icon: FileText, hint: 'Beiträge schreiben und veröffentlichen' },
  { id: 'reviews', label: 'Bewertungen', icon: Star, hint: 'Echte Bewertungen der Gäste' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, hint: 'Kanal auf der Startseite' },
  { id: 'passwords', label: 'Zugang', icon: Key, hint: 'Zugangsdaten der Portale' },
  { id: 'system', label: 'System', icon: Settings, hint: 'Protokoll und Admin-Passwort' },
];

// Oben nur fünf Bereiche, darunter die Reiter des gewählten Bereichs
// (Aufbau wie im Admin Center der Natberger Hütte)
type TabGroupId = 'gaeste' | 'finanzen' | 'preise' | 'website' | 'system';

interface TabGroup {
  id: TabGroupId;
  label: string;
  icon: TabIcon;
  tabs: [AdminTab, ...AdminTab[]];
}

const FIRST_GROUP: TabGroup = {
  // Start: Gäste mit dem Kalender (Wunsch 27.10.2026)
  id: 'gaeste',
  label: 'Gäste',
  icon: Users,
  tabs: ['guests', 'beds24', 'guestapp'],
};

const TAB_GROUPS: TabGroup[] = [
  FIRST_GROUP,
  { id: 'finanzen', label: 'Finanzen', icon: Euro, tabs: ['finances', 'utilities'] },
  { id: 'preise', label: 'Preise', icon: Tag, tabs: ['platforms', 'prices', 'rental-prices'] },
  {
    id: 'website',
    label: 'Website',
    icon: Globe,
    tabs: ['images', 'blog', 'reviews', 'instagram'],
  },
  { id: 'system', label: 'System', icon: Settings, tabs: ['passwords', 'system'] },
];

function groupOf(tab: AdminTab): TabGroup {
  return TAB_GROUPS.find((g) => g.tabs.includes(tab)) ?? FIRST_GROUP;
}

function tabFromSearch(search: string): AdminTab {
  const raw = new URLSearchParams(search).get('tab');
  // „dashboard“ hieß früher die heutige Seite Portalpreise
  const tab = raw === 'dashboard' ? 'platforms' : raw;
  // Ohne bzw. mit unbekanntem Tab (z.B. beim Wechsel aus dem Admin Center der
  // Natberger Hütte) starten die Gäste mit dem Kalender statt einer leeren Seite
  return TABS.find((t) => t.id === tab)?.id ?? 'guests';
}

function getInitialTab(): AdminTab {
  if (typeof window === 'undefined') return 'guests';
  return tabFromSearch(window.location.search);
}

// „Beide Hütten“ zeigen nur die Portalpreise und die Preisübersicht
const BOTH_HUTS_TABS: AdminTab[] = ['platforms', 'prices'];

function AdminPageContent({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTabState] = useState<AdminTab>(getInitialTab);
  // Hütten-Umschalter im Kopf: nur diese Hütte oder beide
  const [hutView, setHutView] = useState<HutView>(readHutView);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  // Zuletzt geöffneter Reiter je Bereich
  const [lastTabByGroup, setLastTabByGroup] = useState<Partial<Record<TabGroupId, AdminTab>>>({});

  // Auto-migrate database on admin load (adds missing columns/tables)
  useEffect(() => {
    fetch('/api/admin/auto-migrate', { method: 'POST' }).catch(() => {});
  }, []);

  // Load demo mode state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sechszirben_demo_mode');
      if (saved === 'true') setIsDemoMode(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Sync browser back/forward with tab state
  useEffect(() => {
    const onPopState = () => {
      setActiveTabState(tabFromSearch(window.location.search));
      setHutView(readHutView());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Handy: aktiven Reiter in der seitlich scrollbaren Leiste sichtbar machen
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-mobile-tab="${activeTab}"]`);
      const bar = el?.parentElement;
      if (!el || !bar) return;
      bar.scrollLeft = el.offsetLeft - (bar.clientWidth - el.offsetWidth) / 2;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, isInitialLoading]);

  const toggleDemoMode = () => {
    const newValue = !isDemoMode;
    setIsDemoMode(newValue);
    try {
      localStorage.setItem('sechszirben_demo_mode', String(newValue));
    } catch {
      /* ignore */
    }
  };

  // Switch tabs using local state + pushState — bypasses Next.js router entirely
  // to avoid Suspense/fiber reconciliation conflicts that cause DOM errors
  const setActiveTab = useCallback((tab: AdminTab) => {
    if (tab === 'finances') {
      setFinanceRefreshKey((prev) => prev + 1);
    }
    setLastTabByGroup((prev) => ({ ...prev, [groupOf(tab).id]: tab }));
    setActiveTabState(tab);
    window.history.pushState(null, '', hutViewUrl(readHutView(), tab));
  }, []);

  const activeGroup = groupOf(activeTab);
  const openGroup = (group: TabGroup) => setActiveTab(lastTabByGroup[group.id] ?? group.tabs[0]);

  // Im Kopf steht, was zu sehen ist: Tabs ohne Zwei-Hütten-Ansicht zeigen
  // nur diese Hütte — „Beide“ bleibt für die Portalpreise gemerkt
  const headerView: HutView = BOTH_HUTS_TABS.includes(activeTab) ? hutView : 'own';

  const changeHutView = (view: HutView) => {
    setHutView(view);
    const tab = view === 'both' && !BOTH_HUTS_TABS.includes(activeTab) ? 'platforms' : activeTab;
    if (tab !== activeTab) {
      if (tab === 'finances') setFinanceRefreshKey((prev) => prev + 1);
      setActiveTabState(tab);
    }
    window.history.replaceState(null, '', hutViewUrl(view, tab));
  };

  const handleDataLoaded = () => {
    setIsInitialLoading(false);
  };

  // Full screen loader
  if (isInitialLoading) {
    return (
      <>
        <FullScreenLoader />
        <div className="hidden">
          <GuestDatabase onDataLoaded={handleDataLoaded} />
        </div>
      </>
    );
  }

  const activeInfo = TABS.find((t) => t.id === activeTab);
  const menu = (
    <AdminMenu isDemoMode={isDemoMode} onToggleDemoMode={toggleDemoMode} onLogout={onLogout} />
  );

  return (
    <div className="min-h-screen bg-gray-50 admin-panel">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-center py-1.5 text-xs font-medium z-50 relative">
          Demo-Modus aktiv — Gästedaten verfremdet, Finanzdaten gerundet
        </div>
      )}

      {/* Handy: Kopf mit Bereich und Seite */}
      <header
        className="office-bar md:hidden fixed top-0 left-0 right-0 z-40"
        style={isDemoMode ? { top: '32px' } : {}}
      >
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="office-kicker truncate">Sechszirbenhütte · {activeGroup.label}</p>
            <h1 className="office-wordmark mt-1 truncate">{activeInfo?.label}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-md bg-white empty:hidden">
              <HutSwitch tab={activeTab} view={headerView} onViewChange={changeHutView} compact />
            </div>
            {menu}
          </div>
        </div>
      </header>

      {/* Desktop: Kopf mit den fünf Bereichen */}
      <header className="office-bar hidden md:block">
        <div className="mx-auto flex h-14 max-w-[1800px] items-stretch gap-4 px-6 lg:px-8">
          <div className="flex shrink-0 items-center gap-3">
            <TreePine className="h-5 w-5 text-white/80" />
            <h1 className="office-wordmark hidden lg:block">Sechszirbenhütte</h1>
            <span className="hidden h-4 w-px bg-white/20 lg:block" />
            <span className="office-kicker hidden lg:block">Admin Center</span>
          </div>

          <nav aria-label="Bereiche" className="flex items-stretch lg:ml-6">
            {TAB_GROUPS.map((group) => (
              <button
                key={group.id}
                onClick={() => openGroup(group)}
                aria-current={activeGroup.id === group.id ? 'page' : undefined}
                className="office-nav-item"
              >
                {group.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden rounded-md bg-white xl:block xl:empty:hidden">
              <HutSwitch tab={activeTab} view={headerView} onViewChange={changeHutView} />
            </div>
            <div className="rounded-md bg-white empty:hidden xl:hidden">
              <HutSwitch tab={activeTab} view={headerView} onViewChange={changeHutView} compact />
            </div>
            {menu}
          </div>
        </div>
      </header>

      {/* Reiter des gewählten Bereichs */}
      <div className="office-tabs hidden md:block">
        <div className="mx-auto flex max-w-[1800px] items-center gap-6 px-6 lg:px-8">
          <div role="tablist" className="flex min-w-0 overflow-x-auto">
            {activeGroup.tabs.map((id) => {
              const tab = TABS.find((t) => t.id === id);
              if (!tab) return null;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id)}
                  className="office-tab"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <p className="ml-auto hidden shrink-0 text-xs text-gray-500 lg:block">
            {activeInfo?.hint}
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-14 pb-20 md:pt-0 md:pb-8">
        <div className="mx-auto px-2 md:px-6 lg:px-8 max-w-[1800px] md:py-6" key={activeTab}>
          {/* Handy: Reiter des Bereichs als Leiste zum Wischen */}
          <div
            role="tablist"
            className="md:hidden flex gap-1.5 overflow-x-auto px-2 pt-3 pb-1 mb-2"
          >
            {activeGroup.tabs.map((id) => {
              const tab = TABS.find((t) => t.id === id);
              if (!tab) return null;
              const Icon = tab.icon;
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  data-mobile-tab={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-zirbe bg-zirbe text-white'
                      : 'border-gray-200 bg-white text-gray-600 active:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'platforms' && <HutDashboard view={hutView} />}

          {activeTab === 'guests' && <GuestDatabase demoMode={isDemoMode} />}

          {activeTab === 'finances' && (
            <FinanceOverview
              key={financeRefreshKey}
              demoMode={isDemoMode}
              onNavigateToGuest={(guestId) => {
                setActiveTab('guests');
                setTimeout(() => {
                  const guestElement = document.getElementById(`guest-${guestId}`);
                  if (guestElement) {
                    guestElement.scrollIntoView({ behavior: 'smooth' });
                    guestElement.click();
                  }
                }, 100);
              }}
            />
          )}

          {activeTab === 'utilities' && <UtilityCostsCalculator demoMode={isDemoMode} />}

          {activeTab === 'rental-prices' && <RentalPricesEditor demoMode={isDemoMode} />}

          {activeTab === 'passwords' && <PasswordsPanel />}

          {activeTab === 'images' && <ImageManager />}

          {activeTab === 'blog' && <BlogEditor />}

          {activeTab === 'reviews' && <ReviewsManager />}

          {activeTab === 'guestapp' && <GuestAppEditor />}

          {activeTab === 'beds24' && <Beds24Panel />}

          {activeTab === 'prices' && <PriceOverview />}

          {activeTab === 'instagram' && <InstagramPanel />}

          {activeTab === 'system' && (
            <div className="space-y-12">
              <LogViewer />
              <div className="border-t border-gray-200 pt-8">
                <AdminAccessPanel />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Handy: die fünf Bereiche unten */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur safe-area-bottom">
        <div className="flex h-14">
          {TAB_GROUPS.map((group) => {
            const Icon = group.icon;
            const isActive = activeGroup.id === group.id;
            return (
              <button
                key={group.id}
                onClick={() => openGroup(group)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-zirbe' : 'text-gray-400 active:text-gray-600'
                }`}
              >
                {isActive && <span className="absolute top-0 h-0.5 w-10 bg-zirbe" />}
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-bold leading-tight">{group.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AdminPage() {
  // Eigener Login (Passwort) — ohne gültige Session nur die Anmeldemaske.
  // Die eigentliche Prüfung macht der Server (cloudflare-worker.js).
  const [authState, setAuthState] = useState<'checking' | 'anonymous' | 'authenticated'>(
    'checking',
  );

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((r) => r.json() as Promise<{ authenticated?: boolean }>)
      .then((data) => setAuthState(data.authenticated ? 'authenticated' : 'anonymous'))
      .catch(() => setAuthState('anonymous'));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      /* Cookie ist serverseitig ohnehin nur mit Session gültig */
    }
    setAuthState('anonymous');
  };

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (authState === 'anonymous') {
    return <AdminLogin onAuthenticated={() => setAuthState('authenticated')} />;
  }

  return <AdminPageContent onLogout={handleLogout} />;
}
