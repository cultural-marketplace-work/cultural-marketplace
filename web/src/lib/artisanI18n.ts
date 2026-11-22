import { getArtisan, listArtisanUiTranslations } from '@/lib/db';

export async function getArtisanTranslator(artisanId: number) {
  const artisan = await getArtisan(artisanId);
  const language = artisan?.preferred_language ?? 'en';
  const messages = await listArtisanUiTranslations(language);

  return {
    language,
    t: (sourceText: string) => messages[sourceText] ?? sourceText,
  };
}
