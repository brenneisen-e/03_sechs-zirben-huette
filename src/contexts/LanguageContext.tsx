'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import it from '@/locales/it.json';
import sl from '@/locales/sl.json';
import nl from '@/locales/nl.json';

export type Language = 'de' | 'en' | 'it' | 'sl' | 'nl';

const translations = {
  de,
  en,
  it,
  sl,
  nl,
};

type TranslationType = typeof de;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationType;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('de');
  const [isMounted, setIsMounted] = useState(false);

  // Mark as mounted to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load language from localStorage only after mount
  useEffect(() => {
    if (!isMounted) return;

    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      setLanguageState(savedLanguage);
    }
  }, [isMounted]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
