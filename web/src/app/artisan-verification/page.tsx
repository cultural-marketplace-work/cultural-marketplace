import { redirect } from 'next/navigation';
import ArtisanRegistrationForm from '@/components/ArtisanRegistrationForm';
import { getSession } from '@/lib/auth';
import { getArtisan } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ArtisanVerificationPage() {
  const session = await getSession();
  if (!session || session.role !== 'artisan') redirect('/auth/login?next=/artisan-verification');

  const artisan = await getArtisan(session.id);
  if (!artisan) redirect('/auth/login?next=/artisan-verification');
  if (artisan.verification_status === 'approved') redirect('/artisan/dashboard');

  return (
    <ArtisanRegistrationForm
      applicant={{
        name: session.name,
        email: session.email,
        phone: artisan.phone,
        location: artisan.location,
      }}
    />
  );
}
