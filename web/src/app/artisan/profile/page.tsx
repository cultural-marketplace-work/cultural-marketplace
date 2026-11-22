import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getArtisan, listArtisanUiTranslations } from '@/lib/db';
import ProfileForm from './ProfileForm';
import ProfileHeader from './ProfileHeader';

export const dynamic = 'force-dynamic';

export default async function ArtisanProfilePage() {
  const session = await getSession();

  if (!session || session.role !== 'artisan') {
    redirect('/auth/login?next=/artisan/profile');
  }

  const artisan = await getArtisan(session.id);
  const messages = await listArtisanUiTranslations(artisan?.preferred_language ?? 'en');
  const t = (sourceText: string) => messages[sourceText] ?? sourceText;

  const artisanName = artisan?.name ?? session.name;
  const businessName = artisan?.business_name || t('Your Handicrafts');

  return (
    <main className="mx-auto max-w-7xl">
      <ProfileHeader
        artisanId={session.id}
        name={artisanName}
        businessName={businessName}
        profilePicture={artisan?.profile_picture ?? null}
      />

      <section className="mt-7">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ochre-800">{t('Account details')}</p>
          <h2 className="mt-1 font-serif text-2xl font-bold text-brand-900">{t('Your artisan profile')}</h2>
          <p className="mt-1 text-sm text-stone-500">{t('Keep your contact information and cultural story up to date.')}</p>
        </div>
        <div className="mx-auto max-w-4xl">
          <ProfileForm
            initial={{
              name: artisan?.name ?? session.name,
              email: artisan?.email ?? session.email,
              business_name: artisan?.business_name ?? '',
              craft_type: artisan?.craft_type ?? '',
              phone: artisan?.phone ?? '',
              location: artisan?.location ?? '',
              bio: artisan?.bio ?? '',
              profile_picture: artisan?.profile_picture ?? null,
              preferred_language: artisan?.preferred_language ?? 'en',
            }}
          />
        </div>
      </section>
    </main>
  );
}