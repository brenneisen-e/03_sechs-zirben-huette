'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Eye, EyeOff, LogOut, Menu } from 'lucide-react';

interface AdminMenuProps {
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  onLogout: () => void;
}

// Menü im Kopf des Admin Centers: alles, was man selten braucht, liegt hier
// statt als eigene Schaltfläche im Kopf (Demo-Modus, Website, Abmelden).
export default function AdminMenu({ isDemoMode, onToggleDemoMode, onLogout }: AdminMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item =
    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menü"
        title="Menü"
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors ${
          open ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl"
        >
          <button
            role="menuitemcheckbox"
            aria-checked={isDemoMode}
            className={item}
            onClick={() => {
              setOpen(false);
              onToggleDemoMode();
            }}
          >
            {isDemoMode ? (
              <EyeOff className="h-4 w-4 text-amber-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
            <span className="flex-1">Demo-Modus</span>
            <span
              className={`text-xs font-semibold ${isDemoMode ? 'text-amber-700' : 'text-gray-400'}`}
            >
              {isDemoMode ? 'An' : 'Aus'}
            </span>
          </button>
          <a href="/" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <ExternalLink className="h-4 w-4 text-gray-400" />
            Zur Website
          </a>
          <div className="my-1.5 border-t border-gray-100" />
          <button
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4 text-gray-400" />
            Abmelden
          </button>
        </div>
      )}
    </div>
  );
}
