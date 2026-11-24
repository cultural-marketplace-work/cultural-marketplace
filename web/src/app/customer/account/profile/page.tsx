import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUser } from '@/lib/db';
import ProfileForm from './ProfileForm';
import ProfileHeader from './ProfileHeader';

export const dynamic = 'force-dynamic';

export default async function CustomerProfilePage() {
  const session = await getSession();
  if (!session || session.role !== 'customer') redirect('/auth/login?next=/customer/account/profile');

  const user = await getUser(session.id);

  return (
    <main className="min-h-screen bg-[#FCF9F4] px-4 py-7 font-sans sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <ProfileHeader
          name={user?.name || session.name}
          profilePicture={user?.profile_picture || null}
        />

        <section aria-label="Customer profile details" className="mx-auto w-full max-w-4xl">
          <ProfileForm
            initial={{
              name: user?.name || session.name,
              email: user?.email || session.email,
              phone: user?.phone || '',
              location: user?.location || '',
              bio: user?.bio || '',
              profile_picture: user?.profile_picture || null,
            }}
          />
        </section>
      </div>
    </main>
  );
}