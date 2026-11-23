'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ARTISAN_CEB_TRANSLATIONS } from '@/lib/artisanTranslations';

export type ArtisanLanguage = 'en' | 'ceb';
export type ArtisanMessages = Record<string, string>;

const ArtisanLanguageContext = createContext<{
  language: ArtisanLanguage;
  messages: ArtisanMessages;
  setLanguage: (language: ArtisanLanguage) => void;
}>({
  language: 'en',
  messages: {},
  setLanguage: () => undefined,
});

export function ArtisanLanguageProvider({
  language,
  messages,
  children,
}: {
  language: ArtisanLanguage;
  messages: ArtisanMessages;
  children: ReactNode;
}) {
  const [activeLanguage, setActiveLanguage] = useState(language);
  useEffect(() => setActiveLanguage(language), [language]);
  const value = useMemo(
    () => ({ language: activeLanguage, messages, setLanguage: setActiveLanguage }),
    [activeLanguage, messages],
  );
  return <ArtisanLanguageContext.Provider value={value}>{children}</ArtisanLanguageContext.Provider>;
}

export function useArtisanLanguage() {
  const { language, messages, setLanguage } = useContext(ArtisanLanguageContext);
  const t = (sourceText: string) => language === 'ceb'
    ? messages[sourceText] ?? ARTISAN_CEB_TRANSLATIONS[sourceText] ?? sourceText
    : sourceText;
  return { language, t, setLanguage };
}
