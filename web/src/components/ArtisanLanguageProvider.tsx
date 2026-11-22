'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type ArtisanLanguage = 'en' | 'ceb';
export type ArtisanMessages = Record<string, string>;

const ArtisanLanguageContext = createContext<{
  language: ArtisanLanguage;
  messages: ArtisanMessages;
}>({
  language: 'en',
  messages: {},
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
  const value = useMemo(() => ({ language, messages }), [language, messages]);
  return <ArtisanLanguageContext.Provider value={value}>{children}</ArtisanLanguageContext.Provider>;
}

export function useArtisanLanguage() {
  const { language, messages } = useContext(ArtisanLanguageContext);
  const t = (sourceText: string) => messages[sourceText] ?? sourceText;
  return { language, t };
}
